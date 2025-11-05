"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkerName = generateWorkerName;
exports.generateWorkerUrl = generateWorkerUrl;
exports.getPrNumber = getPrNumber;
/**
 * Generate worker name from pattern and PR number
 */
function generateWorkerName(pattern, prNumber) {
    if (!pattern || !prNumber) {
        throw new Error('Pattern and PR number are required');
    }
    return pattern.replace('{pr_number}', prNumber.toString());
}
/**
 * Generate worker URL from worker name
 */
function generateWorkerUrl(workerName, subdomain) {
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
function getPrNumber(context) {
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
