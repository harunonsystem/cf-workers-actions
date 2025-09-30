import { GitHubContext } from '../types';

/**
 * Sanitize a worker name to be a valid single DNS label-ish string.
 */
export function sanitizeWorkerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

/**
 * Generate worker name from a pattern, optionally using PR number and/or branch name.
 * - pattern supports placeholders: {pr_number}, {branch}, and wildcard '*'.
 * - if prNumber is undefined the {pr_number} placeholder is removed.
 * - if branch is provided it replaces {branch} and '*' (fallback).
 */
export function generateWorkerName(
  pattern: string,
  prNumber?: number | null,
  branch?: string | null
): string {
  if (!pattern) {
    throw new Error('Pattern is required');
  }

  let name = pattern;

  if (prNumber != null) {
    name = name.replace(/\{pr_number\}/g, String(prNumber));
  } else {
    // remove optional '-{pr_number}' or '{pr_number}' segments when no PR present
    name = name.replace(/-?\{pr_number\}/g, '');
  }

  if (branch) {
    const safeBranch = branch.replace(/\//g, '-');
    name = name.replace(/\{branch\}/g, safeBranch);
    if (name.includes('*')) {
      name = name.replace(/\*/g, safeBranch);
    }
  } else {
    // remove branch placeholders if branch not provided
    name = name.replace(/\{branch\}/g, '');
    name = name.replace(/\*/g, '');
  }

  return sanitizeWorkerName(name);
}

/**
 * Generate worker URL from worker name
 */
export function generateWorkerUrl(workerName: string, subdomain?: string): string {
  if (!workerName) {
    throw new Error('Worker name is required');
  }

  if (subdomain) {
    return `https://${workerName}.${subdomain}.workers.dev`;
  }

  return `https://${workerName}.workers.dev`;
}

/**
 * Extract PR number from GitHub context
 */
export function getPrNumber(context: GitHubContext): number {
  if (context.eventName === 'pull_request' && context.payload.pull_request) {
    return context.payload.pull_request.number;
  }

  if (context.eventName === 'issue_comment' && context.payload.issue?.pull_request) {
    return context.payload.issue.number;
  }

  // For workflow_run or other events, try to extract from ref
  if (context.ref && context.ref.includes('/')) {
    const match = context.ref.match(/refs\/pull\/(\d+)\//);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  throw new Error('Unable to determine PR number from context');
}
