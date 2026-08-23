import { beforeEach, describe, expect, test, vi } from 'vitest';
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

  describe('request transport through worker operations', () => {
    test('should make successful GET request', async () => {
      const mockWorkers = [{ id: 'test-worker' }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({ success: true, result: mockWorkers })
      });

      const result = await api.listWorkers();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/test-account/workers/scripts',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        }
      );

      expect(result).toEqual(mockWorkers);
    });

    test('should throw error for HTTP error response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'Invalid token' }]
        })
      });

      await expect(api.listWorkers()).rejects.toThrow('Cloudflare API error: Invalid token');
    });

    test('should throw error for API error response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValueOnce({
          success: false,
          errors: [{ message: 'Worker not found' }]
        })
      });

      await expect(api.listWorkers()).rejects.toThrow('Cloudflare API error: Worker not found');
    });

    test('should handle network error when fetch throws', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listWorkers()).rejects.toThrow('Network error');
    });

    test('should handle non-JSON response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValueOnce(new Error('Unexpected token'))
      });

      await expect(api.listWorkers()).rejects.toThrow('Unexpected token');
    });

    test('should handle malformed error response without errors array', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValueOnce({
          success: false
        })
      });

      await expect(api.listWorkers()).rejects.toThrow(
        'Cloudflare API error: Internal Server Error'
      );
    });
  });

  test('should use an injected fetcher at the transport seam', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, result: [] })
    });
    const injectedApi = new CloudflareApi(mockApiToken, mockAccountId, fetcher);

    await injectedApi.listWorkers();

    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
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
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'This Worker does not exist on your account.' }]
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
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValueOnce({
          errors: [{ message: 'This Worker does not exist on your account.' }]
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
});
