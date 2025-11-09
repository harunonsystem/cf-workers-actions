import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWorkerList, deleteWorker, cleanup } from '../src/cleanup/index.js';

describe('buildWorkerList', () => {
  it('should build list from worker names', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerNames: 'worker1,worker2,worker3',
    });

    expect(workers).toEqual(['worker1', 'worker2', 'worker3']);
  });

  it('should build list from PR number', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerPrefix: 'app-pr-',
      prNumber: '123',
    });

    expect(workers).toEqual(['app-pr-123']);
  });

  it('should build list from worker numbers', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerPrefix: 'app-pr-',
      workerNumbers: '1,2,3',
    });

    expect(workers).toEqual(['app-pr-1', 'app-pr-2', 'app-pr-3']);
  });

  it('should prioritize worker names over PR number', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerPrefix: 'app-pr-',
      workerNames: 'custom-worker',
      prNumber: '123',
    });

    expect(workers).toEqual(['custom-worker']);
  });

  it('should throw error when prefix missing with PR number', () => {
    expect(() =>
      buildWorkerList({
        apiToken: 'token',
        accountId: 'account',
        prNumber: '123',
      })
    ).toThrow('worker-prefix is required');
  });

  it('should throw error when prefix missing with worker numbers', () => {
    expect(() =>
      buildWorkerList({
        apiToken: 'token',
        accountId: 'account',
        workerNumbers: '1,2,3',
      })
    ).toThrow('worker-prefix is required');
  });

  it('should throw error when no worker specification provided', () => {
    expect(() =>
      buildWorkerList({
        apiToken: 'token',
        accountId: 'account',
      })
    ).toThrow('Must specify worker-names');
  });

  it('should trim whitespace from worker names', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerNames: ' worker1 , worker2 , worker3 ',
    });

    expect(workers).toEqual(['worker1', 'worker2', 'worker3']);
  });

  it('should filter out empty values', () => {
    const workers = buildWorkerList({
      apiToken: 'token',
      accountId: 'account',
      workerNames: 'worker1,,worker2,',
    });

    expect(workers).toEqual(['worker1', 'worker2']);
  });
});

describe('deleteWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete an existing worker', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    const result = await deleteWorker('test-worker', 'token', 'account');

    expect(result).toBe('success');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should return not-found for non-existent worker', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await deleteWorker('test-worker', 'token', 'account');

    expect(result).toBe('not-found');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return error on check failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await deleteWorker('test-worker', 'token', 'account');

    expect(result).toBe('error');
  });

  it('should return error on delete failure', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    const result = await deleteWorker('test-worker', 'token', 'account');

    expect(result).toBe('error');
  });

  it('should return error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const result = await deleteWorker('test-worker', 'token', 'account');

    expect(result).toBe('error');
  });
});

describe('cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should successfully clean up multiple workers', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 }) // check worker1
      .mockResolvedValueOnce({ ok: true, status: 200 }) // delete worker1
      .mockResolvedValueOnce({ ok: true, status: 200 }) // check worker2
      .mockResolvedValueOnce({ ok: true, status: 200 }); // delete worker2

    const result = await cleanup({
      apiToken: 'token',
      accountId: 'account',
      workerNames: 'worker1,worker2',
    });

    expect(result.deletedCount).toBe(2);
    expect(result.notFoundCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  it('should handle not-found workers', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 }) // worker1 not found
      .mockResolvedValueOnce({ ok: true, status: 200 }) // check worker2
      .mockResolvedValueOnce({ ok: true, status: 200 }); // delete worker2

    const result = await cleanup({
      apiToken: 'token',
      accountId: 'account',
      workerNames: 'worker1,worker2',
    });

    expect(result.deletedCount).toBe(1);
    expect(result.notFoundCount).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  it('should throw error when failOnError is true', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(
      cleanup({
        apiToken: 'token',
        accountId: 'account',
        workerNames: 'worker1',
        failOnError: true,
      })
    ).rejects.toThrow('Some operations failed');
  });

  it('should not throw error when failOnError is false', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await cleanup({
      apiToken: 'token',
      accountId: 'account',
      workerNames: 'worker1',
      failOnError: false,
    });

    expect(result.errorCount).toBe(1);
  });
});
