import * as core from '@actions/core';
import * as github from '@actions/github';
import { handleActionError } from '../shared/lib/error-handler';
import { mapInputs, parseInputs } from '../shared/validation';
import { getSanitizedBranchName } from '../shared/lib/github-utils';
import { processTemplate } from '../shared/lib/template-utils';
import { updateWranglerToml } from '../shared/lib/wrangler-utils';
import { PreparePreviewDeployInputSchema } from './schemas.js';

async function run(): Promise<void> {
  try {
    // Map and validate inputs
    const rawInputs = mapInputs({
      'worker-name': { required: true },
      environment: { required: true },
      domain: { required: false, default: 'workers.dev' },
      'wrangler-toml-path': { required: false, default: './wrangler.toml' }
    });

    const inputs = parseInputs(PreparePreviewDeployInputSchema, rawInputs);
    if (!inputs) {
      throw new Error('Input validation failed');
    }

    core.info('🚀 Preparing preview deployment...');
    core.info(`Worker name template: ${inputs.workerName}`);
    core.info(`Environment: ${inputs.environment}`);

    // Get variables for template processing
    const branchName = getSanitizedBranchName();

    // Auto-detect PR number
    const prNumber = github.context.payload.pull_request?.number?.toString();

    core.info(`Branch name (sanitized): ${branchName}`);
    if (prNumber) {
      core.info(`PR number: ${prNumber}`);
    }

    // Process template
    const workerName = processTemplate(inputs.workerName, {
      prNumber,
      branchName
    });

    if (!workerName) {
      throw new Error('Worker name is empty after template processing');
    }

    core.info(`✅ Generated worker name: ${workerName}`);

    // Generate URL
    const deploymentUrl = `https://${workerName}.${inputs.domain}`;
    core.info(`✅ Generated URL: ${deploymentUrl}`);

    // Update wrangler.toml
    await updateWranglerToml(inputs.wranglerTomlPath, inputs.environment, workerName);

    // Set outputs
    core.setOutput('deployment-name', workerName);
    core.setOutput('deployment-url', deploymentUrl);

    core.info('✅ Prepare preview deployment completed');
  } catch (error) {
    await handleActionError(error, {
      summaryTitle: 'Prepare Preview Deploy Failed',
      outputs: {
        'deployment-name': '',
        'deployment-url': ''
      }
    });
  }
}

// Self-invoking async function to handle top-level await
void run();
