"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupOutputSchema = exports.CleanupInputSchema = exports.DeployOutputSchema = exports.DeployInputSchema = exports.CommentOutputSchema = exports.CommentInputSchema = void 0;
const zod_1 = require("zod");
// Comment action
exports.CommentInputSchema = zod_1.z.object({
    deploymentUrl: zod_1.z.string().refine((u) => u.startsWith('https://'), { message: 'must use https' }),
    deploymentStatus: zod_1.z.enum(['success', 'failure', 'pending']).default('success'),
    workerName: zod_1.z.string().optional(),
    githubToken: zod_1.z.string().min(1),
    customMessage: zod_1.z.string().optional(),
    commentTemplate: zod_1.z.string().optional(),
    updateExisting: zod_1.z.boolean().default(true),
    commentTag: zod_1.z.string().default('cloudflare-workers-deployment')
});
exports.CommentOutputSchema = zod_1.z.object({
    commentId: zod_1.z.string().optional(),
    commentUrl: zod_1.z.string().optional()
});
// Deploy action (basic schema - can be expanded)
exports.DeployInputSchema = zod_1.z.object({
    environment: zod_1.z.string().min(1).default('preview'),
    workerName: zod_1.z.string().optional(),
    workerNamePattern: zod_1.z.string().optional(),
    subdomain: zod_1.z.string().optional(),
    forcePreview: zod_1.z.boolean().default(false),
    cloudflareApiToken: zod_1.z.string().min(1),
    cloudflareAccountId: zod_1.z.string().optional(),
    secrets: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    deployCommand: zod_1.z.string().default('deploy'),
    wranglerFile: zod_1.z.string().default('wrangler.toml'),
    workflowMode: zod_1.z.enum(['auto', 'gitflow', 'githubflow']).default('auto'),
    excludeBranches: zod_1.z.string().default(''),
    releaseBranchPattern: zod_1.z.string().default('release/')
});
exports.DeployOutputSchema = zod_1.z.object({
    workerUrl: zod_1.z.string().optional(),
    workerName: zod_1.z.string().optional(),
    success: zod_1.z.boolean().optional(),
    errorMessage: zod_1.z.string().optional()
});
// Cleanup action (basic schema - can be expanded)
exports.CleanupInputSchema = zod_1.z.object({
    workerPattern: zod_1.z.string().optional(),
    workerNames: zod_1.z.array(zod_1.z.string()).optional(),
    cloudflareApiToken: zod_1.z.string().min(1),
    cloudflareAccountId: zod_1.z.string().min(1),
    dryRun: zod_1.z.boolean().default(false),
    confirmDeletion: zod_1.z.string().default('yes'),
    exclude: zod_1.z.string().optional()
});
exports.CleanupOutputSchema = zod_1.z.object({
    deletedWorkers: zod_1.z.array(zod_1.z.string()).optional(),
    deletedCount: zod_1.z.number().optional(),
    skippedWorkers: zod_1.z.array(zod_1.z.string()).optional(),
    dryRunResults: zod_1.z.array(zod_1.z.string()).optional()
});
