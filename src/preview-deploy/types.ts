export interface PreviewDeployInputs {
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  workerNamePrefix: string;
  workerNameSuffix: string;
  customWorkerName?: string;
  wranglerTomlPath: string;
  environmentName: string;
  branchPatterns: string;
  excludeBranches: string;
  buildCommand: string;
  skipBuild: boolean;
  commentEnabled: boolean;
  commentTemplate?: string;
  githubToken: string;
}

export interface BranchCheckResult {
  shouldDeploy: boolean;
  branch: string;
  reason?: string;
}

export interface DeploymentResult {
  url: string;
  deploymentId: string;
}

export interface GitHubContext {
  eventName: string;
  ref: string;
  repo: {
    owner: string;
    repo: string;
  };
  serverUrl: string;
  runId: number;
  payload: {
    pull_request?: {
      number: number;
      head: {
        ref: string;
      };
    };
  };
}
