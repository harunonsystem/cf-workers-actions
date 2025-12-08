import { z } from 'zod';

export const CleanupInputSchema = z
  .object({
    workerNames: z
      .array(z.string().min(1, 'Worker name cannot be empty'))
      .min(1, 'At least one worker must be specified (via worker-names or worker-prefix + worker-numbers)'),
    workerPrefix: z.string().optional(),
    workerNumbers: z.string().optional(),
    cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required'),
    cloudflareAccountId: z.string().min(1, 'Cloudflare account ID is required'),
    dryRun: z.boolean().default(true),
    exclude: z.string().optional()
  });

export const CleanupOutputSchema = z.object({
  deletedWorkers: z.array(z.string()).optional(),
  deletedCount: z.number().optional(),
  skippedWorkers: z.array(z.string()).optional(),
  dryRunResults: z.array(z.string()).optional()
});

export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
