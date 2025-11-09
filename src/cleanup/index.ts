/**
 * Cloudflare Workers Cleanup Action
 * Deletes Cloudflare Workers by prefix, numbers, or names
 */

export interface CleanupOptions {
  apiToken: string;
  accountId: string;
  workerPrefix?: string;
  workerNumbers?: string;
  workerNames?: string;
  prNumber?: string;
  failOnError?: boolean;
}

export interface CleanupResult {
  deletedCount: number;
  notFoundCount: number;
  errorCount: number;
  workers: string[];
}

/**
 * Delete a single Cloudflare Worker
 */
export async function deleteWorker(
  workerName: string,
  apiToken: string,
  accountId: string
): Promise<'success' | 'not-found' | 'error'> {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

  try {
    // Check if worker exists
    const checkResponse = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (checkResponse.status === 404) {
      return 'not-found';
    }

    if (!checkResponse.ok) {
      console.error(`⚠️ Unexpected status when checking worker: ${checkResponse.status}`);
      return 'error';
    }

    // Worker exists, delete it
    const deleteResponse = await fetch(baseUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (deleteResponse.ok) {
      return 'success';
    } else {
      console.error(`❌ Delete failed with status: ${deleteResponse.status}`);
      return 'error';
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error);
    return 'error';
  }
}

/**
 * Build list of worker names to delete
 */
export function buildWorkerList(options: CleanupOptions): string[] {
  // Priority 1: Full worker names (overrides everything)
  if (options.workerNames) {
    return options.workerNames
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
  }

  // Priority 2: PR number (for auto-cleanup)
  if (options.prNumber) {
    if (!options.workerPrefix) {
      throw new Error('worker-prefix is required when using pr-number');
    }
    return [`${options.workerPrefix}${options.prNumber}`];
  }

  // Priority 3: Prefix + numbers
  if (options.workerNumbers) {
    if (!options.workerPrefix) {
      throw new Error('worker-prefix is required when using worker-numbers');
    }
    const numbers = options.workerNumbers
      .split(',')
      .map((num) => num.trim())
      .filter((num) => num.length > 0);

    return numbers.map((num) => `${options.workerPrefix}${num}`);
  }

  throw new Error('Must specify worker-names, pr-number, or worker-numbers');
}

/**
 * Main cleanup function
 */
export async function cleanup(options: CleanupOptions): Promise<CleanupResult> {
  const workers = buildWorkerList(options);

  let deletedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  console.log(`\n🗑️  Cleaning up ${workers.length} worker(s)...\n`);

  for (const worker of workers) {
    console.log(`Processing: ${worker}`);

    const result = await deleteWorker(worker, options.apiToken, options.accountId);

    switch (result) {
      case 'success':
        console.log(`  ✅ Deleted successfully`);
        deletedCount++;
        break;
      case 'not-found':
        console.log(`  ℹ️ Worker not found`);
        notFoundCount++;
        break;
      case 'error':
        console.log(`  ❌ Failed to delete`);
        errorCount++;
        break;
    }
  }

  console.log(`\n📊 Results: ✅${deletedCount} ℹ️${notFoundCount} ❌${errorCount}\n`);

  if (options.failOnError && errorCount > 0) {
    throw new Error(
      `Some operations failed. Deleted: ${deletedCount}, Not found: ${notFoundCount}, Errors: ${errorCount}`
    );
  }

  return {
    deletedCount,
    notFoundCount,
    errorCount,
    workers,
  };
}
