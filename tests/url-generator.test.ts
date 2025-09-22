import { describe, test, expect } from 'vitest';
import {
  generateWorkerName,
  generateWorkerUrl,
  getPrNumber
} from '../src/shared/lib/url-generator';
import { GitHubContext } from '../src/shared/types';

describe('url-generator', () => {
  describe('generateWorkerName', () => {
    test('should generate correct worker name with PR number', () => {
      const result = generateWorkerName('project-pr-{pr_number}', 123);
      expect(result).toBe('project-pr-123');
    });

    test('should handle different patterns', () => {
      const result = generateWorkerName('app-{pr_number}-preview', 456);
      expect(result).toBe('app-456-preview');
    });

    test('should throw error for missing pattern', () => {
      expect(() => generateWorkerName('', 123)).toThrow('Pattern and PR number are required');
    });

    test('should throw error for missing PR number', () => {
      expect(() => generateWorkerName('project-pr-{pr_number}', 0)).toThrow(
        'Pattern and PR number are required'
      );
    });
  });

  describe('generateWorkerUrl', () => {
    test('should generate correct URL without subdomain', () => {
      const result = generateWorkerUrl('project-pr-123');
      expect(result).toBe('https://project-pr-123.workers.dev');
    });

    test('should generate correct URL with subdomain', () => {
      const result = generateWorkerUrl('project-pr-123', 'mycompany');
      expect(result).toBe('https://project-pr-123.mycompany.workers.dev');
    });

    test('should throw error for missing worker name', () => {
      expect(() => generateWorkerUrl('')).toThrow('Worker name is required');
    });
  });

  describe('getPrNumber', () => {
    test('should extract PR number from pull_request event', () => {
      const context: GitHubContext = {
        eventName: 'pull_request',
        ref: 'refs/pull/123/merge',
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        },
        payload: {
          pull_request: {
            number: 123
          }
        }
      };

      const result = getPrNumber(context);
      expect(result).toBe(123);
    });

    test('should extract PR number from issue_comment event', () => {
      const context: GitHubContext = {
        eventName: 'issue_comment',
        ref: '',
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        },
        payload: {
          issue: {
            number: 456,
            pull_request: {}
          }
        }
      };

      const result = getPrNumber(context);
      expect(result).toBe(456);
    });

    test('should extract PR number from ref', () => {
      const context: GitHubContext = {
        eventName: 'workflow_run',
        ref: 'refs/pull/789/merge',
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        },
        payload: {}
      };

      const result = getPrNumber(context);
      expect(result).toBe(789);
    });

    test('should throw error when PR number cannot be determined', () => {
      const context: GitHubContext = {
        eventName: 'push',
        ref: 'refs/heads/main',
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        },
        payload: {}
      };

      expect(() => getPrNumber(context)).toThrow('Unable to determine PR number from context');
    });
  });
});
