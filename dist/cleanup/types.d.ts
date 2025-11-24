export interface CleanupInputs {
    workerPattern?: string;
    workerNames?: string[];
    cloudflareApiToken: string;
    cloudflareAccountId: string;
    dryRun: boolean;
    exclude?: string;
}
export interface CleanupOutputs {
    deletedWorkers?: string[];
    deletedCount?: number;
    skippedWorkers?: string[];
    dryRunResults?: string[];
}
