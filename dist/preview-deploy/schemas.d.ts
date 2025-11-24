import { z } from 'zod';
export declare const DeployPreviewInputSchema: z.ZodObject<{
    cloudflareApiToken: z.ZodString;
    cloudflareAccountId: z.ZodString;
    workerName: z.ZodString;
    environment: z.ZodDefault<z.ZodString>;
    prNumber: z.ZodOptional<z.ZodString>;
    domain: z.ZodDefault<z.ZodString>;
    wranglerTomlPath: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type DeployPreviewInput = z.infer<typeof DeployPreviewInputSchema>;
export declare const DeployPreviewOutputSchema: z.ZodObject<{
    deploymentUrl: z.ZodString;
    deploymentName: z.ZodString;
    deploymentSuccess: z.ZodString;
}, z.core.$strip>;
export type DeployPreviewOutput = z.infer<typeof DeployPreviewOutputSchema>;
