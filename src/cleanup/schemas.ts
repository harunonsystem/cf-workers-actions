import { z } from 'zod';
import type { TypedInputConfig } from '../shared/validation';

export const CleanupInputSchema = z.object({
  workerNames: z
    .array(z.string().min(1, 'Worker name cannot be empty'))
    .min(
      1,
      'At least one worker must be specified (via worker-names or worker-prefix + worker-numbers)'
    ),
  workerPrefix: z.string().optional(),
  workerNumbers: z.string().optional(),
  cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required'),
  cloudflareAccountId: z.string().min(1, 'Cloudflare account ID is required'),
  dryRun: z.boolean().default(true),
  exclude: z.string().optional()
});

/**
 * Input field configuration for GitHub Actions
 * Type-checked against CleanupInputSchema
 */
export const CleanupInputConfig: TypedInputConfig<typeof CleanupInputSchema> = {
  'worker-names': { required: false },
  'worker-numbers': { required: false },
  'worker-prefix': { required: false },
  'cloudflare-api-token': { required: true },
  'cloudflare-account-id': { required: true },
  'dry-run': { required: false, default: 'true' },
  exclude: { required: false }
};

export const CleanupOutputSchema = z.object({
  deletedWorkers: z.array(z.string()).optional(),
  deletedCount: z.number().optional(),
  skippedWorkers: z.array(z.string()).optional(),
  dryRunResults: z.array(z.string()).optional()
});

export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
