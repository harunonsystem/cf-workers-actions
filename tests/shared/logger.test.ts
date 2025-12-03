import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debug, error, info, isDebugEnabled, warning } from '../../src/shared/lib/logger';

describe('logger', () => {
  const originalEnv = process.env.ACTIONS_STEP_DEBUG;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv === undefined) {
      delete process.env.ACTIONS_STEP_DEBUG;
    } else {
      process.env.ACTIONS_STEP_DEBUG = originalEnv;
    }
  });

  describe('isDebugEnabled', () => {
    it('should return true when ACTIONS_STEP_DEBUG is "true"', () => {
      process.env.ACTIONS_STEP_DEBUG = 'true';
      expect(isDebugEnabled()).toBe(true);
    });

    it('should return false when ACTIONS_STEP_DEBUG is "false"', () => {
      process.env.ACTIONS_STEP_DEBUG = 'false';
      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when ACTIONS_STEP_DEBUG is undefined', () => {
      delete process.env.ACTIONS_STEP_DEBUG;
      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when ACTIONS_STEP_DEBUG is any other value', () => {
      process.env.ACTIONS_STEP_DEBUG = '1';
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('debug', () => {
    it('should log when debug mode is enabled', () => {
      process.env.ACTIONS_STEP_DEBUG = 'true';
      const infoSpy = vi.spyOn(core, 'info');

      debug('Debug message');

      expect(infoSpy).toHaveBeenCalledWith('Debug message');
    });

    it('should not log when debug mode is disabled', () => {
      process.env.ACTIONS_STEP_DEBUG = 'false';
      const infoSpy = vi.spyOn(core, 'info');

      debug('Debug message');

      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('should not log when ACTIONS_STEP_DEBUG is undefined', () => {
      delete process.env.ACTIONS_STEP_DEBUG;
      const infoSpy = vi.spyOn(core, 'info');

      debug('Debug message');

      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should always log info messages', () => {
      const infoSpy = vi.spyOn(core, 'info');

      info('Info message');

      expect(infoSpy).toHaveBeenCalledWith('Info message');
    });
  });

  describe('warning', () => {
    it('should always log warning messages', () => {
      const warningSpy = vi.spyOn(core, 'warning');

      warning('Warning message');

      expect(warningSpy).toHaveBeenCalledWith('Warning message');
    });
  });

  describe('error', () => {
    it('should always log error messages', () => {
      const errorSpy = vi.spyOn(core, 'error');

      error('Error message');

      expect(errorSpy).toHaveBeenCalledWith('Error message');
    });
  });
});
