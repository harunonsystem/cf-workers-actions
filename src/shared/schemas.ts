import { z } from 'zod';

// Comment action
export const CommentInputSchema = z.object({
  deploymentUrl: z.string().refine((u) => u.startsWith('https://'), { message: 'must use https' }),
  deploymentStatus: z.enum(['success', 'failure', 'pending']).default('success'),
  workerName: z.string().optional(),
  githubToken: z.string().min(1),
  customMessage: z.string().optional(),
  commentTemplate: z.string().optional(),
  updateExisting: z.boolean().default(true),
  commentTag: z.string().default('cloudflare-workers-deployment')
});

export const CommentOutputSchema = z.object({
  commentId: z.string().optional(),
  commentUrl: z.string().url().optional()
});

export type CommentInputs = z.infer<typeof CommentInputSchema>;
export type CommentOutputs = z.infer<typeof CommentOutputSchema>;

// Deploy action (basic schema - can be expanded)
export const DeployInputSchema = z.object({
  environment: z.string().min(1).default('preview'),
  workerName: z.string().optional(),
  workerNamePattern: z.string().optional(),
  subdomain: z.string().optional(),
  cloudflareApiToken: z.string().min(1),
  cloudflareAccountId: z.string().optional(),
  secrets: z.record(z.string(), z.string()).default({}),
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

// Cleanup action (basic schema - can be expanded)
export const CleanupInputSchema = z.object({
  workerPattern: z.string().optional(),
  workerNames: z.array(z.string()).optional(),
  cloudflareApiToken: z.string().min(1),
  cloudflareAccountId: z.string().min(1),
  dryRun: z.boolean().default(false),
  confirmDeletion: z.string().default('yes'),
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
