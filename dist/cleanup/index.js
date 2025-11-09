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
const cloudflare_api_1 = require("../shared/lib/cloudflare-api");
const schemas_1 = require("../shared/schemas");
const validation_1 = require("../shared/validation");
const error_handler_1 = require("../shared/lib/error-handler");
async function run() {
    try {
        // Map and validate inputs
        const rawInputs = (0, validation_1.mapInputs)({
            'worker-pattern': { required: false },
            'cloudflare-api-token': { required: true },
            'cloudflare-account-id': { required: true },
            'dry-run': { required: false, default: 'true' },
            exclude: { required: false }
        });
        // Parse worker names separately
        const workerNamesInput = core.getInput('worker-names');
        let workerNames;
        if (workerNamesInput) {
            workerNames = workerNamesInput
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean);
        }
        // Validate inputs with Zod
        const inputs = (0, validation_1.parseInputs)(schemas_1.CleanupInputSchema, {
            ...rawInputs,
            workerNames,
            dryRun: rawInputs.dryRun === 'true'
        });
        if (!inputs) {
            throw new Error('Input validation failed');
        }
        // Validate inputs
        if (!inputs.workerPattern && !inputs.workerNames) {
            throw new Error('Either worker-pattern or worker-names must be provided');
        }
        // API token, account ID, and worker name validation is handled by Cloudflare API
        // Initialize Cloudflare API client
        const cf = new cloudflare_api_1.CloudflareApi(inputs.cloudflareApiToken, inputs.cloudflareAccountId);
        // Get workers to process
        let workersToProcess = [];
        if (inputs.workerNames && inputs.workerNames.length > 0) {
            // Use specific worker names
            workersToProcess = inputs.workerNames;
            core.info(`Processing specific workers: ${inputs.workerNames.join(', ')}`);
        }
        else if (inputs.workerPattern) {
            // Find workers by pattern
            workersToProcess = await cf.findWorkersByPattern(inputs.workerPattern);
            core.info(`Found ${workersToProcess.length} workers matching pattern: ${inputs.workerPattern}`);
        }
        // Apply exclusion filter (supports both exact names and patterns)
        const excludeExactNames = new Set();
        const excludePatternsRegex = [];
        if (inputs.exclude) {
            const items = inputs.exclude
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            const exactNames = [];
            const patterns = [];
            for (const item of items) {
                if (item.includes('*') || item.includes('?')) {
                    patterns.push(item);
                    excludePatternsRegex.push(new RegExp(`^${item.replace(/\*/g, '.*').replace(/\?/g, '.')}$`));
                }
                else {
                    exactNames.push(item);
                    excludeExactNames.add(item);
                }
            }
            if (exactNames.length > 0) {
                core.info(`⏭️  Excluded workers (exact): ${exactNames.join(', ')}`);
            }
            if (patterns.length > 0) {
                core.info(`⏭️  Excluded patterns: ${patterns.join(', ')}`);
            }
        }
        // Filter out excluded workers
        if (workersToProcess.length > 0) {
            const beforeExclusion = workersToProcess.length;
            workersToProcess = workersToProcess.filter((name) => {
                // Check exact excluded names
                if (excludeExactNames.has(name)) {
                    core.info(`⏭️  Excluded: ${name} (exact match)`);
                    return false;
                }
                // Check excluded patterns
                for (const pattern of excludePatternsRegex) {
                    if (pattern.test(name)) {
                        core.info(`⏭️  Excluded: ${name} (matches pattern)`);
                        return false;
                    }
                }
                return true;
            });
            const excluded = beforeExclusion - workersToProcess.length;
            if (excluded > 0) {
                core.info(`⏭️  Total excluded workers: ${excluded}`);
            }
        }
        if (workersToProcess.length === 0) {
            core.info('No workers found to process');
            // Set empty outputs
            core.setOutput('deleted-workers', '[]');
            core.setOutput('deleted-count', '0');
            core.setOutput('skipped-workers', '[]');
            core.setOutput('dry-run-results', '[]');
            return;
        }
        const deletedWorkers = [];
        const skippedWorkers = [];
        // Rate limiting configuration
        // Cloudflare API allows ~1200 requests per 5 minutes
        // 500ms base delay with exponential backoff on rate limit errors
        const RATE_LIMIT_DELAY = 500;
        const MAX_RETRIES = 3;
        async function deleteWithRetry(workerName, retryCount = 0) {
            try {
                return await cf.deleteWorker(workerName);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                // Handle rate limiting with exponential backoff
                if ((errorMessage.includes('rate limit') || errorMessage.includes('429')) &&
                    retryCount < MAX_RETRIES) {
                    const backoffDelay = Math.pow(2, retryCount) * 30000; // 30s, 60s, 120s
                    core.warning(`⏰ Rate limit hit for ${workerName}, waiting ${backoffDelay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
                    return deleteWithRetry(workerName, retryCount + 1);
                }
                throw error;
            }
        }
        if (inputs.dryRun) {
            // Dry run mode - just list what would be deleted
            core.info(`🔍 DRY RUN MODE: Would delete ${workersToProcess.length} workers:`);
            for (const workerName of workersToProcess) {
                core.info(`  - ${workerName}`);
            }
            // Set dry run outputs
            core.setOutput('deleted-workers', '[]');
            core.setOutput('deleted-count', '0');
            core.setOutput('skipped-workers', '[]');
            core.setOutput('dry-run-results', JSON.stringify(workersToProcess));
            // Set summary
            await core.summary
                .addHeading('🔍 Cloudflare Workers Cleanup (Dry Run)')
                .addTable([
                ['Property', 'Value'],
                ['Workers Found', workersToProcess.length.toString()],
                ['Mode', 'Dry Run (no deletion)']
            ])
                .addHeading('Workers that would be deleted:')
                .addList(workersToProcess)
                .write();
        }
        else {
            // Actual deletion mode
            core.info(`🗑️  Deleting ${workersToProcess.length} workers...`);
            for (const workerName of workersToProcess) {
                try {
                    const deleted = await deleteWithRetry(workerName);
                    if (deleted) {
                        deletedWorkers.push(workerName);
                        core.info(`✅ Deleted: ${workerName}`);
                    }
                    else {
                        skippedWorkers.push(workerName);
                        core.warning(`⚠️  Skipped (not found): ${workerName}`);
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    skippedWorkers.push(workerName);
                    core.error(`❌ Failed to delete ${workerName}: ${errorMessage}`);
                }
                // Apply rate limiting delay between deletions
                await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
            }
            // Set outputs
            core.setOutput('deleted-workers', JSON.stringify(deletedWorkers));
            core.setOutput('deleted-count', deletedWorkers.length.toString());
            core.setOutput('skipped-workers', JSON.stringify(skippedWorkers));
            core.setOutput('dry-run-results', '[]');
            // Set summary
            const table = [
                ['Property', 'Value'],
                ['Workers Deleted', deletedWorkers.length.toString()],
                ['Workers Skipped', skippedWorkers.length.toString()],
                ['Total Processed', workersToProcess.length.toString()],
                ['Success Rate', `${Math.round((deletedWorkers.length / workersToProcess.length) * 100)}%`]
            ];
            let summaryBuilder = core.summary.addHeading('🗑️ Cloudflare Workers Cleanup').addTable(table);
            if (deletedWorkers.length > 0) {
                summaryBuilder = summaryBuilder
                    .addHeading('✅ Successfully Deleted Workers:')
                    .addList(deletedWorkers);
            }
            if (skippedWorkers.length > 0) {
                summaryBuilder = summaryBuilder.addHeading('⚠️ Skipped Workers:').addList(skippedWorkers);
            }
            await summaryBuilder.write();
            core.info(`✅ Cleanup completed: ${deletedWorkers.length} deleted, ${skippedWorkers.length} skipped`);
        }
    }
    catch (error) {
        await (0, error_handler_1.handleActionError)(error, {
            summaryTitle: 'Cloudflare Workers Cleanup Failed',
            outputs: error_handler_1.CLEANUP_ERROR_OUTPUTS
        });
    }
}
// Self-invoking async function to handle top-level await
void run();
