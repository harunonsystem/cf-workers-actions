import { BranchCheckResult, GitHubContext } from './types';

/**
 * Check if the current branch is eligible for deployment
 */
export function checkBranchEligibility(
  context: GitHubContext,
  branchPatterns: string,
  excludeBranches: string
): BranchCheckResult {
  // Get current branch
  const branch = context.payload.pull_request?.head?.ref || context.ref.replace('refs/heads/', '');

  // Parse exclude patterns
  const excludeList = excludeBranches
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  // Check if branch is excluded
  for (const pattern of excludeList) {
    if (matchPattern(branch, pattern)) {
      return {
        shouldDeploy: false,
        branch,
        reason: `Branch '${branch}' is excluded by pattern '${pattern}'`
      };
    }
  }

  // Parse include patterns
  const includeList = branchPatterns
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  // Check if branch matches any include pattern
  for (const pattern of includeList) {
    if (matchPattern(branch, pattern)) {
      return {
        shouldDeploy: true,
        branch
      };
    }
  }

  return {
    shouldDeploy: false,
    branch,
    reason: `Branch '${branch}' does not match any deployment pattern`
  };
}

/**
 * Determine worker name based on inputs and context
 */
export function determineWorkerName(
  context: GitHubContext,
  prefix: string,
  suffixStrategy: string,
  customName?: string
): string {
  let suffix: string;

  switch (suffixStrategy) {
    case 'pr-number': {
      const prNumber = context.payload.pull_request?.number;
      if (!prNumber) {
        throw new Error('PR number not available for worker name suffix');
      }
      suffix = prNumber.toString();
      break;
    }

    case 'branch-name': {
      const branch =
        context.payload.pull_request?.head?.ref || context.ref.replace('refs/heads/', '');
      // Sanitize branch name (alphanumeric and hyphens only, lowercase)
      suffix = branch.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      break;
    }

    case 'custom': {
      if (!customName) {
        throw new Error('custom-worker-name is required when suffix strategy is "custom"');
      }
      suffix = customName;
      break;
    }

    default:
      throw new Error(`Invalid worker-name-suffix: ${suffixStrategy}`);
  }

  return `${prefix}-${suffix}`;
}

/**
 * Match a string against a glob-like pattern
 * Supports: exact match, * wildcard
 */
function matchPattern(str: string, pattern: string): boolean {
  // Exact match
  if (str === pattern) {
    return true;
  }

  // Glob pattern with *
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(str);
  }

  return false;
}
