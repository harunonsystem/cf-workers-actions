/**
 * Template processing utilities for worker names
 */

/** Cloudflare preview worker script name limit */
export const MAX_WORKER_NAME_LENGTH = 54;

interface TemplateVariables {
  branchName: string;
  commitHash: string;
}

/**
 * Process template variables in worker name
 * Replaces {branch-name} and {commit-hash} placeholders with actual values
 */
export function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace {branch-name} with branch name
  result = result.replace(/\{branch-name\}/g, variables.branchName);

  // Replace {commit-hash} with commit hash
  result = result.replace(/\{commit-hash\}/g, variables.commitHash);

  // Sanitize: remove invalid characters (only alphanumeric and dashes allowed)
  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  // Truncate to Cloudflare preview worker name limit
  if (result.length > MAX_WORKER_NAME_LENGTH) {
    result = result.slice(0, MAX_WORKER_NAME_LENGTH);
  }

  return result;
}
