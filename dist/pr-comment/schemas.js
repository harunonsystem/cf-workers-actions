"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrCommentInputSchema = void 0;
const zod_1 = require("zod");
exports.PrCommentInputSchema = zod_1.z.object({
    deploymentUrl: zod_1.z.string().url('deployment-url must be a valid URL'),
    deploymentSuccess: zod_1.z.boolean(),
    deploymentName: zod_1.z.string().min(1, 'deployment-name is required')
});
