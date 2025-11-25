import { z } from 'zod';
export declare const PrCommentInputSchema: z.ZodObject<{
    deploymentUrl: z.ZodString;
    deploymentSuccess: z.ZodBoolean;
    deploymentName: z.ZodString;
}, z.core.$strip>;
export type PrCommentInput = z.infer<typeof PrCommentInputSchema>;
