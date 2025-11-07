import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildPRLinkedList,
  buildManualList,
  buildBatchList,
  buildBatchByAgeList,
  fetchAllWorkers,
  workerExists,
  deleteWorker,
  processDeleteions,
  cleanupWorkers
} from '../src/cleanup/cleanup';

// Mock fetch globally
global.fetch = vi.fn();

describe('workers-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildPRLinkedList', () => {
    it('should build worker name from PR number', () => {
      const result = buildPRLinkedList(123, 'myapp-preview');
      expect(result).toEqual(['myapp-preview-123']);
    });

    it('should use default prefix', () => {
      const result = buildPRLinkedList(42);
      expect(result).toEqual(['preview-42']);
    });
  });

  describe('buildManualList', () => {
    it('should trim and filter worker names', () => {
      const result = buildManualList([' worker1 ', 'worker2', '  worker3  ', '']);
      expect(result).toEqual(['worker1', 'worker2', 'worker3']);
    });

    it('should handle empty list', () => {
      const result = buildManualList([]);
      expect(result).toEqual([]);
    });
  });

  describe('buildBatchList', () => {
    const allWorkers = [
      'preview-pr-1',
      'preview-pr-2',
      'preview-pr-3',
      'production-main',
      'staging-develop'
    ];

    it('should match pattern with wildcard', () => {
      const result = buildBatchList(allWorkers, 'preview-*');
      expect(result).toEqual(['preview-pr-1', 'preview-pr-2', 'preview-pr-3']);
    });

    it('should exclude specified workers', () => {
      const result = buildBatchList(allWorkers, 'preview-*', ['preview-pr-2']);
      expect(result).toEqual(['preview-pr-1', 'preview-pr-3']);
    });

    it('should match exact pattern', () => {
      const result = buildBatchList(allWorkers, 'production-main');
      expect(result).toEqual(['production-main']);
    });

    it('should return empty array for non-matching pattern', () => {
      const result = buildBatchList(allWorkers, 'nonexistent-*');
      expect(result).toEqual([]);
    });
  });

  describe('buildBatchByAgeList', () => {
    const now = new Date('2024-02-01T00:00:00Z');

    // Mock Date.now() for consistent testing
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const allWorkersWithMetadata = [
      { id: 'old-worker-1', created_on: '2024-01-01T00:00:00Z' }, // 31 days old
      { id: 'old-worker-2', created_on: '2024-01-05T00:00:00Z' }, // 27 days old
      { id: 'recent-worker-1', created_on: '2024-01-25T00:00:00Z' }, // 7 days old
      { id: 'recent-worker-2', created_on: '2024-01-30T00:00:00Z' } // 2 days old
    ];

    it('should filter workers older than max age', () => {
      const result = buildBatchByAgeList(allWorkersWithMetadata, 14);
      expect(result).toEqual(['old-worker-1', 'old-worker-2']);
    });

    it('should filter workers with pattern', () => {
      const workersWithPattern = [
        { id: 'preview-old-1', created_on: '2024-01-01T00:00:00Z' },
        { id: 'preview-old-2', created_on: '2024-01-05T00:00:00Z' },
        { id: 'production-old', created_on: '2024-01-01T00:00:00Z' }
      ];

      const result = buildBatchByAgeList(workersWithPattern, 14, 'preview-*');
      expect(result).toEqual(['preview-old-1', 'preview-old-2']);
    });

    it('should exclude specified workers', () => {
      const result = buildBatchByAgeList(allWorkersWithMetadata, 14, undefined, ['old-worker-2']);
      expect(result).toEqual(['old-worker-1']);
    });

    it('should return empty array if no workers are old enough', () => {
      const result = buildBatchByAgeList(allWorkersWithMetadata, 60);
      expect(result).toEqual([]);
    });

    it('should combine pattern and exclude filters', () => {
      const workersWithPattern = [
        { id: 'preview-old-1', created_on: '2024-01-01T00:00:00Z' },
        { id: 'preview-old-2', created_on: '2024-01-05T00:00:00Z' },
        { id: 'preview-old-3', created_on: '2024-01-03T00:00:00Z' },
        { id: 'production-old', created_on: '2024-01-01T00:00:00Z' }
      ];

      const result = buildBatchByAgeList(workersWithPattern, 14, 'preview-*', ['preview-old-2']);
      expect(result).toEqual(['preview-old-1', 'preview-old-3']);
    });
  });

  describe('fetchAllWorkers', () => {
    it('should fetch workers from Cloudflare API', async () => {
      const mockResponse = {
        success: true,
        result: [
          { id: 'worker1', created_on: '2024-01-01' },
          { id: 'worker2', created_on: '2024-01-02' }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchAllWorkers('test-account', 'test-token');

      expect(result).toEqual(['worker1', 'worker2']);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/test-account/workers/scripts',
        {
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(fetchAllWorkers('test-account', 'bad-token')).rejects.toThrow(
        'Failed to fetch workers: Unauthorized'
      );
    });

    it('should throw error on unsuccessful response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      await expect(fetchAllWorkers('test-account', 'test-token')).rejects.toThrow(
        'Cloudflare API returned error'
      );
    });
  });

  describe('workerExists', () => {
    it('should return true if worker exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await workerExists('worker1', 'test-account', 'test-token');
      expect(result).toBe(true);
    });

    it('should return false if worker does not exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false
      });

      const result = await workerExists('worker1', 'test-account', 'test-token');
      expect(result).toBe(false);
    });

    it('should return false on unsuccessful response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      const result = await workerExists('worker1', 'test-account', 'test-token');
      expect(result).toBe(false);
    });
  });

  describe('deleteWorker', () => {
    it('should delete worker successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await expect(deleteWorker('worker1', 'test-account', 'test-token')).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/test-account/workers/scripts/worker1',
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-token'
          }
        }
      );
    });

    it('should throw error on deletion failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({
          errors: [{ message: 'Worker not found' }]
        })
      });

      await expect(deleteWorker('worker1', 'test-account', 'test-token')).rejects.toThrow(
        'Worker not found'
      );
    });

    it('should throw error on unsuccessful response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          errors: [{ message: 'Deletion failed' }]
        })
      });

      await expect(deleteWorker('worker1', 'test-account', 'test-token')).rejects.toThrow(
        'Deletion failed'
      );
    });
  });

  describe('processDeleteions', () => {
    it('should process deletions in dry run mode', async () => {
      const workersList = ['worker1', 'worker2', 'worker3'];

      const result = await processDeleteions(workersList, 'test-account', 'test-token', true);

      expect(result).toEqual({
        deleted: 3,
        skipped: 0,
        deletedNames: ['worker1', 'worker2', 'worker3'],
        errors: []
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should skip non-existent workers', async () => {
      const workersList = ['worker1', 'worker2'];

      // worker1 exists, worker2 does not
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: false
        });

      const result = await processDeleteions(workersList, 'test-account', 'test-token', false);

      expect(result.deleted).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.deletedNames).toEqual(['worker1']);
    });

    it('should handle deletion errors', async () => {
      const workersList = ['worker1'];

      // Worker exists but deletion fails
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            errors: [{ message: 'Permission denied' }]
          })
        });

      const result = await processDeleteions(workersList, 'test-account', 'test-token', false);

      expect(result.deleted).toBe(0);
      expect(result.errors).toEqual(['worker1: Permission denied']);
    });
  });

  describe('cleanupWorkers', () => {
    it('should cleanup in pr-linked mode', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await cleanupWorkers({
        mode: 'pr-linked',
        accountId: 'test-account',
        apiToken: 'test-token',
        prNumber: 123,
        workerNamePrefix: 'myapp-preview'
      });

      expect(result.deleted).toBe(1);
      expect(result.deletedNames).toEqual(['myapp-preview-123']);
    });

    it('should cleanup in manual mode', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await cleanupWorkers({
        mode: 'manual',
        accountId: 'test-account',
        apiToken: 'test-token',
        workerNames: ['worker1', 'worker2']
      });

      expect(result.deleted).toBe(2);
      expect(result.deletedNames).toEqual(['worker1', 'worker2']);
    });

    it('should cleanup in batch mode', async () => {
      // Mock fetchAllWorkers
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ id: 'preview-pr-1' }, { id: 'preview-pr-2' }, { id: 'production-main' }]
        })
      });

      // Mock worker existence and deletion for matched workers
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await cleanupWorkers({
        mode: 'batch',
        accountId: 'test-account',
        apiToken: 'test-token',
        batchPattern: 'preview-*'
      });

      expect(result.deleted).toBe(2);
      expect(result.deletedNames).toEqual(['preview-pr-1', 'preview-pr-2']);
    });

    it('should cleanup in batch-by-age mode', async () => {
      const now = new Date('2024-02-01T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      // Mock fetchAllWorkersWithMetadata
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [
            { id: 'old-worker-1', created_on: '2024-01-01T00:00:00Z' }, // 31 days old
            { id: 'old-worker-2', created_on: '2024-01-05T00:00:00Z' }, // 27 days old
            { id: 'recent-worker', created_on: '2024-01-25T00:00:00Z' } // 7 days old
          ]
        })
      });

      // Mock worker existence and deletion for old workers
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await cleanupWorkers({
        mode: 'batch-by-age',
        accountId: 'test-account',
        apiToken: 'test-token',
        maxAgeDays: 14
      });

      expect(result.deleted).toBe(2);
      expect(result.deletedNames).toEqual(['old-worker-1', 'old-worker-2']);

      vi.useRealTimers();
    });

    it('should cleanup in batch-by-age mode with pattern', async () => {
      const now = new Date('2024-02-01T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      // Mock fetchAllWorkersWithMetadata
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          result: [
            { id: 'myapp-pr-1', created_on: '2024-01-01T00:00:00Z' }, // 31 days old
            { id: 'myapp-pr-2', created_on: '2024-01-05T00:00:00Z' }, // 27 days old
            { id: 'production-old', created_on: '2024-01-01T00:00:00Z' } // 31 days old but different pattern
          ]
        })
      });

      // Mock worker existence and deletion for matched workers
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await cleanupWorkers({
        mode: 'batch-by-age',
        accountId: 'test-account',
        apiToken: 'test-token',
        maxAgeDays: 14,
        batchPattern: 'myapp-pr-*'
      });

      expect(result.deleted).toBe(2);
      expect(result.deletedNames).toEqual(['myapp-pr-1', 'myapp-pr-2']);

      vi.useRealTimers();
    });

    it('should throw error for missing required parameters', async () => {
      await expect(
        cleanupWorkers({
          mode: 'pr-linked',
          accountId: 'test-account',
          apiToken: 'test-token'
        })
      ).rejects.toThrow('PR number is required');

      await expect(
        cleanupWorkers({
          mode: 'manual',
          accountId: 'test-account',
          apiToken: 'test-token'
        })
      ).rejects.toThrow('Worker names are required');

      await expect(
        cleanupWorkers({
          mode: 'batch',
          accountId: 'test-account',
          apiToken: 'test-token'
        })
      ).rejects.toThrow('Batch pattern is required');

      await expect(
        cleanupWorkers({
          mode: 'batch-by-age',
          accountId: 'test-account',
          apiToken: 'test-token'
        })
      ).rejects.toThrow('max-age-days must be a positive number');
    });
  });
});
