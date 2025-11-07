'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            }
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.CloudflareApi = void 0;
const core = __importStar(require('@actions/core'));
/**
 * Cloudflare API client wrapper
 */
class CloudflareApi {
  apiToken;
  accountId;
  baseUrl = 'https://api.cloudflare.com/client/v4';
  constructor(apiToken, accountId) {
    if (!apiToken || !accountId) {
      throw new Error('API token and account ID are required');
    }
    this.apiToken = apiToken;
    this.accountId = accountId;
  }
  /**
   * Make API request to Cloudflare
   */
  async makeRequest(method, endpoint, data) {
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
  async listWorkers() {
    const response = await this.makeRequest('GET', `/accounts/${this.accountId}/workers/scripts`);
    return response.result || [];
  }
  /**
   * Get worker details
   */
  async getWorker(workerName) {
    try {
      const response = await this.makeRequest(
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
  async deleteWorker(workerName) {
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
exports.CloudflareApi = CloudflareApi;
