import * as exec from "@actions/exec";
import {
  type DeploymentConfig,
  type PrepareDeploymentOptions,
  prepareDeployment
} from "./deployment-utils";
import { error } from "./logger";

export interface PreviewDeploymentOptions extends PrepareDeploymentOptions {
  cloudflareAccountId: string;
  cloudflareApiToken: string;
}

export interface PreviewDeploymentResult extends DeploymentConfig {
  deploymentSuccess: true;
}

export interface PreviewDeploymentDependencies {
  deployWorker(
    environment: string,
    apiToken: string,
    accountId: string,
    wranglerTomlPath: string
  ): Promise<boolean>;
  onPrepared?(config: DeploymentConfig): void;
  postComment?(config: DeploymentConfig): Promise<void>;
  prepareDeployment(options: PrepareDeploymentOptions): Promise<DeploymentConfig>;
}

async function deployWorker(
  environment: string,
  apiToken: string,
  accountId: string,
  wranglerTomlPath: string
): Promise<boolean> {
  try {
    const envVars = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId
    };

    await exec.exec(
      "npx",
      ["wrangler", "deploy", "-e", environment, "--config", wranglerTomlPath],
      { env: envVars }
    );
    return true;
  } catch (err) {
    error(`Deployment failed: ${err}`);
    return false;
  }
}

const defaultDependencies: PreviewDeploymentDependencies = {
  deployWorker,
  prepareDeployment
};

export async function executePreviewDeployment(
  options: PreviewDeploymentOptions,
  dependencies: Partial<PreviewDeploymentDependencies> = {}
): Promise<PreviewDeploymentResult> {
  const resolvedDependencies: PreviewDeploymentDependencies = {
    ...defaultDependencies,
    ...dependencies
  };

  const config = await resolvedDependencies.prepareDeployment({
    workerNameTemplate: options.workerNameTemplate,
    environment: options.environment,
    domain: options.domain,
    wranglerTomlPath: options.wranglerTomlPath
  });
  resolvedDependencies.onPrepared?.(config);

  const deploymentSuccess = await resolvedDependencies.deployWorker(
    options.environment,
    options.cloudflareApiToken,
    options.cloudflareAccountId,
    options.wranglerTomlPath
  );

  if (!deploymentSuccess) {
    throw new Error("Deployment failed");
  }

  if (config.prNumber && resolvedDependencies.postComment) {
    await resolvedDependencies.postComment(config);
  }

  return {
    ...config,
    deploymentSuccess: true
  };
}
