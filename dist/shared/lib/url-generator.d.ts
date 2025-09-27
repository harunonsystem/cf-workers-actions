import { GitHubContext } from '../types';
/**
 * Sanitize a worker name to be a valid single DNS label-ish string.
 */
export declare function sanitizeWorkerName(name: string): string;
/**
 * Generate worker name from a pattern, optionally using PR number and/or branch name.
 * - pattern supports placeholders: {pr_number}, {branch}, and wildcard '*'.
 * - if prNumber is undefined the {pr_number} placeholder is removed.
 * - if branch is provided it replaces {branch} and '*' (fallback).
 */
export declare function generateWorkerName(pattern: string, prNumber?: number | null, branch?: string | null): string;
/**
 * Generate worker URL from worker name
 */
export declare function generateWorkerUrl(workerName: string, subdomain?: string): string;
/**
 * Extract PR number from GitHub context
 */
export declare function getPrNumber(context: GitHubContext): number;
