import { describe, expect, test } from 'vitest';

/**
 * Tests for template processing logic of prepare-preview-deploy action
 */

interface TemplateVariables {
  branchName: string;
  commitHash: string;
}

/**
 * Template processing function
 * - {branch-name}: Branch name
 * - {commit-hash}: Commit hash
 */
function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  result = result.replace(/\{branch-name\}/g, variables.branchName);
  result = result.replace(/\{commit-hash\}/g, variables.commitHash);

  // Sanitize: remove invalid characters (only alphanumeric and dashes allowed)
  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  return result;
}

/**
 * Sanitize branch name
 * - Replace slashes with hyphens
 * - Remove invalid characters
 */
function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * Generate deployment URL
 */
function generateDeploymentUrl(workerName: string, domain: string): string {
  return `https://${workerName}.${domain}`;
}

describe('prepare-preview-deploy', () => {
  describe('processTemplate', () => {
    describe('Branch name pattern', () => {
      test('should use branch name when available', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'develop',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-develop');
      });

      test('should use branch name value for {branch-name}', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'refs-pull-456-merge',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-refs-pull-456-merge');
      });
    });

    describe('Commit hash pattern', () => {
      test('should use commit hash when available', () => {
        const template = 'myapp-{commit-hash}';
        const variables = {
          branchName: 'feature-login',
          commitHash: 'deadbeef'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-deadbeef');
      });

      test('should handle multiple commit hash occurrences', () => {
        const template = '{commit-hash}-{commit-hash}';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('abc1234-abc1234');
      });
    });

    describe('Static worker names', () => {
      test('should handle static names without variables', () => {
        const template = 'myapp-release-v1-2-3';
        const variables = {
          branchName: 'release/v1.2.3',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-release-v1-2-3');
      });

      test('should still sanitize static names', () => {
        const template = 'my_app@prod';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myappprod');
      });
    });

    describe('Sanitization', () => {
      test('should remove invalid characters', () => {
        const template = 'app_{commit-hash}_test';
        const variables = {
          branchName: 'main',
          commitHash: '1234567'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('app1234567test');
      });

      test('should preserve hyphens', () => {
        const template = 'my-app-{commit-hash}';
        const variables = {
          branchName: 'main',
          commitHash: '789abcd'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('my-app-789abcd');
      });

      test('should remove dots', () => {
        const template = 'app.v{commit-hash}';
        const variables = {
          branchName: 'main',
          commitHash: '1'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('appv1');
      });

      test('should remove slashes from branch names', () => {
        const template = 'deploy-{branch-name}';
        const variables = {
          branchName: 'feature/auth',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('deploy-featureauth');
      });
    });

    describe('Edge cases', () => {
      test('should handle empty template', () => {
        const template = '';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('');
      });

      test('should handle mixed variables', () => {
        const template = 'app-{branch-name}-{commit-hash}';
        const variables = {
          branchName: 'hotfix-auth',
          commitHash: 'cafe123'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('app-hotfix-auth-cafe123');
      });
    });
  });

  describe('sanitizeBranchName', () => {
    test('should replace slashes with hyphens', () => {
      expect(sanitizeBranchName('feature/login')).toBe('feature-login');
    });

    test('should handle multiple slashes', () => {
      expect(sanitizeBranchName('feature/ui/modal')).toBe('feature-ui-modal');
    });

    test('should remove invalid characters', () => {
      expect(sanitizeBranchName('fix_bug@123')).toBe('fixbug123');
    });

    test('should preserve alphanumeric and hyphens', () => {
      expect(sanitizeBranchName('release-v1-2-3')).toBe('release-v1-2-3');
    });

    test('should handle refs/heads/ prefix', () => {
      const ref = 'refs/heads/feature/auth';
      const branchName = ref.replace(/^refs\/heads\//, '');
      expect(sanitizeBranchName(branchName)).toBe('feature-auth');
    });
  });

  describe('generateDeploymentUrl', () => {
    test('should generate URL with workers.dev domain', () => {
      const url = generateDeploymentUrl('myapp-renovate-patch', 'workers.dev');
      expect(url).toBe('https://myapp-renovate-patch.workers.dev');
    });

    test('should generate URL with custom domain', () => {
      const url = generateDeploymentUrl('myapp-abc1234', 'preview.example.com');
      expect(url).toBe('https://myapp-abc1234.preview.example.com');
    });

    test('should generate URL with subdomain', () => {
      const url = generateDeploymentUrl('api', 'staging.mycompany.workers.dev');
      expect(url).toBe('https://api.staging.mycompany.workers.dev');
    });

    test('generated URL should be valid', () => {
      const url = generateDeploymentUrl('test-app', 'workers.dev');
      expect(() => new URL(url)).not.toThrow();
    });

    test('should handle complex worker names', () => {
      const url = generateDeploymentUrl('my-awesome-app-feature-login', 'custom.dev');
      expect(url).toBe('https://my-awesome-app-feature-login.custom.dev');
    });
  });

  describe('Integration scenarios', () => {
    test('Branch-based preview with custom domain', () => {
      const template = 'myapp-{branch-name}';
      const variables = {
        branchName: 'feature-test',
        commitHash: 'abc1234'
      };
      const domain = 'preview.example.com';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-feature-test');
      expect(url).toBe('https://myapp-feature-test.preview.example.com');
    });

    test('Branch-based deployment with workers.dev', () => {
      const template = 'myapp-{branch-name}';
      const variables = {
        branchName: sanitizeBranchName('feature/awesome-ui'),
        commitHash: 'abc1234'
      };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-feature-awesome-ui');
      expect(url).toBe('https://myapp-feature-awesome-ui.workers.dev');
    });

    test('Commit hash deployment with workers.dev', () => {
      const template = 'myapp-{commit-hash}';
      const variables = {
        branchName: 'hotfix/critical-bug',
        commitHash: 'deadbeef'
      };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-deadbeef');
      expect(url).toBe('https://myapp-deadbeef.workers.dev');
    });

    test('Release deployment with version', () => {
      const template = 'myapp-release-v1-2-3';
      const variables = {
        branchName: 'release/v1.2.3',
        commitHash: 'abc1234'
      };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-release-v1-2-3');
      expect(url).toBe('https://myapp-release-v1-2-3.workers.dev');
    });
  });
});
