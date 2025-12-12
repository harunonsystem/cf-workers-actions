import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { handleActionError } from '../shared/lib/error-handler';
import { getGithubToken, getSanitizedBranchName } from '../shared/lib/github-utils';
import { createOrUpdatePreviewComment } from '../shared/lib/pr-comment-utils';
import { processTemplate } from '../shared/lib/template-utils';
import { updateWranglerToml } from '../shared/lib/wrangler-utils';
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
  } catch (error) {
    core.error(`Deployment failed: ${error}`);
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

    core.info('🚀 Starting deploy preview...');
    core.info(`Worker name template: ${inputs.workerName}`);
    core.info(`Environment: ${inputs.environment}`);

    // Step 1: Prepare preview deployment
    const branchName = getSanitizedBranchName();
    const prNumber = github.context.payload.pull_request?.number?.toString();

    core.info(`Branch name (sanitized): ${branchName}`);
    if (prNumber) {
      core.info(`PR number: ${prNumber}`);
    }

    workerName = processTemplate(inputs.workerName, {
      prNumber,
      branchName
    });

    if (!workerName) {
      throw new Error('Worker name is empty after template processing');
    }

    core.info(`✅ Generated worker name: ${workerName}`);

    deploymentUrl = `https://${workerName}.${inputs.domain}`;
    core.info(`✅ Generated URL: ${deploymentUrl}`);

    // Step 2: Update wrangler.toml
    await updateWranglerToml(inputs.wranglerTomlPath, inputs.environment, workerName);
    core.info('✅ Updated wrangler.toml');

    // Step 3: Deploy
    deploymentSuccess = await deployWorker(
      inputs.environment,
      inputs.cloudflareApiToken,
      inputs.cloudflareAccountId
    );

    if (!deploymentSuccess) {
      throw new Error('Deployment failed');
    }

    // Step 4: Comment on PR (if pr-number provided or detected)
    const prNumberInt = prNumber ? parseInt(prNumber, 10) : undefined;
    if (prNumberInt && !Number.isNaN(prNumberInt)) {
      try {
        const token = getGithubToken(rawInputs.githubToken as string);
        const octokit = github.getOctokit(token);
        await createOrUpdatePreviewComment(
          octokit,
          prNumberInt,
          deploymentUrl,
          workerName,
          deploymentSuccess
        );
        core.info('✅ PR comment posted');
      } catch {
        core.warning('GITHUB_TOKEN not found, skipping PR comment');
      }
    }

    // Set outputs
    core.setOutput('deployment-url', deploymentUrl);
    core.setOutput('deployment-name', workerName);
    core.setOutput('deployment-success', 'true');

    core.info('✅ Deploy preview completed');
  } catch (error) {
    await handleActionError(error, {
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
