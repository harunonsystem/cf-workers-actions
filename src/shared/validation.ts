import * as core from '@actions/core';
import { z } from 'zod';

// Dash-case to camelCase conversion for input names
function dashToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Map raw inputs from core.getInput (dash-case) to camelCase keys for Zod validation
export function mapInputs(
  inputMap: Record<string, { required?: boolean; default?: string }>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [dashKey, config] of Object.entries(inputMap)) {
    const camelKey = dashToCamel(dashKey);
    const value = core.getInput(dashKey, { required: config.required });
    mapped[camelKey] = value || config.default || undefined;
  }
  return mapped;
}

export function parseInputs<T>(schema: z.ZodType<T>, raw: Record<string, unknown>): T | null {
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

export function setOutputsValidated<T>(schema: z.ZodType<T>, outputs: T) {
  const result = schema.safeParse(outputs);

  if (!result.success) {
    const message = result.error.issues.map((e: z.ZodIssue) => e.message).join('; ');
    core.setFailed(`Output validation failed: ${message}`);
    return;
  }

  // Type-safe output setting
  const validated = result.data as Record<string, unknown>;
  for (const [k, v] of Object.entries(validated)) {
    if (v === undefined || v === null) {
      core.setOutput(k, '');
    } else if (typeof v === 'object') {
      core.setOutput(k, JSON.stringify(v));
    } else {
      core.setOutput(k, String(v));
    }
  }
}
