import * as fs from 'node:fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('@actions/github');
vi.mock('fs');

// Import the function to test (we need to export it or use a way to access it)
// Since the action runs as a script, we might need to refactor it to be testable
// or mock the inputs/outputs and run the script.
// For now, we will mock the environment and inputs, and verify the core.setOutput calls.

describe('preview-deploy action', () => {
  let inputs: Record<string, string> = {};
  let outputs: Record<string, string> = {};
  let failed = false;

  // Mock Octokit
  const mockCreateComment = vi.fn();
  const mockUpdateComment = vi.fn();
  const mockListComments = vi.fn().mockResolvedValue({ data: [] });

  beforeEach(() => {
    inputs = {};
    outputs = {};
    failed = false;

    // Reset mocks
    vi.clearAllMocks();
    mockCreateComment.mockReset();
    mockUpdateComment.mockReset();
    mockListComments.mockReset().mockResolvedValue({ data: [] });

    // Mock core.getInput
    vi.mocked(core.getInput).mockImplementation((name) => {
      return inputs[name] || '';
    });

    // Mock core.setOutput
    vi.mocked(core.setOutput).mockImplementation((name, value) => {
      outputs[name] = value;
    });

    // Mock core.setFailed
    vi.mocked(core.setFailed).mockImplementation((message) => {
      failed = true;
      console.error(message);
    });

    // Mock core.summary
    const mockSummary = {
      addHeading: vi.fn().mockReturnThis(),
      addCodeBlock: vi.fn().mockReturnThis(),
      write: vi.fn().mockResolvedValue(undefined)
    };
    // @ts-expect-error
    core.summary = mockSummary;

    // Mock fs
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
name = "my-app"
main = "src/index.ts"
compatibility_date = "2023-01-01"

[env.preview]
name = "my-app-preview"
    `);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.copyFileSync).mockImplementation(() => {});

    // Mock exec
    vi.mocked(exec.exec).mockResolvedValue(0);

    // Mock github context
    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        sha: 'test-sha',
        ref: 'refs/heads/test-branch',
        payload: {}
      },
      writable: true
    });

    // Mock process.env
    process.env.GITHUB_REF = 'refs/heads/test-branch';
    process.env.GITHUB_SHA = 'test-sha';
    delete process.env.GITHUB_HEAD_REF; // Clear GITHUB_HEAD_REF for clean test state

    // Mock getOctokit
    vi.mocked(github.getOctokit).mockReturnValue({
      rest: {
        issues: {
          listComments: mockListComments,
          createComment: mockCreateComment,
          updateComment: mockUpdateComment
        }
      }
    } as any);

    // Mock GITHUB_TOKEN env var
    process.env.GITHUB_TOKEN = 'fake-token';
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.GITHUB_TOKEN;
  });

  // Helper to run the action
  const runAction = async () => {
    // We need to re-import the module to trigger the run function
    // Since we are using vitest, we can use vi.importActual or just import
    // But since the module has state or side effects, we might need to isolate modules
    // For simplicity in this environment, we just import the exported run function
    const { run } = await import('../../src/preview-deploy/index');
    await run();
  };

  test('should generate correct deployment URL with subdomain and post comment', async () => {
    inputs = {
      'worker-name': 'myapp-pr-{pr-number}',
      environment: 'preview',
      domain: 'username.workers.dev',
      'pr-number': '123',
      'cloudflare-api-token': 'fake-token',
      'cloudflare-account-id': 'fake-account-id'
    };

    // Mock PR environment variables
    process.env.GITHUB_HEAD_REF = 'feature/awesome-feature';
    process.env.GITHUB_REF = 'refs/pull/123/merge';

    // Mock github context with payload
    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        sha: 'test-sha',
        ref: 'refs/pull/123/merge',
        payload: {
          pull_request: {
            number: 123,
            head: {
              ref: 'feature/awesome-feature'
            }
          }
        }
      },
      writable: true
    });

    // Run action
    await runAction();

    // Verify outputs
    expect(outputs['deployment-url']).toBe('https://myapp-pr-123.username.workers.dev');
    expect(outputs['deployment-name']).toBe('myapp-pr-123');
    expect(outputs['deployment-success']).toBe('true');
    expect(failed).toBe(false);

    // Verify PR comment
    expect(mockListComments).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123
    });
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: expect.stringContaining('https://myapp-pr-123.username.workers.dev')
      })
    );
  });

  test('should fallback to branch name if pr-number is missing (no comment posted)', async () => {
    inputs = {
      'worker-name': 'myapp-{branch-name}',
      environment: 'preview',
      domain: 'example.com',
      'cloudflare-api-token': 'fake-token',
      'cloudflare-account-id': 'fake-account-id'
    };

    // Mock direct push environment variables (not a PR)
    delete process.env.GITHUB_HEAD_REF; // Not set for direct pushes
    process.env.GITHUB_REF = 'refs/heads/feature/test';

    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        sha: 'test-sha',
        ref: 'refs/heads/feature/test',
        payload: {} // No pull_request in payload
      },
      writable: true
    });

    await runAction();

    expect(outputs['deployment-url']).toBe('https://myapp-feature-test.example.com');
    expect(outputs['deployment-name']).toBe('myapp-feature-test');
    expect(outputs['deployment-success']).toBe('true');

    // Should NOT post comment if pr-number is missing
    expect(mockCreateComment).not.toHaveBeenCalled();
  });

  test('should use branch name from GITHUB_HEAD_REF for PR with {branch-name} template', async () => {
    inputs = {
      'worker-name': 'myapp-{branch-name}',
      environment: 'preview',
      domain: 'workers.dev',
      'cloudflare-api-token': 'fake-token',
      'cloudflare-account-id': 'fake-account-id'
    };

    // Mock PR environment: GITHUB_HEAD_REF should be used instead of GITHUB_REF
    process.env.GITHUB_HEAD_REF = 'feature/new-ui';
    process.env.GITHUB_REF = 'refs/pull/79/merge'; // This should NOT be used

    Object.defineProperty(github, 'context', {
      value: {
        repo: { owner: 'test-owner', repo: 'test-repo' },
        sha: 'bbebc72',
        ref: 'refs/pull/79/merge',
        payload: {
          pull_request: {
            number: 79,
            head: {
              ref: 'feature/new-ui'
            }
          }
        }
      },
      writable: true
    });

    await runAction();

    // Should use sanitized branch name from GITHUB_HEAD_REF, not refs/pull/79/merge
    expect(outputs['deployment-url']).toBe('https://myapp-feature-new-ui.workers.dev');
    expect(outputs['deployment-name']).toBe('myapp-feature-new-ui');
    expect(outputs['deployment-success']).toBe('true');

    // Should post PR comment with correct branch name
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 79,
        body: expect.stringContaining('feature-new-ui') // Branch name in comment
      })
    );
  });
});
