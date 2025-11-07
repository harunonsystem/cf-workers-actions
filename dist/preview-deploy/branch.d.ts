import { BranchCheckResult, GitHubContext } from './types';
/**
 * Check if the current branch is eligible for deployment
 */
export declare function checkBranchEligibility(context: GitHubContext, branchPatterns: string, excludeBranches: string): BranchCheckResult;
/**
 * Determine worker name based on inputs and context
 */
export declare function determineWorkerName(context: GitHubContext, prefix: string, suffixStrategy: string, customName?: string): string;
