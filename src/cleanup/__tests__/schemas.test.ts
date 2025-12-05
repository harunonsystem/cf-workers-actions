import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseInputs, setOutputsValidated } from '../../shared/validation';
import { CleanupInputSchema, CleanupOutputSchema } from '../schemas';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  setOutput: vi.fn()
}));

const mockSetFailed = vi.mocked(core.setFailed);
const mockSetOutput = vi.mocked(core.setOutput);

describe('Cleanup Schemas', () => {
  beforeEach(() => {
    mockSetFailed.mockClear();
    mockSetOutput.mockClear();
  });

  describe('CleanupInputSchema', () => {
    it('should parse valid inputs with worker pattern', () => {
      const raw = {
        workerPattern: 'test-*',
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toEqual({
        workerPattern: 'test-*',
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should fail on missing required cloudflareApiToken', () => {
      const raw = {
        workerPattern: 'test-*',
        cloudflareAccountId: 'account123'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should fail on missing required cloudflareAccountId', () => {
      const raw = {
        workerPattern: 'test-*',
        cloudflareApiToken: 'token123'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should parse valid inputs with worker names', () => {
      const raw = {
        workerNames: ['worker1', 'worker2'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: false
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toEqual({
        workerNames: ['worker1', 'worker2'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: false
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should fail when neither worker-pattern nor worker-names is provided', () => {
      const raw = {
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'Either (worker-names or worker-prefix+worker-numbers) or worker-pattern must be provided'
        )
      );
    });

    it('should fail when both worker-pattern and worker-names are provided', () => {
      const raw = {
        workerPattern: 'test-*',
        workerNames: ['worker1', 'worker2'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'Either (worker-names or worker-prefix+worker-numbers) or worker-pattern must be provided'
        )
      );
    });
  });

  describe('CleanupOutputSchema', () => {
    it('should validate cleanup outputs', () => {
      const outputs = {
        deletedWorkers: ['worker1', 'worker2'],
        deletedCount: 2,
        skippedWorkers: [],
        dryRunResults: []
      };
      expect(() => setOutputsValidated(CleanupOutputSchema, outputs)).not.toThrow();
    });

    it('should handle empty cleanup outputs', () => {
      const outputs = {
        deletedWorkers: [],
        deletedCount: 0,
        skippedWorkers: [],
        dryRunResults: []
      };
      expect(() => setOutputsValidated(CleanupOutputSchema, outputs)).not.toThrow();
    });
  });
});
