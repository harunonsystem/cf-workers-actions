"use strict";
/**
 * Validation constants for Cloudflare Actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.CLEANUP_VALIDATION = exports.DEPLOYMENT_VALIDATION = void 0;
// Deployment validation
exports.DEPLOYMENT_VALIDATION = {
    // Valid environments
    ENVIRONMENTS: ['preview', 'production'],
    // Valid deployment statuses
    STATUSES: ['success', 'failure', 'pending'],
    // URL validation
    REQUIRED_URL_PROTOCOL: 'https://'
};
// Cleanup validation
exports.CLEANUP_VALIDATION = {
    // Valid confirmation values
    CONFIRMATION_VALUES: ['yes', 'no'],
    // Age validation
    MIN_AGE_DAYS: 1
};
// Error messages
exports.ERROR_MESSAGES = {
    ENVIRONMENT_INVALID: (env) => `Invalid environment: ${env}. Must be 'preview' or 'production'.`,
    DEPLOYMENT_STATUS_INVALID: (status) => `Invalid deployment status: ${status}. Must be 'success', 'failure', or 'pending'.`,
    DEPLOYMENT_URL_INVALID: (url) => `Invalid deployment URL: ${url}. Must be a valid HTTPS URL.`,
    DEPLOYMENT_URL_NOT_HTTPS: (url) => `Deployment URL must use HTTPS: ${url}`,
    MAX_AGE_DAYS_INVALID: 'max-age-days must be a positive integer',
    SECRETS_NOT_OBJECT: 'Secrets must be a JSON object',
    SECRETS_PARSE_ERROR: (error) => `Failed to parse secrets JSON: ${error}`
};
