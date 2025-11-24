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
export declare function handleActionError(error: unknown, context: ActionErrorContext): Promise<void>;
/**
 * Standard error outputs for deployment actions
 */
export declare const DEPLOY_ERROR_OUTPUTS: {
    'worker-url': string;
    'worker-name': string;
    success: string;
    'error-message': string;
};
/**
 * Standard error outputs for cleanup actions
 */
export declare const CLEANUP_ERROR_OUTPUTS: {
    'deleted-workers': string;
    'deleted-count': string;
    'skipped-workers': string;
    'dry-run-results': string;
};
/**
 * Standard error outputs for comment actions
 */
export declare const COMMENT_ERROR_OUTPUTS: {
    'comment-id': string;
    'comment-url': string;
};
