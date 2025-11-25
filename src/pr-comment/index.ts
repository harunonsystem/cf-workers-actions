import * as core from '@actions/core';
import * as github from '@actions/github';
import { handleActionError } from '../shared/lib/error-handler';
import { mapInputs, parseInputs } from '../shared/validation';
import { PrCommentInputSchema } from './schemas.js';

/**
 * Create or update PR comment with deployment status
 */
async function createOrUpdateComment(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  deploymentUrl: string,
  deploymentName: string,
  deploymentSuccess: boolean
): Promise<void> {
  const { owner, repo } = github.context.repo;
  const commitSha = github.context.sha.substring(0, 7);
  const branchName = github.context.ref.replace(/^refs\/heads\//, '');

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
    core.info(`✅ Updated existing PR comment #${existingComment.id}`);
  } else {
    // Create new comment
    const { data: newComment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
    core.info(`✅ Created new PR comment #${newComment.id}`);
  }
}

async function run(): Promise<void> {
  try {
    // Map and validate inputs
    const rawInputs = mapInputs({
      'deployment-url': { required: true },
      'deployment-success': { required: true },
      'deployment-name': { required: true }
    });

    const inputs = parseInputs(PrCommentInputSchema, {
      ...rawInputs,
      deploymentSuccess: rawInputs.deploymentSuccess === 'true'
    });

    if (!inputs) {
      throw new Error('Input validation failed');
    }

    // Get PR number from context
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error(
        'Could not get PR number from context. This action must run on pull_request events.'
      );
    }

    core.info('💬 Commenting on PR...');
    core.info(`PR number: ${prNumber}`);
    core.info(`Deployment URL: ${inputs.deploymentUrl}`);
    core.info(`Deployment name: ${inputs.deploymentName}`);
    core.info(`Deployment success: ${inputs.deploymentSuccess}`);

    // Get GitHub token
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN is required');
    }

    const octokit = github.getOctokit(token);

    // Create or update comment
    await createOrUpdateComment(
      octokit,
      prNumber,
      inputs.deploymentUrl,
      inputs.deploymentName,
      inputs.deploymentSuccess
    );

    core.info('✅ PR comment completed');

    // Set summary
    await core.summary
      .addHeading('💬 PR Comment Posted')
      .addTable([
        ['Property', 'Value'],
        ['PR Number', `#${prNumber}`],
        ['Deployment URL', inputs.deploymentUrl],
        ['Deployment Name', inputs.deploymentName],
        ['Status', inputs.deploymentSuccess ? 'Success ✅' : 'Failed ❌']
      ])
      .write();
  } catch (error) {
    await handleActionError(error, {
      summaryTitle: 'PR Comment Failed',
      outputs: {}
    });
  }
}

// Self-invoking async function to handle top-level await
void run();
