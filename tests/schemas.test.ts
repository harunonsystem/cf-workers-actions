import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleanupInputSchema, CleanupOutputSchema } from '../src/shared/schemas';
import { parseInputs, setOutputsValidated } from '../src/shared/validation';
import * as core from '@actions/core';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  setOutput: vi.fn()
}));

const mockSetFailed = vi.mocked(core.setFailed);
const mockSetOutput = vi.mocked(core.setOutput);

describe('Schemas', () => {
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
