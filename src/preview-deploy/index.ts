import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { prepareDeployment } from '../shared/lib/deployment-utils';
import { env } from '../shared/lib/env';
import { handleActionError } from '../shared/lib/error-handler';
import { getGithubToken } from '../shared/lib/github-utils';
import { error, info, warning } from '../shared/lib/logger';
import { createOrUpdatePreviewComment } from '../shared/lib/pr-comment-utils';
import { getActionInputs, setOutputsValidated } from '../shared/validation';
import {
  DeployPreviewInputConfig,
  DeployPreviewInputSchema,
  DeployPreviewOutputSchema
} from './schemas.js';

/**
 * Deploy worker using wrangler
 */
async function deployWorker(
  environment: string,
  apiToken: string,
  accountId: string
): Promise<boolean> {
  try {
    const envVars = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId
    };

    await exec.exec('npx', ['wrangler', 'deploy', '-e', environment], {
      env: envVars
    });
    return true;
  } catch (err) {
    error(`Deployment failed: ${err}`);
    return false;
  }
}

async function run(): Promise<void> {
  // Variables to hold outputs for error handling
  let workerName = '';
  let deploymentUrl = '';
  let deploymentSuccess = false;

  try {
    // Get and validate inputs
    const inputs = getActionInputs(DeployPreviewInputSchema, DeployPreviewInputConfig);
    if (!inputs) {
      throw new Error('Input validation failed');
    }

    info('🚀 Starting deploy preview...');
    info(`Worker name template: ${inputs.workerName}`);
    info(`Environment: ${inputs.environment}`);

    // Step 1: Prepare preview deployment (shared logic)
    const config = await prepareDeployment({
      workerNameTemplate: inputs.workerName,
      environment: inputs.environment,
      domain: inputs.domain,
      wranglerTomlPath: inputs.wranglerTomlPath
    });

    workerName = config.workerName;
    deploymentUrl = config.deploymentUrl;
    info('✅ Updated wrangler.toml');

    // Step 2: Deploy
    deploymentSuccess = await deployWorker(
      inputs.environment,
      inputs.cloudflareApiToken,
      inputs.cloudflareAccountId
    );

    if (!deploymentSuccess) {
      throw new Error('Deployment failed');
    }

    // Step 3: Comment on PR (if pr-number provided or detected)
    if (config.prNumber) {
      try {
        const token = getGithubToken(core.getInput('github-token'));
        const octokit = github.getOctokit(token);
        await createOrUpdatePreviewComment(
          octokit,
          config.prNumber,
          deploymentUrl,
          workerName,
          deploymentSuccess
        );
        info('✅ PR comment posted');
      } catch {
        warning('GITHUB_TOKEN not found, skipping PR comment');
      }
    }

    // Set outputs
    setOutputsValidated(DeployPreviewOutputSchema, {
      deploymentUrl,
      deploymentName: workerName,
      deploymentSuccess: 'true'
    });

    info('✅ Deploy preview completed');
  } catch (err) {
    await handleActionError(err, {
      summaryTitle: 'Deploy Preview Failed',
      outputs: {
        'deployment-url': deploymentUrl,
        'deployment-name': workerName,
        'deployment-success': 'false'
      }
    });
  }
}

export { run };

// Execute if not in test environment
if (!env.isTest()) {
  void run();
}
