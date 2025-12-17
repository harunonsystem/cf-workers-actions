import { prepareDeployment } from '../shared/lib/deployment-utils';
import { env } from '../shared/lib/env';
import { handleActionError } from '../shared/lib/error-handler';
import { info } from '../shared/lib/logger';
import { getActionInputs, setOutputsValidated } from '../shared/validation';
import {
  PreparePreviewDeployInputConfig,
  PreparePreviewDeployInputSchema,
  PreparePreviewDeployOutputSchema
} from './schemas.js';

async function run(): Promise<void> {
  try {
    // Validate inputs
    const inputs = getActionInputs(
      PreparePreviewDeployInputSchema,
      PreparePreviewDeployInputConfig
    );
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
    setOutputsValidated(PreparePreviewDeployOutputSchema, {
      deploymentName: config.workerName,
      deploymentUrl: config.deploymentUrl
    });

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

export { run };

// Execute if not in test environment
if (!env.isTest()) {
  void run();
}
