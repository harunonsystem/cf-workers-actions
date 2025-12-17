import { getPrNumber, getSanitizedBranchName } from './github-utils';
import { info } from './logger';
import { processTemplate } from './template-utils';
import { updateWranglerToml } from './wrangler-utils';

/**
 * Deployment configuration result (internal use only)
 */
interface DeploymentConfig {
  workerName: string;
  deploymentUrl: string;
  prNumber: number | undefined;
  branchName: string;
}

/**
 * Options for preparing deployment
 */
export interface PrepareDeploymentOptions {
  workerNameTemplate: string;
  environment: string;
  domain: string;
  wranglerTomlPath: string;
}

/**
 * Prepare deployment by processing template and updating wrangler.toml
 * This is shared between prepare-preview-deploy and preview-deploy actions
 */
export async function prepareDeployment(
  options: PrepareDeploymentOptions
): Promise<DeploymentConfig> {
  const { workerNameTemplate, environment, domain, wranglerTomlPath } = options;

  // Get variables for template processing
  const branchName = getSanitizedBranchName();
  const prNumber = getPrNumber();

  info(`Branch name (sanitized): ${branchName}`);
  if (prNumber) {
    info(`PR number: ${prNumber}`);
  }

  // Process template
  const workerName = processTemplate(workerNameTemplate, {
    prNumber: prNumber?.toString(),
    branchName
  });

  if (!workerName) {
    throw new Error('Worker name is empty after template processing');
  }

  info(`✅ Generated worker name: ${workerName}`);

  // Generate URL
  const deploymentUrl = `https://${workerName}.${domain}`;
  info(`✅ Generated URL: ${deploymentUrl}`);

  // Update wrangler.toml
  await updateWranglerToml(wranglerTomlPath, environment, workerName);

  return {
    workerName,
    deploymentUrl,
    prNumber,
    branchName
  };
}
