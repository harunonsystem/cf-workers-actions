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
export declare function deleteWorker(workerName: string, apiToken: string, accountId: string): Promise<'success' | 'not-found' | 'error'>;
/**
 * Build list of worker names to delete
 */
export declare function buildWorkerList(options: CleanupOptions): string[];
/**
 * Main cleanup function
 */
export declare function cleanup(options: CleanupOptions): Promise<CleanupResult>;
//# sourceMappingURL=index.d.ts.map