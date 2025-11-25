"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupOutputSchema = exports.CleanupInputSchema = void 0;
const zod_1 = require("zod");
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
