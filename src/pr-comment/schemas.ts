import { z } from 'zod';
import { CommonFields } from '../shared/schemas';
import type { TypedInputConfig } from '../shared/validation';

export const PrCommentInputSchema = z.object({
  deploymentUrl: CommonFields.deploymentUrl,
  deploymentSuccess: CommonFields.deploymentSuccess,
  deploymentName: CommonFields.deploymentName,
  githubToken: CommonFields.githubToken
});

export type PrCommentInput = z.infer<typeof PrCommentInputSchema>;

/**
 * Input field configuration for GitHub Actions
 * Type-checked against PrCommentInputSchema
 */
export const PrCommentInputConfig: TypedInputConfig<typeof PrCommentInputSchema> = {
  'deployment-url': { required: true },
  'deployment-success': { required: true },
  'deployment-name': { required: true },
  'github-token': { required: false }
};
