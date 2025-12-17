import * as core from '@actions/core';
import type { z } from 'zod';

// ================================
// Type-level Utilities for Schema/Config Consistency
// ================================

/**
 * Convert dash-case string literal to camelCase at type level
 * e.g., 'worker-name' -> 'workerName'
 */
type DashToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<DashToCamel<Tail>>}`
  : S;

/**
 * Convert InputConfig keys (dash-case) to camelCase keys
 */
type ConfigKeysToCamel<T extends Record<string, unknown>> = {
  [K in keyof T as K extends string ? DashToCamel<K> : never]: unknown;
};

/**
 * Type-safe InputConfig that enforces key consistency with a Zod schema.
 * Compile error if InputConfig keys don't match Schema keys after camelCase conversion.
 *
 * @example
 * ```typescript
 * const MyInputSchema = z.object({
 *   workerName: z.string(),
 *   apiToken: z.string()
 * });
 *
 * // OK - keys match after conversion
 * const MyInputConfig: TypedInputConfig<typeof MyInputSchema> = {
 *   'worker-name': { required: true },
 *   'api-token': { required: true }
 * };
 *
 * // ERROR - missing 'api-token'
 * const BadConfig: TypedInputConfig<typeof MyInputSchema> = {
 *   'worker-name': { required: true }
 * };
 * ```
 */
export type TypedInputConfig<TSchema extends z.ZodType> = {
  [K in keyof z.input<TSchema> as K extends string ? CamelToDash<K> : never]: {
    required?: boolean;
    default?: string;
  };
};

/**
 * Convert camelCase string literal to dash-case at type level
 * e.g., 'workerName' -> 'worker-name'
 */
type CamelToDash<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Uppercase<Head>
    ? `-${Lowercase<Head>}${CamelToDash<Tail>}`
    : `${Head}${CamelToDash<Tail>}`
  : S;

/**
 * Validate that InputConfig keys match Schema keys (for use in tests)
 * Returns true type if valid, never if mismatch
 */
export type ValidateConfigKeys<
  TSchema extends z.ZodType,
  TConfig extends Record<string, unknown>
> = keyof ConfigKeysToCamel<TConfig> extends keyof z.input<TSchema>
  ? keyof z.input<TSchema> extends keyof ConfigKeysToCamel<TConfig>
    ? true
    : never
  : never;

// ================================
// Runtime Types
// ================================

/**
 * Input field configuration type (legacy, use TypedInputConfig for new code)
 */
export type InputConfig = Record<string, { required?: boolean; default?: string }>;

// Dash-case to camelCase conversion for input names
function dashToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Map raw inputs from core.getInput (dash-case) to camelCase keys for Zod validation
 */
export function mapInputs(inputMap: InputConfig): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [dashKey, config] of Object.entries(inputMap)) {
    const camelKey = dashToCamel(dashKey);
    const value = core.getInput(dashKey, { required: config.required });
    mapped[camelKey] = value || config.default || undefined;
  }
  return mapped;
}

/**
 * Parse and validate inputs against a Zod schema
 * @param schema - Zod schema for validation
 * @param raw - Raw input object to validate
 * @returns Validated inputs or null if validation fails
 */
export function parseInputs<T>(schema: z.ZodType<T>, raw: unknown): T | null {
  const result = schema.safeParse(raw);

  if (!result.success) {
    const msg = result.error.issues
      .map((e: z.ZodIssue) => `${e.path.join('.')} - ${e.message}`)
      .join('; ');
    core.setFailed(`Input validation failed: ${msg}`);
    return null;
  }

  return result.data;
}

/**
 * Get and validate action inputs from schema and config
 * @param schema - Zod schema for validation
 * @param inputConfig - Input field configuration (dash-case keys)
 * @param transform - Optional transform function to apply before validation
 * @returns Validated inputs or null if validation fails
 */
export function getActionInputs<T>(
  schema: z.ZodType<T>,
  inputConfig: InputConfig,
  transform?: (raw: Record<string, unknown>) => Record<string, unknown>
): T | null {
  const raw = mapInputs(inputConfig);
  const transformed = transform ? transform(raw) : raw;
  const result = schema.safeParse(transformed);

  if (!result.success) {
    const msg = result.error.issues
      .map((e: z.ZodIssue) => `${e.path.join('.')} - ${e.message}`)
      .join('; ');
    core.setFailed(`Input validation failed: ${msg}`);
    return null;
  }

  return result.data;
}

/**
 * Convert camelCase to dash-case
 */
function camelToDash(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Validate and set action outputs
 * Converts camelCase schema keys to dash-case for action.yml compatibility
 */
export function setOutputsValidated<T>(schema: z.ZodType<T>, outputs: T) {
  const result = schema.safeParse(outputs);

  if (!result.success) {
    const message = result.error.issues.map((e: z.ZodIssue) => e.message).join('; ');
    core.setFailed(`Output validation failed: ${message}`);
    return;
  }

  // Type-safe output setting with camelCase to dash-case conversion
  const validated = result.data as Record<string, unknown>;
  for (const [k, v] of Object.entries(validated)) {
    const dashKey = camelToDash(k);
    if (v === undefined || v === null) {
      core.setOutput(dashKey, '');
    } else if (typeof v === 'object') {
      core.setOutput(dashKey, JSON.stringify(v));
    } else {
      core.setOutput(dashKey, String(v));
    }
  }
}
