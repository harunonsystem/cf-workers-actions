import * as github from '@actions/github';

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
