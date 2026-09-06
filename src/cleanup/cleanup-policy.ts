import { isCloudflareRateLimitError } from "../shared/lib/cloudflare-api";
import { getErrorMessage } from "../shared/lib/error-handler";
import { debug, error, info, warning } from "../shared/lib/logger";
import { sleep as defaultSleep } from "../shared/lib/string-utils";

const RATE_LIMIT_DELAY = 500;
const MAX_RETRIES = 3;

export interface CleanupPolicyLogger {
  debug(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warning(message: string): void;
}

export interface CleanupPolicyDependencies {
  deleteWorker(workerName: string): Promise<boolean>;
  logger: CleanupPolicyLogger;
  sleep(milliseconds: number): Promise<void>;
}

export interface CleanupPolicyOptions {
  dryRun: boolean;
  workerNames: string[];
}

export interface CleanupPolicyResult {
  deletedWorkers: string[];
  dryRun: boolean;
  skippedWorkers: string[];
}

const defaultDependencies: Omit<CleanupPolicyDependencies, "deleteWorker"> = {
  logger: { debug, error, info, warning },
  sleep: defaultSleep
};

async function deleteWithRetry(
  workerName: string,
  dependencies: CleanupPolicyDependencies,
  retryCount = 0
): Promise<boolean> {
  try {
    return await dependencies.deleteWorker(workerName);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    const isRateLimited =
      isCloudflareRateLimitError(err) || errorMessage.toLowerCase().includes("rate limit");

    if (isRateLimited && retryCount < MAX_RETRIES) {
      const backoffDelay = 2 ** retryCount * 30000;
      dependencies.logger.warning(
        `⏰ Rate limit hit for ${workerName}, waiting ${backoffDelay / 1000}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`
      );
      await dependencies.sleep(backoffDelay);
      return deleteWithRetry(workerName, dependencies, retryCount + 1);
    }

    throw err;
  }
}

export async function executeCleanupPolicy(
  options: CleanupPolicyOptions,
  dependencies: CleanupPolicyDependencies
): Promise<CleanupPolicyResult> {
  const { dryRun, workerNames } = options;

  if (dryRun) {
    dependencies.logger.info(`🔍 DRY RUN MODE: Would delete ${workerNames.length} workers`);
    for (const workerName of workerNames) {
      dependencies.logger.debug(`  - ${workerName}`);
    }

    return {
      deletedWorkers: workerNames,
      skippedWorkers: [],
      dryRun: true
    };
  }

  dependencies.logger.info(`🗑️  Deleting ${workerNames.length} workers...`);

  const deletedWorkers: string[] = [];
  const skippedWorkers: string[] = [];

  for (const workerName of workerNames) {
    try {
      const deleted = await deleteWithRetry(workerName, dependencies);
      if (deleted) {
        deletedWorkers.push(workerName);
        dependencies.logger.info(`✅ Deleted: ${workerName}`);
      } else {
        skippedWorkers.push(workerName);
        dependencies.logger.warning(`⚠️  Skipped (not found): ${workerName}`);
      }
    } catch (err) {
      skippedWorkers.push(workerName);
      dependencies.logger.error(`❌ Failed to delete ${workerName}: ${getErrorMessage(err)}`);
    }

    await dependencies.sleep(RATE_LIMIT_DELAY);
  }

  return {
    deletedWorkers,
    skippedWorkers,
    dryRun: false
  };
}

export function createDefaultCleanupPolicyDependencies(
  deleteWorker: CleanupPolicyDependencies["deleteWorker"]
): CleanupPolicyDependencies {
  return {
    deleteWorker,
    ...defaultDependencies
  };
}
