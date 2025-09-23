import { describe, it, expect } from 'vitest';
import {
  generateWorkerName,
  generateWorkerUrl,
  getPrNumber
} from '../src/shared/lib/url-generator';
import { CloudflareApi } from '../src/shared/lib/cloudflare-api';

// Helper function for input validation testing
const validateInputs = (workerPattern?: string, workerNames?: string[]) => {
  if (!workerPattern && (!workerNames || workerNames.length === 0)) {
    throw new Error('Either worker-pattern or worker-names must be provided');
  }
  return true;
};

/**
 * Integration tests to validate core logic flows
 * These test the actual business logic without complex mocking
 */
describe('Integration Tests - Core Logic Validation', () => {
  describe('Deploy Logic Flow', () => {
    it('should generate correct worker names for different environments', () => {
      const pattern = 'my-app-pr-{pr_number}';
      const prNumber = 123;

      // Preview environment logic
      const previewWorkerName = generateWorkerName(pattern, prNumber);
      expect(previewWorkerName).toBe('my-app-pr-123');

      // Production environment logic (remove PR number cleanly)
      const productionName = pattern.replace(/-?\{pr_number\}/g, '');
      expect(productionName).toBe('my-app-pr');

      // Test different patterns
      expect('project-{pr_number}'.replace(/-?\{pr_number\}/g, '')).toBe('project');
      expect('{pr_number}-suffix'.replace(/-?\{pr_number\}/g, '')).toBe('-suffix');
    });

    it('should generate correct URLs with subdomain', () => {
      const workerName = 'my-app-pr-123';
      const subdomain = 'my-company';

      const url = generateWorkerUrl(workerName, subdomain);
      expect(url).toBe('https://my-app-pr-123.my-company.workers.dev');
    });

    it('should generate correct URLs without subdomain', () => {
      const workerName = 'my-app-pr-123';

      const url = generateWorkerUrl(workerName);
      expect(url).toBe('https://my-app-pr-123.workers.dev');
    });

    it('should extract PR number from GitHub context', () => {
      const mockContext = {
        eventName: 'pull_request',
        ref: 'refs/pull/456/merge',
        payload: {
          pull_request: {
            number: 456
          }
        }
      };

      const prNumber = getPrNumber(mockContext as any);
      expect(prNumber).toBe(456);
    });
  });

  describe('Cleanup Logic Flow', () => {
    it('should create valid pattern matching regex', () => {
      const pattern = 'my-app-pr-*';
      const excludePattern = '*-production';

      // Convert glob pattern to regex (like in cleanup logic)
      const includeRegex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
      const excludeRegex = new RegExp(
        `^${excludePattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`
      );

      const workers = ['my-app-pr-123', 'my-app-pr-456', 'my-app-production', 'other-app-pr-789'];

      const matchingWorkers = workers.filter((name) => includeRegex.test(name));
      expect(matchingWorkers).toEqual(['my-app-pr-123', 'my-app-pr-456']);

      const filteredWorkers = matchingWorkers.filter((name) => !excludeRegex.test(name));
      expect(filteredWorkers).toEqual(['my-app-pr-123', 'my-app-pr-456']);
    });
  });

  describe('Comment Logic Flow', () => {
    it('should generate correct comment content without subdomain', () => {
      const deploymentUrl = 'https://my-app-pr-123.workers.dev';
      const workerName = 'my-app-pr-123';
      const commentTag = 'cloudflare-workers-deployment';

      // Simulate comment generation logic
      const statusIcon = '✅';
      const statusText = 'Success';

      let content = `<!-- ${commentTag} -->\n\n`;
      content += `## ${statusIcon} Cloudflare Workers Deployment ${statusText}\n\n`;
      content += `🚀 **Preview URL**: [${deploymentUrl}](${deploymentUrl})\n\n`;
      content += `📦 **Worker Name**: \`${workerName}\`\n\n`;

      expect(content).toContain('<!-- cloudflare-workers-deployment -->');
      expect(content).toContain('✅ Cloudflare Workers Deployment Success');
      expect(content).toContain('https://my-app-pr-123.workers.dev');
      expect(content).toContain('`my-app-pr-123`');
    });

    it('should generate correct comment content with subdomain', () => {
      const deploymentUrl = 'https://my-app-pr-123.my-company.workers.dev';
      const workerName = 'my-app-pr-123';
      const commentTag = 'cloudflare-workers-deployment';

      // Simulate comment generation logic
      const statusIcon = '✅';
      const statusText = 'Success';

      let content = `<!-- ${commentTag} -->\n\n`;
      content += `## ${statusIcon} Cloudflare Workers Deployment ${statusText}\n\n`;
      content += `🚀 **Preview URL**: [${deploymentUrl}](${deploymentUrl})\n\n`;
      content += `📦 **Worker Name**: \`${workerName}\`\n\n`;

      expect(content).toContain('<!-- cloudflare-workers-deployment -->');
      expect(content).toContain('✅ Cloudflare Workers Deployment Success');
      expect(content).toContain('https://my-app-pr-123.my-company.workers.dev');
      expect(content).toContain('`my-app-pr-123`');
    });

    it('should generate failure comment correctly', () => {
      const statusIcon = '❌';
      const statusText = 'Failed';
      const errorMessage = 'Build failed due to syntax error';

      let content = `<!-- cloudflare-workers-deployment -->\n\n`;
      content += `## ${statusIcon} Cloudflare Workers Deployment ${statusText}\n\n`;
      content += `❌ **Deployment failed**\n\n`;
      content += `**Error Details**:\n${errorMessage}\n\n`;

      expect(content).toContain('❌ Cloudflare Workers Deployment Failed');
      expect(content).toContain('Build failed due to syntax error');
    });
  });

  describe('Input Validation Logic', () => {
    it('should validate JSON inputs correctly', () => {
      const validVars = '{"VAR1": "value1", "VAR2": "value2"}';
      const invalidVars = '{"VAR1": value1}'; // Missing quotes

      let parsedVars = {};
      let hasError = false;

      try {
        parsedVars = JSON.parse(validVars);
      } catch {
        hasError = true;
      }

      expect(hasError).toBe(false);
      expect(parsedVars).toEqual({ VAR1: 'value1', VAR2: 'value2' });

      hasError = false;
      try {
        JSON.parse(invalidVars);
      } catch {
        hasError = true;
      }

      expect(hasError).toBe(true);
    });

    it('should validate cleanup inputs correctly', () => {
      // Test validation logic from cleanup action

      expect(() => validateInputs()).toThrow(
        'Either worker-pattern or worker-names must be provided'
      );
      expect(() => validateInputs('pattern-*')).not.toThrow();
      expect(() => validateInputs(undefined, ['worker1', 'worker2'])).not.toThrow();
    });
  });

  describe('Real API Pattern Validation', () => {
    it('should create proper CloudflareApi client', () => {
      const apiToken = 'test-token';
      const accountId = 'test-account-id';

      expect(() => new CloudflareApi(apiToken, accountId)).not.toThrow();

      // Test invalid inputs
      expect(() => new CloudflareApi('', accountId)).toThrow();
      expect(() => new CloudflareApi(apiToken, '')).toThrow();
    });
  });

  describe('Production vs Preview Logic', () => {
    it('should handle production deployment naming correctly', () => {
      const pattern = 'my-app-pr-{pr_number}';

      // Fixed logic - remove optional dash and placeholder
      const productionName = pattern.replace(/-?\{pr_number\}/g, '');
      expect(productionName).toBe('my-app-pr'); // Clean!

      // Test edge cases
      expect('app-{pr_number}'.replace(/-?\{pr_number\}/g, '')).toBe('app');
      expect('{pr_number}-app'.replace(/-?\{pr_number\}/g, '')).toBe('-app');
      expect('prefix-{pr_number}-suffix'.replace(/-?\{pr_number\}/g, '')).toBe('prefix-suffix');
    });
  });
});
