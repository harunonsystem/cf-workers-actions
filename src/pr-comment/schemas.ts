import { z } from 'zod';
import { CommonFields } from '../shared/schemas';

export const PrCommentInputSchema = z.object({
  deploymentUrl: CommonFields.deploymentUrl,
  deploymentSuccess: CommonFields.deploymentSuccess,
  deploymentName: CommonFields.deploymentName
});

export type PrCommentInput = z.infer<typeof PrCommentInputSchema>;
