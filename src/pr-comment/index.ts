import * as core from '@actions/core';
import * as github from '@actions/github';
import { env } from '../shared/lib/env';
import { handleActionError } from '../shared/lib/error-handler';
import { getGithubToken, getPrNumber } from '../shared/lib/github-utils';
import { info } from '../shared/lib/logger';
import { createOrUpdatePreviewComment } from '../shared/lib/pr-comment-utils';
import { getActionInputs } from '../shared/validation';
import { PrCommentInputConfig, PrCommentInputSchema } from './schemas.js';

async function run(): Promise<void> {
  try {
    // Validate inputs
    const inputs = getActionInputs(PrCommentInputSchema, PrCommentInputConfig, (raw) => ({
      ...raw,
      deploymentSuccess: raw.deploymentSuccess === 'true'
    }));

    if (!inputs) {
      throw new Error('Input validation failed');
    }

    // Get PR number from context
    const prNumber = getPrNumber();
    if (!prNumber) {
      throw new Error(
        'Could not get PR number from context. This action must run on pull_request events.'
      );
    }

    info('💬 Commenting on PR...');
    info(`PR number: ${prNumber}`);
    info(`Deployment URL: ${inputs.deploymentUrl}`);
    info(`Deployment name: ${inputs.deploymentName}`);
    info(`Deployment success: ${inputs.deploymentSuccess}`);

    // Get GitHub token (input takes precedence over environment variable)
    const token = getGithubToken(inputs.githubToken);
    const octokit = github.getOctokit(token);

    // Create or update comment
    await createOrUpdatePreviewComment(
      octokit,
      prNumber,
      inputs.deploymentUrl,
      inputs.deploymentName,
      inputs.deploymentSuccess
    );

    info('✅ PR comment completed');

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
  } catch (err) {
    await handleActionError(err, {
      summaryTitle: 'PR Comment Failed',
      outputs: {}
    });
  }
}

export { run };

// Execute if not in test environment
if (!env.isTest()) {
  void run();
}
