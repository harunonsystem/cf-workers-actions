"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreparePreviewDeployOutputSchema = exports.PreparePreviewDeployInputSchema = void 0;
const zod_1 = require("zod");
exports.PreparePreviewDeployInputSchema = zod_1.z.object({
    workerName: zod_1.z.string().min(1, 'worker-name is required'),
    environment: zod_1.z.string().min(1, 'environment is required'),
    domain: zod_1.z.string().default('workers.dev'),
    wranglerTomlPath: zod_1.z.string().default('./wrangler.toml')
});
exports.PreparePreviewDeployOutputSchema = zod_1.z.object({
    deploymentUrl: zod_1.z.string(),
    deploymentName: zod_1.z.string()
});
