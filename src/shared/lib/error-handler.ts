import * as core from '@actions/core';

/**
 * Context for action error handling
 */
export interface ActionErrorContext {
  /**
   * Title for the error summary (e.g., "Deployment Failed", "Cleanup Failed")
   */
  summaryTitle: string;

  /**
   * Optional outputs to set when error occurs
   * Key-value pairs where empty string represents no value
   */
  outputs?: Record<string, string>;

  /**
   * Optional additional context to include in error message
   */
  context?: string;
}

/**
 * Handle action errors in a consistent way across all actions
 *
 * This function:
 * 1. Logs the error message
 * 2. Sets any specified outputs
 * 3. Creates a summary for the GitHub Actions UI
 * 4. Marks the action as failed
 *
 * @param error - The error that occurred (Error object or unknown)
 * @param context - Context for handling the error
 */
export async function handleActionError(
  error: unknown,
  context: ActionErrorContext
): Promise<void> {
  // Extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log the error
  const fullMessage = context.context
    ? `${context.summaryTitle}: ${errorMessage} (Context: ${context.context})`
    : `${context.summaryTitle}: ${errorMessage}`;

  core.error(fullMessage);

  // Set outputs if specified
  if (context.outputs) {
    for (const [key, value] of Object.entries(context.outputs)) {
      core.setOutput(key, value);
    }
  }

  // Create error summary
  await core.summary
    .addHeading(`❌ ${context.summaryTitle}`)
    .addCodeBlock(errorMessage, 'text')
    .write();

  // Mark action as failed
  core.setFailed(errorMessage);
}

/**
 * Standard error outputs for deployment actions
 */
export const DEPLOY_ERROR_OUTPUTS = {
  'worker-url': '',
  'worker-name': 'unknown',
  success: 'false',
  'error-message': ''
};

/**
 * Standard error outputs for cleanup actions
 */
export const CLEANUP_ERROR_OUTPUTS = {
  'deleted-workers': '[]',
  'deleted-count': '0',
  'skipped-workers': '[]',
  'dry-run-results': '[]'
};

/**
 * Standard error outputs for comment actions
 */
export const COMMENT_ERROR_OUTPUTS = {
  'comment-id': '',
  'comment-url': ''
};