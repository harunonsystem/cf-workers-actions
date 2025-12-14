import * as github from '@actions/github';
import { vi } from 'vitest';

/**
 * Create a mock for core.summary with all chained methods
 */
export function createCoreSummaryMock() {
  return {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    addList: vi.fn().mockReturnThis(),
    addCodeBlock: vi.fn().mockReturnThis(),
    addRaw: vi.fn().mockReturnThis(),
    addBreak: vi.fn().mockReturnThis(),
    addQuote: vi.fn().mockReturnThis(),
    addLink: vi.fn().mockReturnThis(),
    addImage: vi.fn().mockReturnThis(),
    addSeparator: vi.fn().mockReturnThis(),
    addEOL: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockReturnThis(),
    stringify: vi.fn().mockReturnValue(''),
    isEmptyBuffer: vi.fn().mockReturnValue(true),
    emptyBuffer: vi.fn().mockReturnThis()
  };
}

/**
 * GitHub context configuration for testing
 */
export interface GitHubContextConfig {
  owner?: string;
  repo?: string;
  sha?: string;
  ref?: string;
  eventName?: string;
  payload?: {
    pull_request?: {
      number: number;
      head?: {
        ref: string;
      };
    };
  };
}

/**
 * Set GitHub context for testing
 * @param config - Configuration for the GitHub context
 */
export function setGitHubContext(config: GitHubContextConfig): void {
  const defaultConfig: Required<GitHubContextConfig> = {
    owner: 'test-owner',
    repo: 'test-repo',
    sha: 'test-sha',
    ref: 'refs/heads/main',
    eventName: 'push',
    payload: {}
  };

  const mergedConfig = { ...defaultConfig, ...config };

  Object.defineProperty(github, 'context', {
    value: {
      repo: {
        owner: mergedConfig.owner,
        repo: mergedConfig.repo
      },
      sha: mergedConfig.sha,
      ref: mergedConfig.ref,
      eventName: mergedConfig.eventName,
      payload: mergedConfig.payload
    },
    writable: true,
    configurable: true
  });
}

/**
 * Create mock Octokit instance
 */
export function createOctokitMock() {
  return {
    rest: {
      issues: {
        listComments: vi.fn().mockResolvedValue({ data: [] }),
        createComment: vi.fn().mockResolvedValue({ data: { id: 1 } }),
        updateComment: vi.fn().mockResolvedValue({ data: { id: 1 } })
      }
    }
  };
}

/**
 * Setup GitHub environment variables for PR context
 */
export function setupPrEnvironment(prNumber: number, branchName: string): void {
  process.env.GITHUB_HEAD_REF = branchName;
  process.env.GITHUB_REF = `refs/pull/${prNumber}/merge`;
}

/**
 * Setup GitHub environment variables for push context
 */
export function setupPushEnvironment(branchName: string): void {
  delete process.env.GITHUB_HEAD_REF;
  process.env.GITHUB_REF = `refs/heads/${branchName}`;
}

/**
 * Clear GitHub environment variables
 */
export function clearGitHubEnvironment(): void {
  delete process.env.GITHUB_HEAD_REF;
  delete process.env.GITHUB_REF;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_SHA;
}
