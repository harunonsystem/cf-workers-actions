import * as core from '@actions/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

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
    test('should extract message from Error object', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    test('should convert string to string', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    test('should convert number to string', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    test('should convert null to string', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    test('should convert undefined to string', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    test('should convert object to string', () => {
      expect(getErrorMessage({ code: 500 })).toBe('[object Object]');
    });
  });

  describe('handleActionError', () => {
    test('should call core.error with message', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed'
      });

      expect(core.error).toHaveBeenCalledWith('Test Failed: Test error');
    });

    test('should set outputs when provided', async () => {
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

    test('should call core.setFailed', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed'
      });

      expect(core.setFailed).toHaveBeenCalledWith('Test error');
    });

    test('should include context in error message when provided', async () => {
      await handleActionError(new Error('Test error'), {
        summaryTitle: 'Test Failed',
        context: 'additional info'
      });

      expect(core.error).toHaveBeenCalledWith('Test Failed: Test error (Context: additional info)');
    });
  });
});
