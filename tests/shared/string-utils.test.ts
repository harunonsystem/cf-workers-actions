import { beforeEach, describe, expect, test, vi } from 'vitest';

import { parseCommaSeparatedList, sleep } from '../../src/shared/lib/string-utils';

describe('string-utils', () => {
  describe('parseCommaSeparatedList', () => {
    test('should parse comma-separated string', () => {
      const result = parseCommaSeparatedList('one,two,three');
      expect(result).toEqual(['one', 'two', 'three']);
    });

    test('should trim whitespace', () => {
      const result = parseCommaSeparatedList('  one  ,  two  ,  three  ');
      expect(result).toEqual(['one', 'two', 'three']);
    });

    test('should filter out empty strings', () => {
      const result = parseCommaSeparatedList('one,,two,,,three');
      expect(result).toEqual(['one', 'two', 'three']);
    });

    test('should handle empty string', () => {
      const result = parseCommaSeparatedList('');
      expect(result).toEqual([]);
    });

    test('should handle string with only commas', () => {
      const result = parseCommaSeparatedList(',,,');
      expect(result).toEqual([]);
    });

    test('should handle string with only spaces', () => {
      const result = parseCommaSeparatedList('   ');
      expect(result).toEqual([]);
    });

    test('should handle single item', () => {
      const result = parseCommaSeparatedList('single');
      expect(result).toEqual(['single']);
    });

    test('should handle items with hyphens and numbers', () => {
      const result = parseCommaSeparatedList('worker-1,worker-2,worker-3');
      expect(result).toEqual(['worker-1', 'worker-2', 'worker-3']);
    });

    test('should handle mixed whitespace', () => {
      const result = parseCommaSeparatedList('one, two,  three,   four');
      expect(result).toEqual(['one', 'two', 'three', 'four']);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    test('should resolve after specified milliseconds', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    test('should not resolve before specified time', () => {
      const promise = sleep(1000);

      // Advance only 500ms
      vi.advanceTimersByTime(500);

      // Promise should still be pending (not resolved)
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      // Now advance the remaining time
      vi.advanceTimersByTime(500);
    });

    test('should work with zero milliseconds', async () => {
      const promise = sleep(0);
      vi.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
