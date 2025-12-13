import * as core from '@actions/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// @actions/core is mocked in vitest.setup.ts
vi.mock('../../shared/lib/logger', () => ({
  debug: vi.fn(),
  info: vi.fn()
}));

import {
  createExclusionFilter,
  filterWorkersByExclusion,
  parseWorkerNamesInput,
  setCleanupOutputs,
  setEmptyCleanupOutputs
} from '../utils';

describe('cleanup/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseWorkerNamesInput', () => {
    test('should parse worker names from workerNamesInput', () => {
      const result = parseWorkerNamesInput('worker-1, worker-2, worker-3', '', '');
      expect(result).toEqual(['worker-1', 'worker-2', 'worker-3']);
    });

    test('should generate names from prefix and numbers', () => {
      const result = parseWorkerNamesInput('', '1, 2, 3', 'app-preview-');
      expect(result).toEqual(['app-preview-1', 'app-preview-2', 'app-preview-3']);
    });

    test('should prioritize workerNamesInput over prefix+numbers', () => {
      const result = parseWorkerNamesInput('explicit-worker', '1, 2', 'prefix-');
      expect(result).toEqual(['explicit-worker']);
    });

    test('should return undefined when no valid input', () => {
      const result = parseWorkerNamesInput('', '', '');
      expect(result).toBeUndefined();
    });

    test('should return undefined when only prefix without numbers', () => {
      const result = parseWorkerNamesInput('', '', 'prefix-');
      expect(result).toBeUndefined();
    });

    test('should return undefined when only numbers without prefix', () => {
      const result = parseWorkerNamesInput('', '1, 2, 3', '');
      expect(result).toBeUndefined();
    });
  });

  describe('createExclusionFilter', () => {
    test('should return empty filter for undefined input', () => {
      const filter = createExclusionFilter(undefined);
      expect(filter.exactNames.size).toBe(0);
      expect(filter.patterns.length).toBe(0);
    });

    test('should return empty filter for empty string', () => {
      const filter = createExclusionFilter('');
      expect(filter.exactNames.size).toBe(0);
      expect(filter.patterns.length).toBe(0);
    });

    test('should parse exact names', () => {
      const filter = createExclusionFilter('worker-1, worker-2');
      expect(filter.exactNames.has('worker-1')).toBe(true);
      expect(filter.exactNames.has('worker-2')).toBe(true);
      expect(filter.patterns.length).toBe(0);
    });

    test('should parse glob patterns with *', () => {
      const filter = createExclusionFilter('prod-*, staging-*');
      expect(filter.exactNames.size).toBe(0);
      expect(filter.patterns.length).toBe(2);
      expect(filter.patterns[0].test('prod-worker')).toBe(true);
      expect(filter.patterns[1].test('staging-api')).toBe(true);
    });

    test('should parse glob patterns with ?', () => {
      const filter = createExclusionFilter('worker-?');
      expect(filter.patterns.length).toBe(1);
      expect(filter.patterns[0].test('worker-1')).toBe(true);
      expect(filter.patterns[0].test('worker-12')).toBe(false);
    });

    test('should handle mixed exact and patterns', () => {
      const filter = createExclusionFilter('exact-name, pattern-*');
      expect(filter.exactNames.has('exact-name')).toBe(true);
      expect(filter.patterns.length).toBe(1);
    });
  });

  describe('filterWorkersByExclusion', () => {
    test('should return empty array for empty workers', () => {
      const filter = createExclusionFilter('exclude-me');
      const result = filterWorkersByExclusion([], filter);
      expect(result).toEqual([]);
    });

    test('should filter by exact names', () => {
      const filter = createExclusionFilter('worker-2');
      const result = filterWorkersByExclusion(['worker-1', 'worker-2', 'worker-3'], filter);
      expect(result).toEqual(['worker-1', 'worker-3']);
    });

    test('should filter by patterns', () => {
      const filter = createExclusionFilter('prod-*');
      const result = filterWorkersByExclusion(['prod-api', 'prod-web', 'staging-api'], filter);
      expect(result).toEqual(['staging-api']);
    });

    test('should filter by both exact and patterns', () => {
      const filter = createExclusionFilter('exact-worker, temp-*');
      const result = filterWorkersByExclusion(
        ['exact-worker', 'temp-1', 'temp-2', 'keep-this'],
        filter
      );
      expect(result).toEqual(['keep-this']);
    });

    test('should return all workers if no exclusions match', () => {
      const filter = createExclusionFilter('non-existent');
      const result = filterWorkersByExclusion(['worker-1', 'worker-2'], filter);
      expect(result).toEqual(['worker-1', 'worker-2']);
    });
  });

  describe('setEmptyCleanupOutputs', () => {
    test('should set all outputs to empty values', () => {
      setEmptyCleanupOutputs();

      expect(core.setOutput).toHaveBeenCalledWith('deleted-workers', '[]');
      expect(core.setOutput).toHaveBeenCalledWith('deleted-count', '0');
      expect(core.setOutput).toHaveBeenCalledWith('skipped-workers', '[]');
      expect(core.setOutput).toHaveBeenCalledWith('dry-run-results', '[]');
    });
  });

  describe('setCleanupOutputs', () => {
    test('should set outputs for dry run mode', () => {
      setCleanupOutputs({ deletedWorkers: ['worker-1', 'worker-2'], skippedWorkers: [] }, true);

      expect(core.setOutput).toHaveBeenCalledWith('deleted-workers', '[]');
      expect(core.setOutput).toHaveBeenCalledWith('deleted-count', '0');
      expect(core.setOutput).toHaveBeenCalledWith('skipped-workers', '[]');
      expect(core.setOutput).toHaveBeenCalledWith(
        'dry-run-results',
        JSON.stringify(['worker-1', 'worker-2'])
      );
    });

    test('should set outputs for actual deletion mode', () => {
      setCleanupOutputs({ deletedWorkers: ['worker-1'], skippedWorkers: ['worker-2'] }, false);

      expect(core.setOutput).toHaveBeenCalledWith('deleted-workers', JSON.stringify(['worker-1']));
      expect(core.setOutput).toHaveBeenCalledWith('deleted-count', '1');
      expect(core.setOutput).toHaveBeenCalledWith('skipped-workers', JSON.stringify(['worker-2']));
      expect(core.setOutput).toHaveBeenCalledWith('dry-run-results', '[]');
    });
  });
});
