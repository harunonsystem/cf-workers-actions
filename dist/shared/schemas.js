"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupOutputSchema = exports.CleanupInputSchema = exports.DeployOutputSchema = exports.DeployInputSchema = exports.CommentOutputSchema = exports.CommentInputSchema = void 0;
const zod_1 = require("zod");
// Comment action
exports.CommentInputSchema = zod_1.z.object({
    deploymentUrl: zod_1.z
        .string()
        .url('Must be a valid URL')
        .refine((u) => u.startsWith('https://'), { message: 'Must use HTTPS protocol' }),
    deploymentStatus: zod_1.z.enum(['success', 'failure', 'pending']).default('success'),
    workerName: zod_1.z.string().optional(),
    githubToken: zod_1.z.string().min(1, 'GitHub token is required'),
    customMessage: zod_1.z.string().max(5000, 'Custom message too long (max 5000 chars)').optional(),
    commentTemplate: zod_1.z.string().max(10000, 'Comment template too long (max 10000 chars)').optional(),
    updateExisting: zod_1.z.boolean().default(true),
    commentTag: zod_1.z.string().default('cloudflare-workers-deployment')
});
exports.CommentOutputSchema = zod_1.z.object({
    commentId: zod_1.z.string().optional(),
    commentUrl: zod_1.z.string().url().optional()
});
// Deploy action with enhanced validation
exports.DeployInputSchema = zod_1.z.object({
    environment: zod_1.z
        .string()
        .min(1, 'Environment is required')
        .max(50, 'Environment name too long')
        .regex(/^[a-z0-9-]+$/, 'Environment must be lowercase alphanumeric with hyphens')
        .default('preview'),
    workerNamePattern: zod_1.z
        .string()
        .min(1, 'Worker name pattern is required when provided')
        .max(100, 'Worker name pattern too long')
        .regex(/^[a-z0-9-{}_]+$/, 'Invalid pattern characters')
        .optional(),
    subdomain: zod_1.z
        .string()
        .max(63, 'Subdomain exceeds DNS limit')
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format')
        .optional(),
    cloudflareApiToken: zod_1.z.string().min(1, 'Cloudflare API token is required'),
    cloudflareAccountId: zod_1.z.string().optional(),
    secrets: zod_1.z
        .record(zod_1.z
        .string()
        .min(1, 'Secret key cannot be empty')
        .max(255, 'Secret key too long')
        .regex(/^[A-Z_][A-Z0-9_]*$/, 'Secret keys must be uppercase with underscores'), zod_1.z.string().min(1, 'Secret value cannot be empty').max(10000, 'Secret value exceeds 10KB limit'))
        .default({}),
    deployCommand: zod_1.z.string().default('deploy'),
    wranglerFile: zod_1.z.string().default('wrangler.toml'),
    excludeBranches: zod_1.z.string().default('')
});
exports.DeployOutputSchema = zod_1.z.object({
    workerUrl: zod_1.z.string().optional(),
    workerName: zod_1.z.string().optional(),
    success: zod_1.z.boolean().optional(),
    errorMessage: zod_1.z.string().optional()
});
// Cleanup action with enhanced validation
exports.CleanupInputSchema = zod_1.z.object({
    workerPattern: zod_1.z.string().min(1, 'Worker pattern cannot be empty when provided').optional(),
    workerNames: zod_1.z.array(zod_1.z.string().min(1, 'Worker name cannot be empty')).optional(),
    cloudflareApiToken: zod_1.z.string().min(1, 'Cloudflare API token is required'),
    cloudflareAccountId: zod_1.z.string().min(1, 'Cloudflare account ID is required'),
    dryRun: zod_1.z.boolean().default(true),
    exclude: zod_1.z.string().optional()
});
exports.CleanupOutputSchema = zod_1.z.object({
    deletedWorkers: zod_1.z.array(zod_1.z.string()).optional(),
    deletedCount: zod_1.z.number().optional(),
    skippedWorkers: zod_1.z.array(zod_1.z.string()).optional(),
    dryRunResults: zod_1.z.array(zod_1.z.string()).optional()
});
