import { z } from 'zod';

export const CleanupInputSchema = z
  .object({
    workerPattern: z.string().min(1, 'Worker pattern cannot be empty when provided').optional(),
    workerNames: z.array(z.string().min(1, 'Worker name cannot be empty')).optional(),
    cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required'),
    cloudflareAccountId: z.string().min(1, 'Cloudflare account ID is required'),
    dryRun: z.boolean().default(true),
    exclude: z.string().optional()
  })
  .refine(
    (data) => {
      const hasPattern = !!data.workerPattern;
      const hasNames = !!data.workerNames && data.workerNames.length > 0;
      // XOR: exactly one must be true
      return hasPattern !== hasNames;
    },
    {
      message: 'Either worker-pattern or worker-names must be provided, but not both'
    }
  );

export const CleanupOutputSchema = z.object({
  deletedWorkers: z.array(z.string()).optional(),
  deletedCount: z.number().optional(),
  skippedWorkers: z.array(z.string()).optional(),
  dryRunResults: z.array(z.string()).optional()
});

export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
