/**
 * Validation constants for Cloudflare Actions
 */
export declare const DEPLOYMENT_VALIDATION: {
    readonly ENVIRONMENTS: readonly ["preview", "production"];
    readonly STATUSES: readonly ["success", "failure", "pending"];
    readonly REQUIRED_URL_PROTOCOL: "https://";
};
export declare const CLEANUP_VALIDATION: {
    readonly CONFIRMATION_VALUES: readonly ["yes", "no"];
    readonly MIN_AGE_DAYS: 1;
};
export declare const ERROR_MESSAGES: {
    readonly ENVIRONMENT_INVALID: (env: string) => string;
    readonly DEPLOYMENT_STATUS_INVALID: (status: string) => string;
    readonly DEPLOYMENT_URL_INVALID: (url: string) => string;
    readonly DEPLOYMENT_URL_NOT_HTTPS: (url: string) => string;
    readonly MAX_AGE_DAYS_INVALID: "max-age-days must be a positive integer";
    readonly SECRETS_NOT_OBJECT: "Secrets must be a JSON object";
    readonly SECRETS_PARSE_ERROR: (error: string) => string;
};
