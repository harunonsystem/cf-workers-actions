import * as github from '@actions/github';
import { getBranchName, getCommitSha } from './github-utils';

/**
 * Create or update PR comment with deployment status
 */
export async function createOrUpdatePreviewComment(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  deploymentUrl: string,
  deploymentName: string,
  deploymentSuccess: boolean
): Promise<void> {
  const { owner, repo } = github.context.repo;
  const commitSha = getCommitSha();
  const branchName = getBranchName();

  const statusIcon = deploymentSuccess ? '✅' : '❌';
  const statusText = deploymentSuccess ? 'Success' : 'Failed';

  const body = `## 🚀 Preview Deployment

**Preview URL:** ${deploymentSuccess ? `[${deploymentUrl}](${deploymentUrl})` : `[Deploy failed - check logs](https://github.com/${owner}/${repo}/actions)`}

**Build Status:** ${statusIcon} ${statusText}
**Worker Name:** \`${deploymentName}\`
**Commit:** ${commitSha}
**Branch:** \`${branchName}\`

${deploymentSuccess ? 'This preview will be automatically updated when you push new commits to this PR.' : 'Please check the workflow logs for details.'}`;

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });

  const existingComment = comments.find(
    (comment) =>
      comment.user?.login === 'github-actions[bot]' &&
      comment.body?.includes('🚀 Preview Deployment')
  );

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body
    });
  } else {
    // Create new comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
  }
}
