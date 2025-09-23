import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WranglerClient } from '../src/shared/lib/wrangler';
import { exec } from '@actions/exec';
import { promises as fs } from 'fs';

// Mock dependencies
vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
    unlink: vi.fn()
  }
}));

const mockExec = vi.mocked(exec);
const mockFs = vi.mocked(fs);

describe('WranglerClient', () => {
  let wrangler: WranglerClient;
  const mockApiToken = 'test-api-token';
  const mockAccountId = 'test-account-id';

  beforeEach(() => {
    vi.clearAllMocks();
    wrangler = new WranglerClient(mockApiToken, mockAccountId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with valid credentials', () => {
      expect(wrangler).toBeInstanceOf(WranglerClient);
    });

    it('should throw error with missing api token', () => {
      expect(() => new WranglerClient('', mockAccountId)).toThrow(
        'API token and account ID are required'
      );
    });

    it('should throw error with missing account id', () => {
      expect(() => new WranglerClient(mockApiToken, '')).toThrow(
        'API token and account ID are required'
      );
    });
  });

  describe('execWrangler', () => {
    it('should execute wrangler command successfully', async () => {
      const mockStdout = 'wrangler output';
      const mockStderr = '';

      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from(mockStdout));
        }
        return 0;
      });

      const result = await wrangler.execWrangler(['--version']);

      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        ['wrangler', '--version'],
        expect.objectContaining({
          env: expect.objectContaining({
            CLOUDFLARE_API_TOKEN: mockApiToken,
            CLOUDFLARE_ACCOUNT_ID: mockAccountId
          }),
          ignoreReturnCode: true
        })
      );

      expect(result).toEqual({
        exitCode: 0,
        stdout: mockStdout,
        stderr: mockStderr
      });
    });

    it('should handle command failure', async () => {
      const mockStderr = 'error message';

      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stderr) {
          options.listeners.stderr(Buffer.from(mockStderr));
        }
        return 1;
      });

      const result = await wrangler.execWrangler(['invalid-command']);

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: mockStderr
      });
    });
  });

  describe('checkWranglerAvailable', () => {
    it('should return true when wrangler is available', async () => {
      mockExec.mockResolvedValue(0);

      const result = await wrangler.checkWranglerAvailable();

      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith('npx', ['wrangler', '--version'], expect.any(Object));
    });

    it('should return false when wrangler is not available', async () => {
      mockExec.mockResolvedValue(1);

      const result = await wrangler.checkWranglerAvailable();

      expect(result).toBe(false);
    });

    it('should return false when exec throws error', async () => {
      mockExec.mockRejectedValue(new Error('Command not found'));

      const result = await wrangler.checkWranglerAvailable();

      expect(result).toBe(false);
    });
  });

  describe('deployWorker', () => {
    const mockConfig = {
      workerName: 'test-worker',
      scriptPath: 'index.js',
      environment: 'preview',
      vars: { VAR1: 'value1' },
      secrets: { SECRET1: 'secret1' },
      compatibility_date: '2024-01-01'
    };

    it('should deploy worker successfully', async () => {
      const mockOutput = 'Deployed to https://test-worker.example.workers.dev';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      // Mock secret setting
      mockExec.mockResolvedValueOnce(0);
      // Mock deployment
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from(mockOutput));
        }
        return 0;
      });

      const result = await wrangler.deployWorker(mockConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('wrangler.toml'),
        expect.stringContaining('name = "test-worker"')
      );

      expect(result).toEqual({
        success: true,
        workerName: 'test-worker',
        url: 'https://test-worker.example.workers.dev',
        output: mockOutput
      });

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle deployment failure', async () => {
      const mockError = 'Deployment failed';

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      // Mock secret setting to fail first
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stderr) {
          options.listeners.stderr(Buffer.from(mockError));
        }
        return 1;
      });

      const result = await wrangler.deployWorker(mockConfig);

      expect(result).toEqual({
        success: false,
        workerName: 'test-worker',
        output: '',
        error: expect.stringContaining('Failed to set secret')
      });
    });

    it('should use default values for optional config', async () => {
      const minimalConfig = {
        workerName: 'test-worker'
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
      mockExec.mockResolvedValue(0);

      await wrangler.deployWorker(minimalConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('main = "index.js"')
      );
    });

    it('should clean up wrangler.toml even if deployment fails', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);
      mockExec.mockRejectedValue(new Error('Unexpected error'));

      const result = await wrangler.deployWorker(mockConfig);

      expect(result.success).toBe(false);
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('setSecret', () => {
    it('should set secret successfully', async () => {
      mockExec.mockResolvedValue(0);

      await wrangler.setSecret('TEST_SECRET', 'secret-value', 'preview');

      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        ['wrangler', 'secret', 'put', 'TEST_SECRET', '--env', 'preview'],
        expect.objectContaining({
          input: Buffer.from('secret-value')
        })
      );
    });

    it('should handle production environment', async () => {
      mockExec.mockResolvedValue(0);

      await wrangler.setSecret('TEST_SECRET', 'secret-value');

      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        ['wrangler', 'secret', 'put', 'TEST_SECRET'],
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      const mockError = 'Failed to set secret';
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stderr) {
          options.listeners.stderr(Buffer.from(mockError));
        }
        return 1;
      });

      await expect(wrangler.setSecret('TEST_SECRET', 'secret-value')).rejects.toThrow(
        'Failed to set secret TEST_SECRET: Failed to set secret'
      );
    });
  });
});
