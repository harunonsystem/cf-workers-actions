import { z } from 'zod';

// ================================
// Shared Field Schemas
// ================================

/**
 * Common field schemas for reuse across actions
 */
export const CommonFields = {
  // Worker/deployment related
  workerName: z.string().min(1, 'worker-name is required'),
  deploymentName: z.string().min(1, 'deployment-name is required'),
  deploymentUrl: z.string().url('deployment-url must be a valid URL'),
  deploymentSuccess: z.boolean(),

  // Environment and configuration
  environment: z.string().min(1, 'environment is required'),
  domain: z.string().min(1, 'domain is required'),
  wranglerTomlPath: z.string().default('./wrangler.toml'),

  // Cloudflare credentials
  cloudflareApiToken: z.string().min(1, 'cloudflare-api-token is required'),
  cloudflareAccountId: z.string().min(1, 'cloudflare-account-id is required')
} as const;

// ================================
// Cloudflare API Schemas
// ================================

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
