import * as core from '@actions/core';
import type { CloudflareApiResponse, CloudflareWorker } from '../types';

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
      core.debug(`Making ${method} request to ${url}`);
      const response = await fetch(url, options);
      const result: CloudflareApiResponse<T> = await response.json();

      if (!response.ok) {
        const errorMessage = result.errors?.[0]?.message || response.statusText;
        throw new Error(`Cloudflare API error: ${errorMessage}`);
      }

      if (!result.success) {
        const errorMessage = result.errors?.[0]?.message || 'Unknown error';
        throw new Error(`Cloudflare API error: ${errorMessage}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.error(`Cloudflare API request failed: ${errorMessage}`);
      throw error;
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete worker
   */
  async deleteWorker(workerName: string): Promise<boolean> {
    try {
      await this.makeRequest('DELETE', `/accounts/${this.accountId}/workers/scripts/${workerName}`);
      core.info(`Successfully deleted worker: ${workerName}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        core.warning(`Worker not found: ${workerName}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Find workers matching pattern
   */
  async findWorkersByPattern(pattern: string): Promise<string[]> {
    const workers = await this.listWorkers();

    if (!pattern || pattern === '*') {
      return workers.map((w) => w.id);
    }

    // Convert pattern to regex
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    return workers.map((w) => w.id).filter((name) => regex.test(name));
  }
}
