import * as core from '@actions/core';
import { CloudflareApi } from '../shared/lib/cloudflare-api';
import {
  CLEANUP_ERROR_OUTPUTS,
  getErrorMessage,
  handleActionError
} from '../shared/lib/error-handler';
import { debug, error, info, warning } from '../shared/lib/logger';
import { sleep } from '../shared/lib/string-utils';
import { getActionInputs } from '../shared/validation';
import { CleanupInputConfig, CleanupInputSchema } from './schemas';
import {
  createCleanupSummary,
  createDryRunSummary,
  createExclusionFilter,
  filterWorkersByExclusion,
  parseWorkerNamesInput,
  setCleanupOutputs,
  setEmptyCleanupOutputs
} from './utils';

// Rate limiting configuration
const RATE_LIMIT_DELAY: number = 500;
const MAX_RETRIES: number = 3;

/**
 * Delete worker with retry logic for rate limiting
 */
async function deleteWithRetry(
  cf: CloudflareApi,
  workerName: string,
  retryCount = 0
): Promise<boolean> {
  try {
    return await cf.deleteWorker(workerName);
  } catch (err) {
    const errorMessage = getErrorMessage(err);

    // Handle rate limiting with exponential backoff
    if (
      (errorMessage.includes('rate limit') || errorMessage.includes('429')) &&
      retryCount < MAX_RETRIES
    ) {
      const backoffDelay: number = 2 ** retryCount * 30000; // 30s, 60s, 120s
      warning(
        `⏰ Rate limit hit for ${workerName}, waiting ${backoffDelay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`
      );
      await sleep(backoffDelay);
      return deleteWithRetry(cf, workerName, retryCount + 1);
    }

    throw err;
  }
}

/**
 * Execute dry run mode
 */
async function executeDryRun(workersToProcess: string[]): Promise<void> {
  info(`🔍 DRY RUN MODE: Would delete ${workersToProcess.length} workers`);
  for (const workerName of workersToProcess) {
    debug(`  - ${workerName}`);
  }

  setCleanupOutputs({ deletedWorkers: workersToProcess, skippedWorkers: [] }, true);
  await createDryRunSummary(workersToProcess);
}

/**
 * Execute actual deletion
 */
async function executeCleanup(cf: CloudflareApi, workersToProcess: string[]): Promise<void> {
  info(`🗑️  Deleting ${workersToProcess.length} workers...`);

  const deletedWorkers: string[] = [];
  const skippedWorkers: string[] = [];

  for (const workerName of workersToProcess) {
    try {
      const deleted = await deleteWithRetry(cf, workerName);
      if (deleted) {
        deletedWorkers.push(workerName);
        info(`✅ Deleted: ${workerName}`);
      } else {
        skippedWorkers.push(workerName);
        warning(`⚠️  Skipped (not found): ${workerName}`);
      }
    } catch (err) {
      skippedWorkers.push(workerName);
      error(`❌ Failed to delete ${workerName}: ${getErrorMessage(err)}`);
    }

    // Apply rate limiting delay between deletions
    await sleep(RATE_LIMIT_DELAY);
  }

  const result = { deletedWorkers, skippedWorkers };
  setCleanupOutputs(result, false);
  await createCleanupSummary(result, workersToProcess.length);

  info(`✅ Cleanup completed: ${deletedWorkers.length} deleted, ${skippedWorkers.length} skipped`);
}

async function run(): Promise<void> {
  try {
    // Get and validate inputs
    const inputs = getActionInputs(CleanupInputSchema, CleanupInputConfig, (raw) => {
      // Parse worker names from various input formats
      const workerNames = parseWorkerNamesInput(
        core.getInput('worker-names'),
        core.getInput('worker-numbers'),
        core.getInput('worker-prefix')
      );
      return {
        ...raw,
        workerNames,
        dryRun: raw.dryRun === 'true'
      };
    });
    if (!inputs) {
      throw new Error('Input validation failed');
    }

    // Initialize Cloudflare API client
    const cf = new CloudflareApi(inputs.cloudflareApiToken, inputs.cloudflareAccountId);

    // Get workers to process
    let workersToProcess: string[] = [];
    if (inputs.workerNames && inputs.workerNames.length > 0) {
      workersToProcess = inputs.workerNames;
      info(`Processing specific workers: ${inputs.workerNames.join(', ')}`);
    }

    // Apply exclusion filter
    const exclusionFilter = createExclusionFilter(inputs.exclude);
    workersToProcess = filterWorkersByExclusion(workersToProcess, exclusionFilter);

    // Early exit if no workers to process
    if (workersToProcess.length === 0) {
      info('No workers found to process');
      setEmptyCleanupOutputs();
      return;
    }

    // Execute based on mode
    if (inputs.dryRun) {
      await executeDryRun(workersToProcess);
    } else {
      await executeCleanup(cf, workersToProcess);
    }
  } catch (err) {
    await handleActionError(err, {
      summaryTitle: 'Cloudflare Workers Cleanup Failed',
      outputs: CLEANUP_ERROR_OUTPUTS
    });
  }
}

export { run };

// Execute if not in test environment
if (process.env.NODE_ENV !== 'test') {
  void run();
}
