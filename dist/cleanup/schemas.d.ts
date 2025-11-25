import { z } from 'zod';
export declare const CleanupInputSchema: z.ZodObject<{
    workerPattern: z.ZodOptional<z.ZodString>;
    workerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
    cloudflareApiToken: z.ZodString;
    cloudflareAccountId: z.ZodString;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    exclude: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CleanupOutputSchema: z.ZodObject<{
    deletedWorkers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    deletedCount: z.ZodOptional<z.ZodNumber>;
    skippedWorkers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dryRunResults: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
