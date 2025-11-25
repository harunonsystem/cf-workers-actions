import type { z } from 'zod';
export declare function mapInputs(inputMap: Record<string, {
    required?: boolean;
    default?: string;
}>): Record<string, unknown>;
export declare function parseInputs<T>(schema: z.ZodType<T>, raw: Record<string, unknown>): T | null;
export declare function setOutputsValidated<T>(schema: z.ZodType<T>, outputs: T): void;
