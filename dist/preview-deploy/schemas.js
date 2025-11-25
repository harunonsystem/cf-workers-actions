"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployPreviewOutputSchema = exports.DeployPreviewInputSchema = void 0;
const zod_1 = require("zod");
exports.DeployPreviewInputSchema = zod_1.z.object({
    cloudflareApiToken: zod_1.z.string().min(1, 'cloudflare-api-token is required'),
    cloudflareAccountId: zod_1.z.string().min(1, 'cloudflare-account-id is required'),
    workerName: zod_1.z.string().min(1, 'worker-name is required'),
    environment: zod_1.z.string().default('preview'),
    prNumber: zod_1.z.string().optional(),
    domain: zod_1.z.string().default('workers.dev'),
    wranglerTomlPath: zod_1.z.string().default('./wrangler.toml')
});
exports.DeployPreviewOutputSchema = zod_1.z.object({
    deploymentUrl: zod_1.z.string(),
    deploymentName: zod_1.z.string(),
    deploymentSuccess: zod_1.z.string() // core.setOutput converts boolean to string
});
