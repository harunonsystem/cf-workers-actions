import { z } from 'zod';

export const PrCommentInputSchema = z.object({
  deploymentUrl: z.string().url('deployment-url must be a valid URL'),
  deploymentSuccess: z.boolean(),
  deploymentName: z.string().min(1, 'deployment-name is required')
});

export type PrCommentInput = z.infer<typeof PrCommentInputSchema>;
