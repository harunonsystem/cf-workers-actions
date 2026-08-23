import { getCommitSha, getPrNumber, getSanitizedBranchName } from './github-utils';
import { info } from './logger';
import { processTemplate } from './template-utils';
import { updateWranglerToml } from './wrangler-utils';

/**
 * Deployment configuration result (internal use only)
 */
export interface DeploymentConfig {
  workerName: string;
  deploymentUrl: string;
  prNumber: number | undefined;
  branchName: string;
  commitHash: string;
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

export function generateDeploymentUrl(workerName: string, domain: string): string {
  return `https://${workerName}.${domain}`;
}

export interface PrepareDeploymentDependencies {
  getCommitSha(): string;
  getPrNumber(): number | undefined;
  getSanitizedBranchName(): string;
  info(message: string): void;
  processTemplate: typeof processTemplate;
  updateWranglerToml: typeof updateWranglerToml;
}

const defaultPrepareDeploymentDependencies: PrepareDeploymentDependencies = {
  getCommitSha,
  getPrNumber,
  getSanitizedBranchName,
  info,
  processTemplate,
  updateWranglerToml
};

/**
 * Prepare deployment by processing template and updating wrangler.toml
 * This is shared between prepare-preview-deploy and preview-deploy actions
 */
export async function prepareDeployment(
  options: PrepareDeploymentOptions,
  dependencies: PrepareDeploymentDependencies = defaultPrepareDeploymentDependencies
): Promise<DeploymentConfig> {
  const { workerNameTemplate, environment, domain, wranglerTomlPath } = options;

  // Get variables for template processing
  const branchName = dependencies.getSanitizedBranchName();
  const prNumber = dependencies.getPrNumber();
  const commitHash = dependencies.getCommitSha();

  dependencies.info(`Branch name (sanitized): ${branchName}`);
  dependencies.info(`Commit hash: ${commitHash}`);
  if (prNumber) {
    dependencies.info(`PR number: ${prNumber}`);
  }

  // Process template
  const workerName = dependencies.processTemplate(workerNameTemplate, {
    branchName,
    commitHash
  });

  if (!workerName) {
    throw new Error('Worker name is empty after template processing');
  }

  dependencies.info(`✅ Generated worker name: ${workerName}`);

  // Generate URL
  const deploymentUrl = generateDeploymentUrl(workerName, domain);
  dependencies.info(`✅ Generated URL: ${deploymentUrl}`);

  // Update wrangler.toml
  await dependencies.updateWranglerToml(wranglerTomlPath, environment, workerName);

  return {
    workerName,
    deploymentUrl,
    prNumber,
    branchName,
    commitHash
  };
}
