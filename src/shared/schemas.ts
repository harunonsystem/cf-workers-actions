import { z } from 'zod';

// Cleanup action with enhanced validation
export const CleanupInputSchema = z.object({
  workerPattern: z.string().min(1, 'Worker pattern cannot be empty when provided').optional(),
  workerNames: z.array(z.string().min(1, 'Worker name cannot be empty')).optional(),
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
