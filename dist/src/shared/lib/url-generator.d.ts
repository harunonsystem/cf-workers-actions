import { GitHubContext } from '../types';
/**
 * Generate worker name from pattern and PR number
 */
export declare function generateWorkerName(pattern: string, prNumber: number): string;
/**
 * Generate worker URL from worker name
 */
export declare function generateWorkerUrl(workerName: string, subdomain?: string): string;
/**
 * Extract PR number from GitHub context
 */
export declare function getPrNumber(context: GitHubContext): number;
