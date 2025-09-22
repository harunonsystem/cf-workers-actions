import { GitHubContext } from '../types';

/**
 * Generate worker name from pattern and PR number
 */
export function generateWorkerName(pattern: string, prNumber: number): string {
  if (!pattern || !prNumber) {
    throw new Error('Pattern and PR number are required');
  }

  return pattern.replace('{pr_number}', prNumber.toString());
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
