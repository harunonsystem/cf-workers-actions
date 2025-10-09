import { z } from 'zod';

// Comment action
export const CommentInputSchema = z.object({
  deploymentUrl: z
    .string()
    .url('Must be a valid URL')
    .refine((u) => u.startsWith('https://'), { message: 'Must use HTTPS protocol' }),
  deploymentStatus: z.enum(['success', 'failure', 'pending']).default('success'),
  workerName: z.string().optional(),
  githubToken: z.string().min(1, 'GitHub token is required'),
  customMessage: z.string().max(5000, 'Custom message too long (max 5000 chars)').optional(),
  commentTemplate: z.string().max(10000, 'Comment template too long (max 10000 chars)').optional(),
  updateExisting: z.boolean().default(true),
  commentTag: z.string().default('cloudflare-workers-deployment')
});

export const CommentOutputSchema = z.object({
  commentId: z.string().optional(),
  commentUrl: z.string().url().optional()
});

export type CommentInputs = z.infer<typeof CommentInputSchema>;
export type CommentOutputs = z.infer<typeof CommentOutputSchema>;

// Deploy action with enhanced validation
export const DeployInputSchema = z.object({
  environment: z
    .string()
    .min(1, 'Environment is required')
    .max(50, 'Environment name too long')
    .regex(/^[a-z0-9-]+$/, 'Environment must be lowercase alphanumeric with hyphens')
    .default('preview'),
  workerNamePattern: z
    .string()
    .min(1, 'Worker name pattern is required when provided')
    .max(100, 'Worker name pattern too long')
    .regex(/^[a-z0-9-{}_]+$/, 'Invalid pattern characters')
    .optional(),
  subdomain: z
    .string()
    .max(63, 'Subdomain exceeds DNS limit')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format')
    .optional(),
  cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required'),
  cloudflareAccountId: z.string().optional(),
  secrets: z
    .record(
      z
        .string()
        .min(1, 'Secret key cannot be empty')
        .max(255, 'Secret key too long')
        .regex(/^[A-Z_][A-Z0-9_]*$/, 'Secret keys must be uppercase with underscores'),
      z.string().min(1, 'Secret value cannot be empty').max(10000, 'Secret value exceeds 10KB limit')
    )
    .default({}),
  deployCommand: z.string().default('deploy'),
  wranglerFile: z.string().default('wrangler.toml'),
  excludeBranches: z.string().default('')
});

export const DeployOutputSchema = z.object({
  workerUrl: z.string().optional(),
  workerName: z.string().optional(),
  success: z.boolean().optional(),
  errorMessage: z.string().optional()
});

export type DeployInputs = z.infer<typeof DeployInputSchema>;
export type DeployOutputs = z.infer<typeof DeployOutputSchema>;

// Cleanup action with enhanced validation
export const CleanupInputSchema = z.object({
  workerPattern: z.string().min(1, 'Worker pattern cannot be empty when provided').optional(),
  workerNames: z.array(z.string().min(1, 'Worker name cannot be empty')).optional(),
  cloudflareApiToken: z.string().min(1, 'Cloudflare API token is required'),
  cloudflareAccountId: z.string().min(1, 'Cloudflare account ID is required'),
  dryRun: z.boolean().default(true),
  exclude: z.string().optional()
});

export const CleanupOutputSchema = z.object({
  deletedWorkers: z.array(z.string()).optional(),
  deletedCount: z.number().optional(),
  skippedWorkers: z.array(z.string()).optional(),
  dryRunResults: z.array(z.string()).optional()
});

export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
