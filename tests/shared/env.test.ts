import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../src/shared/lib/env';

describe('env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ACTIONS_STEP_DEBUG;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REF;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isTest', () => {
    it.each([
      ['test', true],
      ['production', false],
      [undefined, false]
    ])('should return %s when NODE_ENV is %s', (value, expected) => {
      if (value === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = value;
      }
      expect(env.isTest()).toBe(expected);
    });
  });

  describe('isDebug', () => {
    it.each([
      ['true', true],
      ['false', false],
      ['1', false],
      [undefined, false]
    ])('should return %s when ACTIONS_STEP_DEBUG is %s', (value, expected) => {
      if (value === undefined) {
        delete process.env.ACTIONS_STEP_DEBUG;
      } else {
        process.env.ACTIONS_STEP_DEBUG = value;
      }
      expect(env.isDebug()).toBe(expected);
    });
  });

  describe('githubToken', () => {
    it.each([
      ['ghp_test123', 'ghp_test123'],
      [undefined, undefined]
    ])('should return %s when GITHUB_TOKEN is %s', (value, expected) => {
      if (value === undefined) {
        delete process.env.GITHUB_TOKEN;
      } else {
        process.env.GITHUB_TOKEN = value;
      }
      expect(env.githubToken()).toBe(expected);
    });
  });

  describe('githubHeadRef', () => {
    it.each([
      ['feature/awesome', 'feature/awesome'],
      [undefined, undefined]
    ])('should return %s when GITHUB_HEAD_REF is %s', (value, expected) => {
      if (value === undefined) {
        delete process.env.GITHUB_HEAD_REF;
      } else {
        process.env.GITHUB_HEAD_REF = value;
      }
      expect(env.githubHeadRef()).toBe(expected);
    });
  });

  describe('githubRef', () => {
    it.each([
      ['refs/heads/main', 'refs/heads/main'],
      ['refs/pull/123/merge', 'refs/pull/123/merge'],
      [undefined, undefined]
    ])('should return %s when GITHUB_REF is %s', (value, expected) => {
      if (value === undefined) {
        delete process.env.GITHUB_REF;
      } else {
        process.env.GITHUB_REF = value;
      }
      expect(env.githubRef()).toBe(expected);
    });
  });
});
