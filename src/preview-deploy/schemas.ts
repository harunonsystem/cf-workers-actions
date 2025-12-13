import { z } from 'zod';
import { CommonFields } from '../shared/schemas';

export const DeployPreviewInputSchema = z.object({
  cloudflareApiToken: CommonFields.cloudflareApiToken,
  cloudflareAccountId: CommonFields.cloudflareAccountId,
  workerName: CommonFields.workerName,
  environment: z.string().default('preview'),
  prNumber: z.string().optional(),
  domain: CommonFields.domain,
  wranglerTomlPath: CommonFields.wranglerTomlPath
});

export type DeployPreviewInput = z.infer<typeof DeployPreviewInputSchema>;

export const DeployPreviewOutputSchema = z.object({
  deploymentUrl: z.string(),
  deploymentName: z.string(),
  deploymentSuccess: z.string() // core.setOutput converts boolean to string
});

export type DeployPreviewOutput = z.infer<typeof DeployPreviewOutputSchema>;
