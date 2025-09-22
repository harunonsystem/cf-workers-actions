import core from '@actions/core';

/**
 * Cloudflare API client wrapper
 */
class CloudflareApi {
  constructor(apiToken, accountId) {
    if (!apiToken || !accountId) {
      throw new Error('API token and account ID are required');
    }

    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Make API request to Cloudflare
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request body data
   * @returns {Promise<object>} API response
   */
  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
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
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Cloudflare API error: ${result.errors?.[0]?.message || response.statusText}`
        );
      }

      if (!result.success) {
        throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
      }

      return result;
    } catch (error) {
      core.error(`Cloudflare API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * List workers in account
   * @returns {Promise<Array>} List of workers
   */
  async listWorkers() {
    const response = await this.makeRequest('GET', `/accounts/${this.accountId}/workers/scripts`);
    return response.result || [];
  }

  /**
   * Get worker details
   * @param {string} workerName - Worker name
   * @returns {Promise<object>} Worker details
   */
  async getWorker(workerName) {
    try {
      const response = await this.makeRequest(
        'GET',
        `/accounts/${this.accountId}/workers/scripts/${workerName}`
      );
      return response.result;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete worker
   * @param {string} workerName - Worker name to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorker(workerName) {
    try {
      await this.makeRequest('DELETE', `/accounts/${this.accountId}/workers/scripts/${workerName}`);
      core.info(`Successfully deleted worker: ${workerName}`);
      return true;
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        core.warning(`Worker not found: ${workerName}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Find workers matching pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Promise<Array>} Matching worker names
   */
  async findWorkersByPattern(pattern) {
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

export { CloudflareApi };
