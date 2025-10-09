// GitHub Context Types
export interface GitHubContext {
  eventName: string;
  ref: string;
  repo: {
    owner: string;
    repo: string;
  };
  payload: {
    pull_request?: {
      number: number;
    };
    issue?: {
      number: number;
      pull_request?: {};
    };
  };
}

// Cloudflare API Types
export interface CloudflareApiResponse<T = any> {
  success: boolean;
  result?: T;
  errors?: Array<{
    code: number;
    message: string;
  }>;
}

export interface CloudflareWorker {
  id: string;
  created_on: string;
  modified_on: string;
  usage_model: string;
  environment: string;
}

// Wrangler Types
export interface WranglerDeployConfig {
  workerName: string;
  environment?: string;
  secrets?: Record<string, string>;
}

export interface WranglerExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface WranglerDeployResult {
  success: boolean;
  workerName: string;
  url?: string;
  output: string;
  error?: string;
}

// Action Input Types
export interface DeployInputs {
  environment: string;
  workerName?: string;
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  secrets: Record<string, string>;
}

export interface CommentInputs {
  deploymentUrl: string;
  deploymentStatus: string;
  workerName?: string;
  githubToken: string;
  customMessage?: string;
  commentTemplate?: string;
  updateExisting: boolean;
  commentTag: string;
}

export interface CleanupInputs {
  workerPattern?: string;
  workerNames?: string[];
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  dryRun: boolean;
  exclude?: string;
}
