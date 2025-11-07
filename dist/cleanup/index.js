"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const cleanup_1 = require("./cleanup");
async function run() {
    try {
        // Get inputs
        const mode = core.getInput('cleanup-mode', { required: true });
        const accountId = core.getInput('cloudflare-account-id', { required: true });
        const apiToken = core.getInput('cloudflare-api-token', { required: true });
        const prNumberStr = core.getInput('pr-number');
        const workerNamePrefix = core.getInput('worker-name-prefix') || 'preview';
        const workerNamesStr = core.getInput('worker-names');
        const batchPattern = core.getInput('batch-pattern');
        const maxAgeDaysStr = core.getInput('max-age-days');
        const excludeWorkersStr = core.getInput('exclude-workers');
        const dryRun = core.getInput('dry-run') === 'true';
        const prNumber = prNumberStr ? parseInt(prNumberStr, 10) : undefined;
        const maxAgeDays = maxAgeDaysStr ? parseInt(maxAgeDaysStr, 10) : undefined;
        const workerNames = workerNamesStr ? workerNamesStr.split(',').map((s) => s.trim()) : undefined;
        const excludeWorkers = excludeWorkersStr
            ? excludeWorkersStr.split(',').map((s) => s.trim())
            : undefined;
        core.info(`Cleanup mode: ${mode}`);
        core.info(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
        core.info('');
        const result = await (0, cleanup_1.cleanupWorkers)({
            mode,
            accountId,
            apiToken,
            prNumber,
            workerNamePrefix,
            workerNames,
            batchPattern,
            maxAgeDays,
            excludeWorkers,
            dryRun
        });
        // Set outputs
        core.setOutput('deleted-count', result.deleted.toString());
        core.setOutput('skipped-count', result.skipped.toString());
        core.setOutput('deleted-workers', JSON.stringify(result.deletedNames));
        core.info('');
        core.info('=== Cleanup Summary ===');
        core.info(`Deleted: ${result.deleted}`);
        core.info(`Skipped: ${result.skipped}`);
        core.info(`Errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
            core.error('Errors encountered:');
            result.errors.forEach((error) => core.error(`  - ${error}`));
            core.setFailed('Cleanup completed with errors');
        }
        else {
            core.info('');
            core.info('✅ Cleanup completed successfully');
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();
