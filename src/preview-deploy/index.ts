import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { prepareDeployment } from '../shared/lib/deployment-utils';
import { handleActionError } from '../shared/lib/error-handler';
import { getGithubToken } from '../shared/lib/github-utils';
import { error, info, warning } from '../shared/lib/logger';
import { createOrUpdatePreviewComment } from '../shared/lib/pr-comment-utils';
import { mapInputs, parseInputs } from '../shared/validation';
import { DeployPreviewInputSchema } from './schemas.js';

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
    // Map and validate inputs
    const rawInputs = mapInputs({
      'cloudflare-api-token': { required: true },
      'cloudflare-account-id': { required: true },
      'worker-name': { required: true },
      environment: { required: false, default: 'preview' },
      domain: { required: false, default: 'workers.dev' },
      'wrangler-toml-path': { required: false, default: './wrangler.toml' },
      'github-token': { required: false }
    });

    const inputs = parseInputs(DeployPreviewInputSchema, rawInputs);
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
        const token = getGithubToken(rawInputs.githubToken as string);
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
    core.setOutput('deployment-url', deploymentUrl);
    core.setOutput('deployment-name', workerName);
    core.setOutput('deployment-success', 'true');

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
if (process.env.NODE_ENV !== 'test') {
  void run();
}
