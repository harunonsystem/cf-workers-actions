import * as core from '@actions/core';

/**
 * Extract error message from unknown error type
 * @param error - The error (Error object or unknown)
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Context for action error handling (internal use only)
 */
interface ActionErrorContext {
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
  const errorMessage = getErrorMessage(error);

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
 * Standard error outputs for cleanup actions
 */
export const CLEANUP_ERROR_OUTPUTS = {
  'deleted-workers': '[]',
  'deleted-count': '0',
  'skipped-workers': '[]',
  'dry-run-results': '[]'
};
