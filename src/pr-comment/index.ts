import * as core from '@actions/core';
import * as github from '@actions/github';
import { handleActionError } from '../shared/lib/error-handler';
import { getGithubToken, getPrNumber } from '../shared/lib/github-utils';
import { createOrUpdatePreviewComment } from '../shared/lib/pr-comment-utils';
import { mapInputs, parseInputs } from '../shared/validation';
import { PrCommentInputSchema } from './schemas.js';

async function run(): Promise<void> {
  try {
    // Map and validate inputs
    const rawInputs = mapInputs({
      'deployment-url': { required: true },
      'deployment-success': { required: true },
      'deployment-name': { required: true },
      'github-token': { required: false }
    });

    const inputs = parseInputs(PrCommentInputSchema, {
      ...rawInputs,
      deploymentSuccess: rawInputs.deploymentSuccess === 'true'
    });

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

    core.info('💬 Commenting on PR...');
    core.info(`PR number: ${prNumber}`);
    core.info(`Deployment URL: ${inputs.deploymentUrl}`);
    core.info(`Deployment name: ${inputs.deploymentName}`);
    core.info(`Deployment success: ${inputs.deploymentSuccess}`);

    // Get GitHub token (input takes precedence over environment variable)
    const token = getGithubToken(rawInputs.githubToken as string);
    const octokit = github.getOctokit(token);

    // Create or update comment
    await createOrUpdatePreviewComment(
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
