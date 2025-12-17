import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseCommaSeparatedList, sleep } from '../../src/shared/lib/string-utils';

describe('string-utils', () => {
  describe('parseCommaSeparatedList', () => {
    it.each([
      ['one,two,three', ['one', 'two', 'three'], 'comma-separated string'],
      ['  one  ,  two  ,  three  ', ['one', 'two', 'three'], 'whitespace trimming'],
      ['one,,two,,,three', ['one', 'two', 'three'], 'empty strings filtered'],
      ['', [], 'empty string'],
      [',,,', [], 'only commas'],
      ['   ', [], 'only spaces'],
      ['single', ['single'], 'single item'],
      ['worker-1,worker-2,worker-3', ['worker-1', 'worker-2', 'worker-3'], 'hyphens and numbers'],
      ['one, two,  three,   four', ['one', 'two', 'three', 'four'], 'mixed whitespace']
    ])('should parse "%s" correctly (%s)', (input, expected) => {
      expect(parseCommaSeparatedList(input)).toEqual(expected);
    });
  });

  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should resolve after specified milliseconds', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before specified time', () => {
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

    it('should work with zero milliseconds', async () => {
      const promise = sleep(0);
      vi.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
