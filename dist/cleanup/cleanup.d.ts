export interface CleanupOptions {
    mode: 'pr-linked' | 'manual' | 'batch' | 'batch-by-age';
    accountId: string;
    apiToken: string;
    prNumber?: number;
    workerNamePrefix?: string;
    workerNames?: string[];
    batchPattern?: string;
    excludeWorkers?: string[];
    maxAgeDays?: number;
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
export declare function buildPRLinkedList(prNumber: number, prefix?: string): string[];
/**
 * Build list of workers to delete for manual mode
 */
export declare function buildManualList(workerNames: string[]): string[];
/**
 * Build list of workers to delete for batch mode
 */
export declare function buildBatchList(allWorkers: string[], pattern: string, excludeList?: string[]): string[];
/**
 * Build list of workers to delete for batch-by-age mode
 */
export declare function buildBatchByAgeList(allWorkers: CloudflareWorker[], maxAgeDays: number, batchPattern?: string, excludeList?: string[]): string[];
/**
 * Fetch all workers from Cloudflare API (with metadata)
 */
export declare function fetchAllWorkersWithMetadata(accountId: string, apiToken: string): Promise<CloudflareWorker[]>;
/**
 * Fetch all workers from Cloudflare API (names only)
 */
export declare function fetchAllWorkers(accountId: string, apiToken: string): Promise<string[]>;
/**
 * Check if a worker exists
 */
export declare function workerExists(workerName: string, accountId: string, apiToken: string): Promise<boolean>;
/**
 * Delete a single worker
 */
export declare function deleteWorker(workerName: string, accountId: string, apiToken: string): Promise<void>;
/**
 * Process deletions for a list of workers
 */
export declare function processDeleteions(workersList: string[], accountId: string, apiToken: string, dryRun?: boolean): Promise<CleanupResult>;
/**
 * Main cleanup function
 */
export declare function cleanupWorkers(options: CleanupOptions): Promise<CleanupResult>;
