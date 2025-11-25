import { z } from 'zod';
export declare const PreparePreviewDeployInputSchema: z.ZodObject<{
    workerName: z.ZodString;
    environment: z.ZodString;
    domain: z.ZodDefault<z.ZodString>;
    wranglerTomlPath: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type PreparePreviewDeployInput = z.infer<typeof PreparePreviewDeployInputSchema>;
export declare const PreparePreviewDeployOutputSchema: z.ZodObject<{
    deploymentUrl: z.ZodString;
    deploymentName: z.ZodString;
}, z.core.$strip>;
export type PreparePreviewDeployOutput = z.infer<typeof PreparePreviewDeployOutputSchema>;
