import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WranglerClient } from '../src/shared/lib/wrangler';
import { exec } from '@actions/exec';

// Mock dependencies
vi.mock('@actions/core');
vi.mock('@actions/exec');

const mockExec = vi.mocked(exec);

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
      const mockOutput = 'Wrangler output';
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from(mockOutput));
        }
        return 0;
      });

      const result = await wrangler.execWrangler(['--version']);

      expect(result).toEqual({
        exitCode: 0,
        stdout: mockOutput,
        stderr: ''
      });

      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        ['wrangler', '--version'],
        expect.objectContaining({
          env: expect.objectContaining({
            CLOUDFLARE_API_TOKEN: mockApiToken,
            CLOUDFLARE_ACCOUNT_ID: mockAccountId
          })
        })
      );
    });

    it('should handle command failure', async () => {
      const mockError = 'Command failed';
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stderr) {
          options.listeners.stderr(Buffer.from(mockError));
        }
        return 1;
      });

      const result = await wrangler.execWrangler(['invalid-command']);

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: mockError
      });
    });

    it('should handle multiple stdout chunks and trim output', async () => {
      const chunks = ['Line 1\n', 'Line 2\n', '  Line 3  \n'];
      const expectedOutput = 'Line 1\nLine 2\n  Line 3';

      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stdout) {
          chunks.forEach((chunk) => {
            options.listeners!.stdout!(Buffer.from(chunk));
          });
        }
        return 0;
      });

      const result = await wrangler.execWrangler(['--version']);

      expect(result).toEqual({
        exitCode: 0,
        stdout: expectedOutput,
        stderr: ''
      });
    });

    it('should handle multiple stderr chunks and trim output', async () => {
      const errorChunks = ['  Error: ', 'Command failed\n', '  Details here  '];
      const expectedError = 'Error: Command failed\n  Details here';

      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stderr) {
          errorChunks.forEach((chunk) => {
            options.listeners!.stderr!(Buffer.from(chunk));
          });
        }
        return 1;
      });

      const result = await wrangler.execWrangler(['invalid-command']);

      expect(result).toEqual({
        exitCode: 1,
        stdout: '',
        stderr: expectedError
      });
    });
  });

  describe('checkWranglerAvailable', () => {
    it('should return true when wrangler is available', async () => {
      mockExec.mockResolvedValue(0);

      const result = await wrangler.checkWranglerAvailable();

      expect(result).toBe(true);
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
      environment: 'preview',
      secrets: { SECRET1: 'secret1' }
    };

    it('should deploy worker successfully', async () => {
      const mockOutput = 'Deployed to https://test-worker.example.workers.dev';

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

      expect(result).toEqual({
        success: true,
        workerName: 'test-worker',
        url: 'https://test-worker.example.workers.dev',
        output: mockOutput
      });
    });

    it('should handle deployment failure', async () => {
      // Mock secret setting to succeed, deployment to fail
      mockExec.mockResolvedValueOnce(0); // Secret setting
      mockExec.mockResolvedValueOnce(1); // Deployment failure

      const result = await wrangler.deployWorker(mockConfig);

      expect(result).toEqual({
        success: false,
        workerName: 'test-worker',
        output: '',
        error: ''
      });
    });

    it('should use default values for optional config', async () => {
      const minimalConfig = {
        workerName: 'test-worker'
      };

      mockExec.mockResolvedValue(0);

      const result = await wrangler.deployWorker(minimalConfig);

      expect(result.success).toBe(true);
      expect(result.workerName).toBe('test-worker');
    });

    it('should handle successful deployment without URL in output', async () => {
      const mockOutput = 'Deployment successful! Worker updated.';

      // Mock secret setting to succeed, deployment to succeed without URL
      mockExec.mockResolvedValueOnce(0); // Secret setting
      mockExec.mockImplementation(async (_command, _args, options) => {
        if (options?.listeners?.stdout) {
          options.listeners.stdout(Buffer.from(mockOutput));
        }
        return 0;
      });

      const result = await wrangler.deployWorker(mockConfig);

      expect(result).toEqual({
        success: true,
        workerName: 'test-worker',
        url: undefined,
        output: mockOutput
      });
    });

    it('should handle error during secret setting', async () => {
      mockExec.mockRejectedValueOnce(new Error('Secret setting failed'));

      const result = await wrangler.deployWorker(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Secret setting failed');
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

      await wrangler.setSecret('TEST_SECRET', 'secret-value', 'production');

      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        ['wrangler', 'secret', 'put', 'TEST_SECRET'],
        expect.objectContaining({
          input: Buffer.from('secret-value')
        })
      );
    });

    it('should throw error on failure', async () => {
      mockExec.mockResolvedValue(1);

      await expect(wrangler.setSecret('TEST_SECRET', 'secret-value')).rejects.toThrow(
        'Failed to set secret TEST_SECRET'
      );
    });
  });
});
