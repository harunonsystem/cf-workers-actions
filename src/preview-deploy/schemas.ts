import { z } from 'zod';

export const DeployPreviewInputSchema = z.object({
  cloudflareApiToken: z.string().min(1, 'cloudflare-api-token is required'),
  cloudflareAccountId: z.string().min(1, 'cloudflare-account-id is required'),
  workerName: z.string().min(1, 'worker-name is required'),
  environment: z.string().default('preview'),
  prNumber: z.string().optional(),
  domain: z.string().min(1, 'domain is required'),
  wranglerTomlPath: z.string().default('./wrangler.toml')
});

export type DeployPreviewInput = z.infer<typeof DeployPreviewInputSchema>;

export const DeployPreviewOutputSchema = z.object({
  deploymentUrl: z.string(),
  deploymentName: z.string(),
  deploymentSuccess: z.string() // core.setOutput converts boolean to string
});

export type DeployPreviewOutput = z.infer<typeof DeployPreviewOutputSchema>;
