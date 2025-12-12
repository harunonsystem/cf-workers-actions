import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock @actions/github
vi.mock('@actions/github');

// Import functions to test
import {
  getBranchName,
  getCommitSha,
  getGithubToken,
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
    test('should return input token when provided', () => {
      const token = getGithubToken('my-input-token');
      expect(token).toBe('my-input-token');
    });

    test('should return environment token when input is undefined', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const token = getGithubToken(undefined);
      expect(token).toBe('env-token');
    });

    test('should return environment token when input is empty string', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const token = getGithubToken('');
      expect(token).toBe('env-token');
    });

    test('should prefer input token over environment token', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const token = getGithubToken('input-token');
      expect(token).toBe('input-token');
    });

    test('should throw error when no token available', () => {
      expect(() => getGithubToken(undefined)).toThrow(
        'GITHUB_TOKEN is required. Please provide it via github-token input or ensure it is available in the environment.'
      );
    });

    test('should throw error when both input and env are empty', () => {
      expect(() => getGithubToken('')).toThrow('GITHUB_TOKEN is required');
    });
  });
});
