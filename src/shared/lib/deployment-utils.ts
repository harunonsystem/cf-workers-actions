import { getCommitSha, getPrNumber, getSanitizedBranchName } from "./github-utils";
import { info } from "./logger";
import { processTemplate } from "./template-utils";
import { updateWranglerToml } from "./wrangler-utils";

/**
 * Deployment configuration result (internal use only)
 */
export interface DeploymentContext {
  branchName: string;
  commitHash: string;
  prNumber: number | undefined;
}

export interface DeploymentConfig extends DeploymentContext {
  workerName: string;
  deploymentUrl: string;
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
export function buildDeploymentConfig(
  workerNameTemplate: string,
  domain: string,
  context: DeploymentContext,
  processTemplateFn: typeof processTemplate = processTemplate
): Pick<DeploymentConfig, "workerName" | "deploymentUrl"> {
  const workerName = processTemplateFn(workerNameTemplate, {
    branchName: context.branchName,
    commitHash: context.commitHash
  });
  if (!workerName) {
    throw new Error("Worker name is empty after template processing");
  }
  return {
    workerName,
    deploymentUrl: generateDeploymentUrl(workerName, domain)
  };
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

  const context: DeploymentContext = {
    branchName: dependencies.getSanitizedBranchName(),
    commitHash: dependencies.getCommitSha(),
    prNumber: dependencies.getPrNumber()
  };

  dependencies.info(`Branch name (sanitized): ${context.branchName}`);
  dependencies.info(`Commit hash: ${context.commitHash}`);
  if (context.prNumber) {
    dependencies.info(`PR number: ${context.prNumber}`);
  }

  const { workerName, deploymentUrl } = buildDeploymentConfig(
    workerNameTemplate,
    domain,
    context,
    dependencies.processTemplate
  );

  dependencies.info(`✅ Generated worker name: ${workerName}`);
  dependencies.info(`✅ Generated URL: ${deploymentUrl}`);

  await dependencies.updateWranglerToml(wranglerTomlPath, environment, workerName);

  return {
    ...context,
    workerName,
    deploymentUrl
  };
}
