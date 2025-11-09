import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as core from '@actions/core';
import { CloudflareApi } from '../../shared/lib/cloudflare-api';

global.fetch = vi.fn();

// Mock @actions/core
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  summary: {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    addList: vi.fn().mockReturnThis(),
    addCodeBlock: vi.fn().mockReturnThis(),
    write: vi.fn()
  }
}));

// Mock CloudflareApi
vi.mock('../../shared/lib/cloudflare-api');

describe('cleanup action integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should require either worker-pattern or worker-names', async () => {
    const mockCf = {
      findWorkersByPattern: vi.fn(),
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(() => mockCf);

    (core.getInput as any).mockImplementation((name: string) => {
      if (name === 'cloudflare-api-token') return 'token';
      if (name === 'cloudflare-account-id') return 'account';
      return '';
    });

    vi.resetModules();
    await import('../index');

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Either worker-pattern or worker-names must be provided')
    );
  });

  test('should process specific worker names', async () => {
    const mockCf = {
      findWorkersByPattern: vi.fn(),
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(() => mockCf);

    (core.getInput as any).mockImplementation((name: string) => {
      if (name === 'worker-names') return 'worker1,worker2';
      if (name === 'cloudflare-api-token') return 'token';
      if (name === 'cloudflare-account-id') return 'account';
      if (name === 'dry-run') return 'true';
      return '';
    });

    mockCf.findWorkersByPattern.mockResolvedValue([]);

    vi.resetModules();
    await import('../index');

    expect(core.info).toHaveBeenCalledWith('Processing specific workers: worker1, worker2');
    expect(core.setOutput).toHaveBeenCalledWith(
      'dry-run-results',
      JSON.stringify(['worker1', 'worker2'])
    );
  });
});
