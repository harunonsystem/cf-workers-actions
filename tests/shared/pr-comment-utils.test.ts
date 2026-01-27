import * as github from '@actions/github';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('@actions/github');
vi.mock('@actions/core');
vi.mock('../../src/shared/lib/github-utils', () => ({
  getBranchName: vi.fn(() => 'feature-test'),
  getCommitSha: vi.fn(() => 'abc123d')
}));

import { getBranchName, getCommitSha } from '../../src/shared/lib/github-utils';
import { createOrUpdatePreviewComment } from '../../src/shared/lib/pr-comment-utils';

describe('pr-comment-utils', () => {
  let mockOctokit: any;
  let mockListComments: any;
  let mockCreateComment: any;
  let mockUpdateComment: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Octokit methods
    mockListComments = vi.fn();
    mockCreateComment = vi.fn();
    mockUpdateComment = vi.fn();

    mockOctokit = {
      rest: {
        issues: {
          listComments: mockListComments,
          createComment: mockCreateComment,
          updateComment: mockUpdateComment
        }
      }
    };

    // Mock github context
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

    // Reset mocked functions
    vi.mocked(getBranchName).mockReturnValue('feature-test');
    vi.mocked(getCommitSha).mockReturnValue('abc123d');
  });

  describe('createOrUpdatePreviewComment', () => {
    test('should create new comment when no existing comment found', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test-worker.workers.dev',
        'test-worker',
        true
      );

      expect(mockListComments).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42
      });

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 42,
        body: expect.stringContaining('🚀 Preview Deployment')
      });

      expect(mockUpdateComment).not.toHaveBeenCalled();
    });

    test('should update existing comment when found', async () => {
      const existingComment = {
        id: 456,
        user: { login: 'github-actions[bot]' },
        body: '## 🚀 Preview Deployment\nOld content'
      };

      mockListComments.mockResolvedValue({ data: [existingComment] });
      mockUpdateComment.mockResolvedValue({ data: existingComment });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test-worker.workers.dev',
        'test-worker',
        true
      );

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 456,
        body: expect.stringContaining('🚀 Preview Deployment')
      });

      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    test('should include deployment URL in success message', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://myapp-pr-79.workers.dev',
        'myapp-pr-79',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('https://myapp-pr-79.workers.dev');
      expect(createCall.body).toContain('[https://myapp-pr-79.workers.dev]');
    });

    test('should include worker name in comment', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker-name',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('`test-worker-name`');
    });

    test('should include commit SHA in comment', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      vi.mocked(getCommitSha).mockReturnValue('bbebc72');

      await createOrUpdatePreviewComment(
        mockOctokit,
        79,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('bbebc72');
      expect(createCall.body).toContain('**Commit:**');
    });

    test('should include branch name in comment', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      vi.mocked(getBranchName).mockReturnValue('feature-new-ui');

      await createOrUpdatePreviewComment(
        mockOctokit,
        79,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('`feature-new-ui`');
      expect(createCall.body).toContain('**Branch:**');
    });

    test('should show success status with checkmark', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('✅ Success');
    });

    test('should show failure status with cross mark', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        false
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('❌ Failed');
    });

    test('should include link to logs on failure', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        false
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('https://github.com/test-owner/test-repo/actions');
      expect(createCall.body).toContain('Deploy failed - check logs');
    });

    test('should include success message for automatic updates', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('automatically updated when you push new commits');
    });

    test('should include check logs message on failure', async () => {
      mockListComments.mockResolvedValue({ data: [] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        false
      );

      const createCall = mockCreateComment.mock.calls[0][0];
      expect(createCall.body).toContain('check the workflow logs');
    });

    test('should ignore comments from other bots', async () => {
      const otherBotComment = {
        id: 999,
        user: { login: 'other-bot[bot]' },
        body: '## 🚀 Preview Deployment\nOther bot content'
      };

      mockListComments.mockResolvedValue({ data: [otherBotComment] });
      mockCreateComment.mockResolvedValue({ data: { id: 123 } });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      // Should create new comment, not update the other bot's comment
      expect(mockCreateComment).toHaveBeenCalled();
      expect(mockUpdateComment).not.toHaveBeenCalled();
    });

    test('should handle multiple existing comments and update only github-actions bot comment', async () => {
      const comments = [
        {
          id: 1,
          user: { login: 'user1' },
          body: 'Some user comment'
        },
        {
          id: 2,
          user: { login: 'github-actions[bot]' },
          body: '## 🚀 Preview Deployment\nOld preview'
        },
        {
          id: 3,
          user: { login: 'user2' },
          body: 'Another comment'
        }
      ];

      mockListComments.mockResolvedValue({ data: comments });
      mockUpdateComment.mockResolvedValue({ data: comments[1] });

      await createOrUpdatePreviewComment(
        mockOctokit,
        42,
        'https://test.workers.dev',
        'test-worker',
        true
      );

      expect(mockUpdateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 2,
        body: expect.stringContaining('🚀 Preview Deployment')
      });
    });
  });
});
