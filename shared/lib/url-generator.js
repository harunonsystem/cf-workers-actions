// import core from '@actions/core'; // Currently not used but may be needed for logging

/**
 * Generate worker name from pattern and PR number
 * @param {string} pattern - Worker name pattern (e.g., "project-pr-{pr_number}")
 * @param {number} prNumber - Pull request number
 * @returns {string} Generated worker name
 */
function generateWorkerName(pattern, prNumber) {
  if (!pattern || !prNumber) {
    throw new Error('Pattern and PR number are required');
  }

  return pattern.replace('{pr_number}', prNumber.toString());
}

/**
 * Generate worker URL from worker name
 * @param {string} workerName - Worker name
 * @param {string} subdomain - Optional custom subdomain
 * @returns {string} Worker URL
 */
function generateWorkerUrl(workerName, subdomain = null) {
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
 * @param {object} context - GitHub context object
 * @returns {number} PR number
 */
function getPrNumber(context) {
  if (context.eventName === 'pull_request') {
    return context.payload.pull_request.number;
  }

  if (context.eventName === 'issue_comment' && context.payload.issue.pull_request) {
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

export { generateWorkerName, generateWorkerUrl, getPrNumber };
