import { DeploymentResult } from './types';
/**
 * Deploy to Cloudflare Workers using wrangler
 */
export declare function deployToCloudflare(apiToken: string, accountId: string, environment: string, workerName: string): Promise<DeploymentResult>;
