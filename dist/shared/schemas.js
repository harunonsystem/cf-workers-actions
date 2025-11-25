"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareApiResponseSchema = void 0;
const zod_1 = require("zod");
// Cloudflare API Response Schema - shared across actions
exports.CloudflareApiResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    result: zod_1.z.any().optional(),
    errors: zod_1.z
        .array(zod_1.z.object({
        code: zod_1.z.number(),
        message: zod_1.z.string()
    }))
        .optional()
});
