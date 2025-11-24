"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMENT_ERROR_OUTPUTS = exports.CLEANUP_ERROR_OUTPUTS = exports.DEPLOY_ERROR_OUTPUTS = void 0;
exports.handleActionError = handleActionError;
const core = __importStar(require("@actions/core"));
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
async function handleActionError(error, context) {
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
exports.DEPLOY_ERROR_OUTPUTS = {
    'worker-url': '',
    'worker-name': 'unknown',
    success: 'false',
    'error-message': ''
};
/**
 * Standard error outputs for cleanup actions
 */
exports.CLEANUP_ERROR_OUTPUTS = {
    'deleted-workers': '[]',
    'deleted-count': '0',
    'skipped-workers': '[]',
    'dry-run-results': '[]'
};
/**
 * Standard error outputs for comment actions
 */
exports.COMMENT_ERROR_OUTPUTS = {
    'comment-id': '',
    'comment-url': ''
};
