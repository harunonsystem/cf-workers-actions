import { z } from 'zod';
import { CommonFields } from '../shared/schemas';
import type { TypedInputConfig } from '../shared/validation';

export const PreparePreviewDeployInputSchema = z.object({
  workerName: CommonFields.workerName,
  environment: CommonFields.environment,
  domain: CommonFields.domain,
  wranglerTomlPath: CommonFields.wranglerTomlPath
});

export type PreparePreviewDeployInput = z.infer<typeof PreparePreviewDeployInputSchema>;

/**
 * Input field configuration for GitHub Actions
 * Type-checked against PreparePreviewDeployInputSchema
 */
export const PreparePreviewDeployInputConfig: TypedInputConfig<
  typeof PreparePreviewDeployInputSchema
> = {
  'worker-name': { required: true },
  environment: { required: true },
  domain: { required: false, default: 'workers.dev' },
  'wrangler-toml-path': { required: false, default: './wrangler.toml' }
};

export const PreparePreviewDeployOutputSchema = z.object({
  deploymentUrl: z.string(),
  deploymentName: z.string()
});

export type PreparePreviewDeployOutput = z.infer<typeof PreparePreviewDeployOutputSchema>;
