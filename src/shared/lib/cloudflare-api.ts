import type { CloudflareApiResponse, CloudflareWorker } from '../schemas';
import { getErrorMessage } from './error-handler';
import { debug, error, info, warning } from './logger';

/**
 * Error thrown by CloudflareApi.makeRequest, carrying the HTTP status code
 * so callers can branch on status (e.g. 404 = not found) instead of message text.
 */
export class CloudflareApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CloudflareApiError';
    this.status = status;
  }
}

/**
 * Cloudflare API client wrapper
 */
export class CloudflareApi {
  private apiToken: string;
  private accountId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(apiToken: string, accountId: string) {
    if (!apiToken || !accountId) {
      throw new Error('API token and account ID are required');
    }

    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  /**
   * Make API request to Cloudflare
   */
  async makeRequest<T = any>(
    method: string,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<CloudflareApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      debug(`Making ${method} request to ${url}`);
      const response = await fetch(url, options);
      const result: CloudflareApiResponse<T> = await response.json();

      if (!response.ok) {
        const errorMessage = result.errors?.[0]?.message || response.statusText;
        throw new CloudflareApiError(`Cloudflare API error: ${errorMessage}`, response.status);
      }

      if (!result.success) {
        const errorMessage = result.errors?.[0]?.message || 'Unknown error';
        throw new CloudflareApiError(`Cloudflare API error: ${errorMessage}`, response.status);
      }

      return result;
    } catch (err) {
      error(`Cloudflare API request failed: ${getErrorMessage(err)}`);
      throw err;
    }
  }

  /**
   * List workers in account
   */
  async listWorkers(): Promise<CloudflareWorker[]> {
    const response = await this.makeRequest<CloudflareWorker[]>(
      'GET',
      `/accounts/${this.accountId}/workers/scripts`
    );
    return response.result || [];
  }

  /**
   * Get worker details
   */
  async getWorker(workerName: string): Promise<CloudflareWorker | null> {
    try {
      const response = await this.makeRequest<CloudflareWorker>(
        'GET',
        `/accounts/${this.accountId}/workers/scripts/${workerName}`
      );
      return response.result || null;
    } catch (err) {
      if (err instanceof CloudflareApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Delete worker
   */
  async deleteWorker(workerName: string): Promise<boolean> {
    try {
      await this.makeRequest('DELETE', `/accounts/${this.accountId}/workers/scripts/${workerName}`);
      info(`Successfully deleted worker: ${workerName}`);
      return true;
    } catch (err) {
      if (err instanceof CloudflareApiError && err.status === 404) {
        warning(`Worker not found: ${workerName}`);
        return false;
      }
      throw err;
    }
  }
}
