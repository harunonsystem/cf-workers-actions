import { z } from 'zod';
import { CommonFields } from '../shared/schemas';
import type { TypedInputConfig } from '../shared/validation';

export const DeployPreviewInputSchema = z.object({
  cloudflareApiToken: CommonFields.cloudflareApiToken,
  cloudflareAccountId: CommonFields.cloudflareAccountId,
  workerName: CommonFields.workerName,
  environment: z.string().default('preview'),
  domain: CommonFields.domain,
  wranglerTomlPath: CommonFields.wranglerTomlPath,
  githubToken: CommonFields.githubToken
});

export type DeployPreviewInput = z.infer<typeof DeployPreviewInputSchema>;

/**
 * Input field configuration for GitHub Actions
 * Type-checked against DeployPreviewInputSchema
 */
export const DeployPreviewInputConfig: TypedInputConfig<typeof DeployPreviewInputSchema> = {
  'cloudflare-api-token': { required: true },
  'cloudflare-account-id': { required: true },
  'worker-name': { required: true },
  environment: { required: false, default: 'preview' },
  domain: { required: false, default: 'workers.dev' },
  'wrangler-toml-path': { required: false, default: './wrangler.toml' },
  'github-token': { required: false }
};

export const DeployPreviewOutputSchema = z.object({
  deploymentUrl: z.string(),
  deploymentName: z.string(),
  deploymentSuccess: z.string() // core.setOutput converts boolean to string
});

export type DeployPreviewOutput = z.infer<typeof DeployPreviewOutputSchema>;
