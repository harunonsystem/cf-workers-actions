#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cleanup_1 = require("./cleanup");
async function main() {
    try {
        const mode = process.env.INPUT_CLEANUP_MODE;
        const accountId = process.env.INPUT_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.INPUT_CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
        const prNumber = process.env.INPUT_PR_NUMBER ? parseInt(process.env.INPUT_PR_NUMBER, 10) : undefined;
        const workerNamePrefix = process.env.INPUT_WORKER_NAME_PREFIX || 'preview';
        const workerNamesStr = process.env.INPUT_WORKER_NAMES;
        const batchPattern = process.env.INPUT_BATCH_PATTERN;
        const excludeWorkersStr = process.env.INPUT_EXCLUDE_WORKERS;
        const dryRun = process.env.INPUT_DRY_RUN === 'true';
        if (!mode) {
            throw new Error('cleanup-mode is required');
        }
        if (!accountId) {
            throw new Error('cloudflare-account-id is required');
        }
        if (!apiToken) {
            throw new Error('cloudflare-api-token is required');
        }
        const workerNames = workerNamesStr ? workerNamesStr.split(',').map(s => s.trim()) : undefined;
        const excludeWorkers = excludeWorkersStr ? excludeWorkersStr.split(',').map(s => s.trim()) : undefined;
        console.log(`\nCleanup mode: ${mode}`);
        console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}\n`);
        const result = await (0, cleanup_1.cleanupWorkers)({
            mode,
            accountId,
            apiToken,
            prNumber,
            workerNamePrefix,
            workerNames,
            batchPattern,
            excludeWorkers,
            dryRun,
        });
        // Set GitHub Actions outputs
        console.log(`\ndeleted-count=${result.deleted}`);
        console.log(`::set-output name=deleted-count::${result.deleted}`);
        console.log(`skipped-count=${result.skipped}`);
        console.log(`::set-output name=skipped-count::${result.skipped}`);
        const deletedWorkersJson = JSON.stringify(result.deletedNames);
        console.log(`deleted-workers=${deletedWorkersJson}`);
        console.log(`::set-output name=deleted-workers::${deletedWorkersJson}`);
        console.log('\n=== Cleanup Summary ===');
        console.log(`Deleted: ${result.deleted}`);
        console.log(`Skipped: ${result.skipped}`);
        console.log(`Errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
            console.error('\nErrors encountered:');
            result.errors.forEach(error => console.error(`  - ${error}`));
            process.exit(1);
        }
        console.log('\n✅ Cleanup completed successfully');
    }
    catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
main();
