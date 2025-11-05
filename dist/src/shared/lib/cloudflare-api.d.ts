import { CloudflareApiResponse, CloudflareWorker } from '../types';
/**
 * Cloudflare API client wrapper
 */
export declare class CloudflareApi {
    private apiToken;
    private accountId;
    private baseUrl;
    constructor(apiToken: string, accountId: string);
    /**
     * Make API request to Cloudflare
     */
    makeRequest<T = any>(method: string, endpoint: string, data?: Record<string, any>): Promise<CloudflareApiResponse<T>>;
    /**
     * List workers in account
     */
    listWorkers(): Promise<CloudflareWorker[]>;
    /**
     * Get worker details
     */
    getWorker(workerName: string): Promise<CloudflareWorker | null>;
    /**
     * Delete worker
     */
    deleteWorker(workerName: string): Promise<boolean>;
    /**
     * Find workers matching pattern
     */
    findWorkersByPattern(pattern: string): Promise<string[]>;
}
