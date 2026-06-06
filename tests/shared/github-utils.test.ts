import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

// Mock @actions/github
vi.mock('@actions/github');

// Import functions to test
import {
  getBranchName,
  getCommitSha,
  getGithubToken,
  getPrNumber,
  getSanitizedBranchName
} from '../../src/shared/lib/github-utils';

describe('github-utils', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REF;
    delete process.env.GITHUB_TOKEN;

    // Reset github context mock
    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        sha: 'abc123def456',
        ref: 'refs/heads/main',
        payload: {}
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getBranchName', () => {
    test('should use pull_request.head.ref for PRs', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/pull/123/merge',
          payload: {
            pull_request: {
              head: {
                ref: 'feature/awesome-feature'
              }
            }
          }
        },
        writable: true
      });

      const branchName = getBranchName();
      expect(branchName).toBe('feature/awesome-feature');
    });

    test('should use GITHUB_HEAD_REF when available (PR)', () => {
      process.env.GITHUB_HEAD_REF = 'feature/new-ui';
      process.env.GITHUB_REF = 'refs/pull/79/merge';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/pull/79/merge',
          payload: {}
        },
        writable: true
      });

      const branchName = getBranchName();
      expect(branchName).toBe('feature/new-ui');
    });

    test('should use GITHUB_REF for direct pushes', () => {
      process.env.GITHUB_REF = 'refs/heads/develop';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/develop',
          payload: {}
        },
        writable: true
      });

      const branchName = getBranchName();
      expect(branchName).toBe('develop');
    });

    test('should strip refs/heads/ prefix from GITHUB_REF', () => {
      process.env.GITHUB_REF = 'refs/heads/feature/test';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/feature/test',
          payload: {}
        },
        writable: true
      });

      const branchName = getBranchName();
      expect(branchName).toBe('feature/test');
    });

    test('should fallback to context.ref when no env vars', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/main',
          payload: {}
        },
        writable: true
      });

      const branchName = getBranchName();
      expect(branchName).toBe('main');
    });
  });

  describe('getSanitizedBranchName', () => {
    test('should replace slashes with hyphens', () => {
      process.env.GITHUB_REF = 'refs/heads/feature/auth';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/feature/auth',
          payload: {}
        },
        writable: true
      });

      const sanitized = getSanitizedBranchName();
      expect(sanitized).toBe('feature-auth');
    });

    test('should remove invalid characters', () => {
      process.env.GITHUB_REF = 'refs/heads/fix_bug@123';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/fix_bug@123',
          payload: {}
        },
        writable: true
      });

      const sanitized = getSanitizedBranchName();
      expect(sanitized).toBe('fixbug123');
    });

    test('should preserve alphanumeric and hyphens', () => {
      process.env.GITHUB_REF = 'refs/heads/release-v1-2-3';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/release-v1-2-3',
          payload: {}
        },
        writable: true
      });

      const sanitized = getSanitizedBranchName();
      expect(sanitized).toBe('release-v1-2-3');
    });

    test('should handle multiple slashes', () => {
      process.env.GITHUB_REF = 'refs/heads/feature/ui/modal';

      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/feature/ui/modal',
          payload: {}
        },
        writable: true
      });

      const sanitized = getSanitizedBranchName();
      expect(sanitized).toBe('feature-ui-modal');
    });

    test('should handle PR refs correctly', () => {
      process.env.GITHUB_HEAD_REF = 'feature/using-prefix-and-numbers';
      process.env.GITHUB_REF = 'refs/pull/79/merge';

      const sanitized = getSanitizedBranchName();
      expect(sanitized).toBe('feature-using-prefix-and-numbers');
    });
  });

  describe('getCommitSha', () => {
    test('should return first 7 characters of SHA', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123def456789',
          ref: 'refs/heads/main',
          payload: {}
        },
        writable: true
      });

      const shortSha = getCommitSha();
      expect(shortSha).toBe('abc123d');
      expect(shortSha.length).toBe(7);
    });

    test('should handle short SHAs', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc',
          ref: 'refs/heads/main',
          payload: {}
        },
        writable: true
      });

      const shortSha = getCommitSha();
      expect(shortSha).toBe('abc');
    });

    test('should match expected format in PR comments', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'bbebc72a1b2c3d4e5f6',
          ref: 'refs/pull/79/merge',
          payload: {}
        },
        writable: true
      });

      const shortSha = getCommitSha();
      expect(shortSha).toBe('bbebc72');
    });
  });

  describe('getGithubToken', () => {
    it.each([
      ['my-input-token', undefined, 'my-input-token', 'input token when provided'],
      [undefined, 'env-token', 'env-token', 'environment token when input is undefined'],
      ['', 'env-token', 'env-token', 'environment token when input is empty string'],
      ['input-token', 'env-token', 'input-token', 'input token over environment token']
    ])('should return %s', (inputToken, envToken, expected, _description) => {
      if (envToken) process.env.GITHUB_TOKEN = envToken;
      expect(getGithubToken(inputToken)).toBe(expected);
    });

    it.each([
      [undefined, 'no token available'],
      ['', 'both input and env are empty']
    ])('should throw error when %s', (inputToken, _description) => {
      expect(() => getGithubToken(inputToken)).toThrow('GITHUB_TOKEN is required');
    });
  });

  describe('getPrNumber', () => {
    test('should return PR number from context', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/pull/42/merge',
          payload: {
            pull_request: {
              number: 42
            }
          }
        },
        writable: true
      });

      const prNumber = getPrNumber();
      expect(prNumber).toBe(42);
    });

    test('should return undefined when not in PR context', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/main',
          payload: {}
        },
        writable: true
      });

      const prNumber = getPrNumber();
      expect(prNumber).toBeUndefined();
    });

    test('should return undefined when payload is empty', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/heads/main',
          payload: {
            pull_request: undefined
          }
        },
        writable: true
      });

      const prNumber = getPrNumber();
      expect(prNumber).toBeUndefined();
    });

    test('should work with toString() for string conversion', () => {
      Object.defineProperty(github, 'context', {
        value: {
          repo: { owner: 'test-owner', repo: 'test-repo' },
          sha: 'abc123',
          ref: 'refs/pull/123/merge',
          payload: {
            pull_request: {
              number: 123
            }
          }
        },
        writable: true
      });

      const prNumber = getPrNumber()?.toString();
      expect(prNumber).toBe('123');
      expect(typeof prNumber).toBe('string');
    });
  });
});
