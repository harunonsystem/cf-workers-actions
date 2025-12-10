import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { parseInputs, setOutputsValidated } from '../../shared/validation';
import { CleanupInputSchema, CleanupOutputSchema } from '../schemas';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  setOutput: vi.fn()
}));

const mockSetFailed = vi.mocked(core.setFailed);
const mockSetOutput = vi.mocked(core.setOutput);

type CleanupInput = z.input<typeof CleanupInputSchema>;
type CleanupOutput = z.input<typeof CleanupOutputSchema>;

describe('Cleanup Schemas', () => {
  beforeEach(() => {
    mockSetFailed.mockClear();
    mockSetOutput.mockClear();
  });

  describe('CleanupInputSchema', () => {
    it('should parse valid inputs with worker names', () => {
      const raw: CleanupInput = {
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

    it('should fail on missing required cloudflareApiToken', () => {
      const raw: Partial<CleanupInput> = {
        workerNames: ['test'],
        cloudflareAccountId: 'account123'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should fail on missing required cloudflareAccountId', () => {
      const raw: Partial<CleanupInput> = {
        workerNames: ['test'],
        cloudflareApiToken: 'token123'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should fail when workerNames is missing', () => {
      const raw: Partial<CleanupInput> = {
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should use default value for dryRun when not provided', () => {
      const raw: CleanupInput = {
        workerNames: ['worker1'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toEqual({
        workerNames: ['worker1'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        dryRun: true
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should accept optional exclude field', () => {
      const raw: CleanupInput = {
        workerNames: ['worker1'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        exclude: 'production,staging'
      };
      const result = parseInputs(CleanupInputSchema, raw);
      expect(result).toEqual({
        workerNames: ['worker1'],
        cloudflareApiToken: 'token123',
        cloudflareAccountId: 'account123',
        exclude: 'production,staging',
        dryRun: true
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('CleanupOutputSchema', () => {
    it('should validate cleanup outputs', () => {
      const outputs: CleanupOutput = {
        deletedWorkers: ['worker1', 'worker2'],
        deletedCount: 2,
        skippedWorkers: [],
        dryRunResults: []
      };
      expect(() => setOutputsValidated(CleanupOutputSchema, outputs)).not.toThrow();
    });

    it('should handle empty cleanup outputs', () => {
      const outputs: CleanupOutput = {
        deletedWorkers: [],
        deletedCount: 0,
        skippedWorkers: [],
        dryRunResults: []
      };
      expect(() => setOutputsValidated(CleanupOutputSchema, outputs)).not.toThrow();
    });
  });
});
