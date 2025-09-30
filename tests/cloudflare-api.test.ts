import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CloudflareApi } from '../src/shared/lib/cloudflare-api';

// Mock fetch globally
global.fetch = vi.fn();

describe('CloudflareApi', () => {
  let api: CloudflareApi;
  const mockApiToken = 'test-token';
  const mockAccountId = 'test-account';

  beforeEach(() => {
    api = new CloudflareApi(mockApiToken, mockAccountId);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with valid credentials', () => {
      expect(api).toBeDefined();
    });

    test('should throw error for missing API token', () => {
      expect(() => new CloudflareApi('', mockAccountId)).toThrow(
        'API token and account ID are required'
      );
    });

    test('should throw error for missing account ID', () => {
      expect(() => new CloudflareApi(mockApiToken, '')).toThrow(
        'API token and account ID are required'
      );
    });
  });

  describe('makeRequest', () => {
    test('should make successful GET request', async () => {
      const mockResponse = {
        success: true,
        result: { id: 'test-worker' }
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });

      const result = await api.makeRequest('GET', '/test-endpoint');

      expect(fetch).toHaveBeenCalledWith('https://api.cloudflare.com/client/v4/test-endpoint', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual(mockResponse);
    });

    test('should make successful POST request with data', async () => {
      const mockResponse = { success: true };
      const testData = { name: 'test' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse)
      });

      await api.makeRequest('POST', '/test-endpoint', testData);

      expect(fetch).toHaveBeenCalledWith('https://api.cloudflare.com/client/v4/test-endpoint', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
    });

    test('should throw error for HTTP error response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'Invalid token' }]
        })
      });

      await expect(api.makeRequest('GET', '/test-endpoint')).rejects.toThrow(
        'Cloudflare API error: Invalid token'
      );
    });

    test('should throw error for API error response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: false,
          errors: [{ message: 'Worker not found' }]
        })
      });

      await expect(api.makeRequest('GET', '/test-endpoint')).rejects.toThrow(
        'Cloudflare API error: Worker not found'
      );
    });

    test('should handle network error when fetch throws', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(api.makeRequest('GET', '/test-endpoint')).rejects.toThrow('Network error');
    });

    test('should handle non-JSON response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValueOnce(new Error('Unexpected token'))
      });

      await expect(api.makeRequest('GET', '/test-endpoint')).rejects.toThrow('Unexpected token');
    });

    test('should handle malformed error response without errors array', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValueOnce({
          success: false
        })
      });

      await expect(api.makeRequest('GET', '/test-endpoint')).rejects.toThrow(
        'Cloudflare API error: Internal Server Error'
      );
    });
  });

  describe('listWorkers', () => {
    test('should return list of workers', async () => {
      const mockWorkers = [{ id: 'worker1' }, { id: 'worker2' }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers
        })
      });

      const result = await api.listWorkers();

      expect(result).toEqual(mockWorkers);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${mockAccountId}/workers/scripts`,
        expect.any(Object)
      );
    });
  });

  describe('deleteWorker', () => {
    test('should successfully delete worker', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true
        })
      });

      const result = await api.deleteWorker('test-worker');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${mockAccountId}/workers/scripts/test-worker`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('should return false for non-existent worker', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'not found' }]
        })
      });

      const result = await api.deleteWorker('non-existent-worker');

      expect(result).toBe(false);
    });
  });

  describe('getWorker', () => {
    test('should return worker when found', async () => {
      const mockWorker = { id: 'test-worker', script: 'console.log("test")' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorker
        })
      });

      const result = await api.getWorker('test-worker');
      expect(result).toEqual(mockWorker);
    });

    test('should return null for 404 error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'not found' }]
        })
      });

      const result = await api.getWorker('non-existent-worker');
      expect(result).toBeNull();
    });

    test('should rethrow non-404 errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'Invalid token' }]
        })
      });

      await expect(api.getWorker('test-worker')).rejects.toThrow(
        'Cloudflare API error: Invalid token'
      );
    });
  });

  describe('findWorkersByPattern', () => {
    beforeEach(() => {
      const mockWorkers = [
        { id: 'project-pr-123' },
        { id: 'project-pr-456' },
        { id: 'project-main' },
        { id: 'other-worker' }
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers
        })
      });
    });

    test('should find workers matching wildcard pattern', async () => {
      const result = await api.findWorkersByPattern('project-pr-*');

      expect(result).toEqual(['project-pr-123', 'project-pr-456']);
    });

    test('should return all workers for * pattern', async () => {
      const result = await api.findWorkersByPattern('*');

      expect(result).toEqual(['project-pr-123', 'project-pr-456', 'project-main', 'other-worker']);
    });

    test('should find workers matching specific pattern', async () => {
      const result = await api.findWorkersByPattern('project-main');

      expect(result).toEqual(['project-main']);
    });

    test('should return empty array for no matches', async () => {
      const result = await api.findWorkersByPattern('nonexistent-*');

      expect(result).toEqual([]);
    });
  });
});
