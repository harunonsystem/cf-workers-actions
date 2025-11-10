import { z } from 'zod';
export declare const CloudflareApiResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    result: z.ZodOptional<z.ZodAny>;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type CloudflareApiResponse = z.infer<typeof CloudflareApiResponseSchema>;
