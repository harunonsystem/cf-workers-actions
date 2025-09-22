import * as core from '@actions/core';
import * as github from '@actions/github';
import { generateWorkerName, generateWorkerUrl, getPrNumber } from '../shared/lib/url-generator';
import { WranglerClient } from '../shared/lib/wrangler';
import { DeployInputs } from '../shared/types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: DeployInputs = {
      environment: core.getInput('environment', { required: true }),
      workerNamePattern: core.getInput('worker-name-pattern') || 'project-pr-{pr_number}',
      scriptPath: core.getInput('script-path') || 'index.js',
      apiToken: core.getInput('api-token', { required: true }),
      accountId: core.getInput('account-id', { required: true }),
      subdomain: core.getInput('subdomain') || undefined,
      vars: {},
      secrets: {},
      compatibilityDate: core.getInput('compatibility-date') || undefined
    };

    // Parse JSON inputs
    const varsInput = core.getInput('vars') || '{}';
    const secretsInput = core.getInput('secrets') || '{}';

    try {
      inputs.vars = JSON.parse(varsInput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Failed to parse vars JSON: ${errorMessage}`);
    }

    try {
      inputs.secrets = JSON.parse(secretsInput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Failed to parse secrets JSON: ${errorMessage}`);
    }

    // Generate worker name
    let workerName: string;
    if (inputs.environment === 'production') {
      // For production, use a simple name without PR number
      workerName = inputs.workerNamePattern.replace('-{pr_number}', '').replace('{pr_number}', '');
    } else {
      // For preview, generate from PR number
      const prNumber = getPrNumber(github.context);
      workerName = generateWorkerName(inputs.workerNamePattern, prNumber);
    }

    core.info(`Deploying worker: ${workerName} (environment: ${inputs.environment})`);

    // Initialize Wrangler client
    const wrangler = new WranglerClient(inputs.apiToken, inputs.accountId);

    // Check if wrangler is available
    const wranglerAvailable = await wrangler.checkWranglerAvailable();
    if (!wranglerAvailable) {
      throw new Error('Wrangler CLI is not available. Please install it first.');
    }

    // Deploy configuration
    const deployConfig = {
      workerName,
      scriptPath: inputs.scriptPath,
      environment: inputs.environment,
      vars: inputs.vars,
      secrets: inputs.secrets,
      compatibility_date: inputs.compatibilityDate
    };

    // Deploy worker
    const deployResult = await wrangler.deployWorker(deployConfig);

    if (!deployResult.success) {
      throw new Error(`Deployment failed: ${deployResult.error || 'Unknown error'}`);
    }

    // Generate URL if not returned by wrangler
    let deploymentUrl = deployResult.url;
    if (!deploymentUrl) {
      deploymentUrl = generateWorkerUrl(workerName, inputs.subdomain);
    }

    // Generate unique deployment ID
    const deploymentId = `${workerName}-${Date.now()}`;

    // Set outputs
    core.setOutput('url', deploymentUrl);
    core.setOutput('worker-name', workerName);
    core.setOutput('success', 'true');
    core.setOutput('deployment-id', deploymentId);

    // Set summary
    await core.summary
      .addHeading('🚀 Cloudflare Workers Deployment')
      .addTable([
        ['Property', 'Value'],
        ['Worker Name', workerName],
        ['Environment', inputs.environment],
        ['URL', `[${deploymentUrl}](${deploymentUrl})`],
        ['Deployment ID', deploymentId],
        ['Status', '✅ Success']
      ])
      .write();

    core.info(`✅ Successfully deployed worker: ${workerName}`);
    core.info(`🔗 Deployment URL: ${deploymentUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.error(`❌ Deployment failed: ${errorMessage}`);

    // Set failure outputs
    core.setOutput('success', 'false');
    core.setOutput('url', '');
    core.setOutput('worker-name', '');
    core.setOutput('deployment-id', '');

    // Set failure summary
    await core.summary
      .addHeading('❌ Cloudflare Workers Deployment Failed')
      .addCodeBlock(errorMessage, 'text')
      .write();

    core.setFailed(errorMessage);
  }
}

// Self-invoking async function to handle top-level await
void run();
