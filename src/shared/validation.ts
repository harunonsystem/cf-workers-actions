import * as core from '@actions/core';
import { ZodError, z } from 'zod';

export function parseInputs<T>(schema: z.ZodType<T>, raw: Record<string, unknown>): T | null {
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      const msg = err.issues.map((e: any) => `${e.path.join('.')} - ${e.message}`).join('; ');
      core.setFailed(`Input validation failed: ${msg}`);
    } else {
      core.setFailed(`Input validation failed: ${String(err)}`);
    }
    return null;
  }
}

export function setOutputsValidated<T>(schema: z.ZodType<T>, outputs: T) {
  try {
    const validated = schema.parse(outputs);
    for (const [k, v] of Object.entries(validated as any)) {
      if (v === undefined || v === null) {
        core.setOutput(k, '');
      } else if (typeof v === 'object') {
        core.setOutput(k, JSON.stringify(v));
      } else {
        core.setOutput(k, String(v));
      }
    }
  } catch (err) {
    const message =
      err instanceof ZodError ? err.issues.map((e: any) => e.message).join('; ') : String(err);
    core.setFailed(`Output validation failed: ${message}`);
  }
}
