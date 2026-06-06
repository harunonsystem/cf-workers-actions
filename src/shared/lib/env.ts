/**
 * Environment variable access utilities
 * Centralizes all environment variable access for type safety and testability
 */

/**
 * GitHub Actions environment variables
 */
export const env = {
  /**
   * Check if running in test environment
   */
  isTest: () => process.env.NODE_ENV === 'test',

  /**
   * Check if debug mode is enabled (ACTIONS_STEP_DEBUG)
   */
  isDebug: () => process.env.ACTIONS_STEP_DEBUG === 'true',

  /**
   * Get GitHub token from environment
   */
  githubToken: () => process.env.GITHUB_TOKEN,

  /**
   * Get the head ref (branch name) for pull requests
   * Only set during pull_request events
   */
  githubHeadRef: () => process.env.GITHUB_HEAD_REF,

  /**
   * Get the full ref (e.g., refs/heads/main or refs/pull/123/merge)
   */
  githubRef: () => process.env.GITHUB_REF
} as const;
