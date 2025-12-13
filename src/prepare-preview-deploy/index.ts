import * as core from '@actions/core';
import { prepareDeployment } from '../shared/lib/deployment-utils';
import { handleActionError } from '../shared/lib/error-handler';
import { info } from '../shared/lib/logger';
import { mapInputs, parseInputs } from '../shared/validation';
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

    info('🚀 Preparing preview deployment...');
    info(`Worker name template: ${inputs.workerName}`);
    info(`Environment: ${inputs.environment}`);

    // Prepare deployment (shared logic)
    const config = await prepareDeployment({
      workerNameTemplate: inputs.workerName,
      environment: inputs.environment,
      domain: inputs.domain,
      wranglerTomlPath: inputs.wranglerTomlPath
    });

    // Set outputs
    core.setOutput('deployment-name', config.workerName);
    core.setOutput('deployment-url', config.deploymentUrl);

    info('✅ Prepare preview deployment completed');
  } catch (err) {
    await handleActionError(err, {
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
