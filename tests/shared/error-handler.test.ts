import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@actions/core');

import { getErrorMessage, handleActionError } from '../../src/shared/lib/error-handler';

describe('error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(core.summary).addHeading = vi.fn().mockReturnThis();
    vi.mocked(core.summary).addCodeBlock = vi.fn().mockReturnThis();
    vi.mocked(core.summary).write = vi.fn().mockResolvedValue(undefined);
  });

  describe('getErrorMessage', () => {
    it.each<[unknown, string, string]>([
      [new Error('Something went wrong'), 'Something went wrong', 'Error object'],
      ['string error', 'string error', 'string'],
      [404, '404', 'number'],
      [null, 'null', 'null'],
      [undefined, 'undefined', 'undefined'],
      [{ code: 500 }, '[object Object]', 'object']
    ])('should return "%s" for %s', (input, expected) => {
      expect(getErrorMessage(input)).toBe(expected);
    });
  });

  describe('handleActionError', () => {
    it('should call core.error with message', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed'
      });

      expect(core.error).toHaveBeenCalledWith('Test Failed: Test error');
    });

    it('should set outputs when provided', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed',
        outputs: {
          'output-1': 'value-1',
          'output-2': 'value-2'
        }
      });

      expect(core.setOutput).toHaveBeenCalledWith('output-1', 'value-1');
      expect(core.setOutput).toHaveBeenCalledWith('output-2', 'value-2');
    });

    it('should call core.setFailed', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed'
      });

      expect(core.setFailed).toHaveBeenCalledWith('Test error');
    });

    it('should include context in error message when provided', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed',
        context: 'additional info'
      });

      expect(core.error).toHaveBeenCalledWith('Test Failed: Test error (Context: additional info)');
    });
  });
});
