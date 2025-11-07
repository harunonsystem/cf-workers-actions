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
export interface WranglerDeployConfig {
  workerName: string;
  scriptPath?: string;
  environment?: string;
  vars?: Record<string, string>;
  secrets?: Record<string, string>;
  compatibility_date?: string;
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
export interface DeployInputs {
  environment: string;
  workerNamePattern: string;
  scriptPath: string;
  apiToken: string;
  accountId: string;
  subdomain?: string;
  vars: Record<string, string>;
  secrets: Record<string, string>;
  compatibilityDate?: string;
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
  apiToken: string;
  accountId: string;
  dryRun: boolean;
  maxAgeDays?: number;
  excludePattern?: string;
  confirmDeletion: string;
}
