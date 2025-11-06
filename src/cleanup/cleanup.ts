export interface CleanupOptions {
  mode: 'pr-linked' | 'manual' | 'batch' | 'batch-by-age';
  accountId: string;
  apiToken: string;

  // PR-linked mode
  prNumber?: number;
  workerNamePrefix?: string;

  // Manual mode
  workerNames?: string[];

  // Batch mode
  batchPattern?: string;
  excludeWorkers?: string[];

  // Batch-by-age mode
  maxAgeDays?: number;

  // Options
  dryRun?: boolean;
}

export interface CleanupResult {
  deleted: number;
  skipped: number;
  deletedNames: string[];
  errors: string[];
}

export interface CloudflareWorker {
  id: string;
  created_on: string;
}

/**
 * Build list of workers to delete for PR-linked mode
 */
export function buildPRLinkedList(
  prNumber: number,
  prefix: string = 'preview'
): string[] {
  return [`${prefix}-${prNumber}`];
}

/**
 * Build list of workers to delete for manual mode
 */
export function buildManualList(workerNames: string[]): string[] {
  return workerNames.map(name => name.trim()).filter(name => name.length > 0);
}

/**
 * Build list of workers to delete for batch mode
 */
export function buildBatchList(
  allWorkers: string[],
  pattern: string,
  excludeList: string[] = []
): string[] {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');

  const regex = new RegExp(`^${regexPattern}$`);

  // Filter workers by pattern
  let matched = allWorkers.filter(worker => regex.test(worker));

  // Apply exclusion list
  if (excludeList.length > 0) {
    const excludeSet = new Set(excludeList.map(name => name.trim()));
    matched = matched.filter(worker => !excludeSet.has(worker));
  }

  return matched;
}

/**
 * Build list of workers to delete for batch-by-age mode
 */
export function buildBatchByAgeList(
  allWorkers: CloudflareWorker[],
  maxAgeDays: number,
  batchPattern?: string,
  excludeList: string[] = []
): string[] {
  const now = new Date();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  // Filter workers by age
  let matched = allWorkers.filter(worker => {
    const createdDate = new Date(worker.created_on);
    const age = now.getTime() - createdDate.getTime();
    return age > maxAgeMs;
  });

  // Apply pattern filter if provided
  if (batchPattern) {
    const regexPattern = batchPattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
    const regex = new RegExp(`^${regexPattern}$`);
    matched = matched.filter(worker => regex.test(worker.id));
  }

  // Apply exclusion list
  if (excludeList.length > 0) {
    const excludeSet = new Set(excludeList.map(name => name.trim()));
    matched = matched.filter(worker => !excludeSet.has(worker.id));
  }

  return matched.map(worker => worker.id);
}

/**
 * Fetch all workers from Cloudflare API (with metadata)
 */
export async function fetchAllWorkersWithMetadata(
  accountId: string,
  apiToken: string
): Promise<CloudflareWorker[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workers: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('Cloudflare API returned error');
  }

  return data.result as CloudflareWorker[];
}

/**
 * Fetch all workers from Cloudflare API (names only)
 */
export async function fetchAllWorkers(
  accountId: string,
  apiToken: string
): Promise<string[]> {
  const workers = await fetchAllWorkersWithMetadata(accountId, apiToken);
  return workers.map(worker => worker.id);
}

/**
 * Check if a worker exists
 */
export async function workerExists(
  workerName: string,
  accountId: string,
  apiToken: string
): Promise<boolean> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.success === true;
}

/**
 * Delete a single worker
 */
export async function deleteWorker(
  workerName: string,
  accountId: string,
  apiToken: string
): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    const errorMsg =
      data.errors?.[0]?.message || `Failed to delete: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (!data.success) {
    const errorMsg = data.errors?.[0]?.message || 'Unknown error';
    throw new Error(errorMsg);
  }
}

/**
 * Process deletions for a list of workers
 */
export async function processDeleteions(
  workersList: string[],
  accountId: string,
  apiToken: string,
  dryRun: boolean = false
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deleted: 0,
    skipped: 0,
    deletedNames: [],
    errors: [],
  };

  for (const worker of workersList) {
    if (!worker) continue;

    console.log(`Processing: ${worker}`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would delete: ${worker}`);
      result.deleted++;
      result.deletedNames.push(worker);
      continue;
    }

    // Check if worker exists
    const exists = await workerExists(worker, accountId, apiToken);

    if (!exists) {
      console.log(`  ⚠️  Worker not found, skipping`);
      result.skipped++;
      continue;
    }

    // Delete worker
    try {
      await deleteWorker(worker, accountId, apiToken);
      console.log(`  ✅ Deleted successfully`);
      result.deleted++;
      result.deletedNames.push(worker);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Deletion failed: ${errorMsg}`);
      result.errors.push(`${worker}: ${errorMsg}`);
    }
  }

  return result;
}

/**
 * Main cleanup function
 */
export async function cleanupWorkers(
  options: CleanupOptions
): Promise<CleanupResult> {
  const {
    mode,
    accountId,
    apiToken,
    prNumber,
    workerNamePrefix = 'preview',
    workerNames,
    batchPattern,
    maxAgeDays,
    excludeWorkers = [],
    dryRun = false,
  } = options;

  let workersList: string[] = [];

  switch (mode) {
    case 'pr-linked':
      if (!prNumber) {
        throw new Error('PR number is required for pr-linked mode');
      }
      workersList = buildPRLinkedList(prNumber, workerNamePrefix);
      break;

    case 'manual':
      if (!workerNames || workerNames.length === 0) {
        throw new Error('Worker names are required for manual mode');
      }
      workersList = buildManualList(workerNames);
      break;

    case 'batch':
      if (!batchPattern) {
        throw new Error('Batch pattern is required for batch mode');
      }
      const allWorkers = await fetchAllWorkers(accountId, apiToken);
      workersList = buildBatchList(allWorkers, batchPattern, excludeWorkers);
      break;

    case 'batch-by-age':
      if (!maxAgeDays || maxAgeDays <= 0) {
        throw new Error('max-age-days must be a positive number for batch-by-age mode');
      }
      const allWorkersWithMetadata = await fetchAllWorkersWithMetadata(accountId, apiToken);
      workersList = buildBatchByAgeList(allWorkersWithMetadata, maxAgeDays, batchPattern, excludeWorkers);
      console.log(`Filtering workers older than ${maxAgeDays} days${batchPattern ? ` matching pattern: ${batchPattern}` : ''}`);
      break;

    default:
      throw new Error(`Invalid cleanup mode: ${mode}`);
  }

  if (workersList.length === 0) {
    console.log('No workers found to delete');
    return {
      deleted: 0,
      skipped: 0,
      deletedNames: [],
      errors: [],
    };
  }

  console.log('Found workers to process:');
  workersList.forEach(worker => console.log(`  - ${worker}`));
  console.log('');

  return await processDeleteions(workersList, accountId, apiToken, dryRun);
}
