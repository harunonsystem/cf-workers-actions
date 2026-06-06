import * as core from '@actions/core';
import { env } from './env';

/**
 * Check if debug mode is enabled (ACTIONS_STEP_DEBUG === 'true')
 */
export function isDebugEnabled(): boolean {
  return env.isDebug();
}

/**
 * Log debug information only when debug mode is enabled
 * @param message - The message to log
 */
export function debug(message: string): void {
  if (isDebugEnabled()) {
    core.info(message);
  }
}

/**
 * Always log informational messages
 * @param message - The message to log
 */
export function info(message: string): void {
  core.info(message);
}

/**
 * Always log warning messages
 * @param message - The message to log
 */
export function warning(message: string): void {
  core.warning(message);
}

/**
 * Always log error messages
 * @param message - The message to log
 */
export function error(message: string): void {
  core.error(message);
}
