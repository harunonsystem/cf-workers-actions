import { z } from 'zod';

export const PreparePreviewDeployInputSchema = z.object({
  workerName: z.string().min(1, 'worker-name is required'),
  environment: z.string().min(1, 'environment is required'),
  domain: z.string().min(1, 'domain is required'),
  wranglerTomlPath: z.string().default('./wrangler.toml')
});

export type PreparePreviewDeployInput = z.infer<typeof PreparePreviewDeployInputSchema>;

export const PreparePreviewDeployOutputSchema = z.object({
  deploymentUrl: z.string(),
  deploymentName: z.string()
});

export type PreparePreviewDeployOutput = z.infer<typeof PreparePreviewDeployOutputSchema>;
