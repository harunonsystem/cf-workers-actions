import { z } from 'zod';

// Cloudflare API Response Schema - shared across actions
export const CloudflareApiResponseSchema = z.object({
  success: z.boolean(),
  result: z.any().optional(),
  errors: z
    .array(
      z.object({
        code: z.number(),
        message: z.string()
      })
    )
    .optional()
});

export type CloudflareApiResponse = z.infer<typeof CloudflareApiResponseSchema>;
