/**
 * Template processing utilities for worker names
 */

interface TemplateVariables {
  prNumber?: string;
  branchName: string;
}

/**
 * Process template variables in worker name
 * Replaces {pr-number} and {branch-name} placeholders with actual values
 */
export function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace {pr-number} with PR number if available, otherwise fall back to branch-name
  const prIdentifier = variables.prNumber || variables.branchName;
  result = result.replace(/\{pr-number\}/g, prIdentifier);

  // Replace {branch-name} with branch name
  result = result.replace(/\{branch-name\}/g, variables.branchName);

  // Sanitize: remove invalid characters (only alphanumeric and dashes allowed)
  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  return result;
}
