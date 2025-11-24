import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CloudflareApi } from '../../shared/lib/cloudflare-api';
import { run } from '../index';

global.fetch = vi.fn();

const coreMocks = vi.hoisted(() => ({
  __esModule: true,
  default: {},
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

// Mock @actions/core
vi.mock('@actions/core', () => coreMocks);

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
    // biome-ignore lint/complexity/useArrowFunction: Mock implementation must be a function to support 'new' operator
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === 'cloudflare-api-token') return 'token';
      if (name === 'cloudflare-account-id') return 'account';
      return '';
    });

    await run();

    expect(coreMocks.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Either worker-pattern or worker-names must be provided')
    );
  });

  test('should process specific worker names', async () => {
    const mockCf = {
      findWorkersByPattern: vi.fn(),
      deleteWorker: vi.fn()
    };
    // biome-ignore lint/complexity/useArrowFunction: Mock implementation must be a function to support 'new' operator
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === 'worker-names') return 'worker1,worker2';
      if (name === 'cloudflare-api-token') return 'token';
      if (name === 'cloudflare-account-id') return 'account';
      if (name === 'dry-run') return 'true';
      return '';
    });

    mockCf.findWorkersByPattern.mockResolvedValue([]);

    await run();

    expect(coreMocks.info).toHaveBeenCalledWith('Processing specific workers: worker1, worker2');
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      'dry-run-results',
      JSON.stringify(['worker1', 'worker2'])
    );
  });
});
