import * as github from '@actions/github';

/**
 * Get GitHub token from input or environment variable
 * @param inputToken - Optional token from action input
 * @returns GitHub token
 * @throws Error if token is not available
 */
export function getGithubToken(inputToken?: string): string {
  const token = inputToken || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN is required. Please provide it via github-token input or ensure it is available in the environment.'
    );
  }
  return token;
}

/**
 * Get branch name from GitHub context
 * For pull requests, uses GITHUB_HEAD_REF or pull_request.head.ref
 * For pushes, uses GITHUB_REF
 */
export function getBranchName(): string {
  const branchName =
    github.context.payload.pull_request?.head?.ref ||
    process.env.GITHUB_HEAD_REF ||
    github.context.ref.replace(/^refs\/heads\//, '');

  return branchName;
}

/**
 * Get sanitized branch name (safe for worker names)
 * Replaces slashes with hyphens and removes invalid characters
 */
export function getSanitizedBranchName(): string {
  const branchName = getBranchName();
  // Replace / with - and remove invalid characters
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * Get short commit SHA (7 characters)
 */
export function getCommitSha(): string {
  return github.context.sha.substring(0, 7);
}

/**
 * Get PR number from GitHub context
 * @returns PR number or undefined if not in PR context
 */
export function getPrNumber(): number | undefined {
  return github.context.payload.pull_request?.number;
}
