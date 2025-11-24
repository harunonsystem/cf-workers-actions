import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { mapInputs, parseInputs, setOutputsValidated } from '../src/shared/validation';

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn()
}));

const mockGetInput = vi.mocked(core.getInput);
const mockSetFailed = vi.mocked(core.setFailed);
const mockSetOutput = vi.mocked(core.setOutput);

describe('Shared Validation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapInputs', () => {
    it('should convert dash-case to camelCase', () => {
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'worker-pattern': 'test-*',
          'api-token': 'token123',
          'account-id': 'account123'
        };
        return inputs[name] || '';
      });

      const result = mapInputs({
        'worker-pattern': { required: false },
        'api-token': { required: true },
        'account-id': { required: true }
      });

      expect(result).toEqual({
        workerPattern: 'test-*',
        apiToken: 'token123',
        accountId: 'account123'
      });
    });

    it('should apply default values when input is empty', () => {
      mockGetInput.mockReturnValue('');

      const result = mapInputs({
        'dry-run': { required: false, default: 'true' },
        timeout: { required: false, default: '30' }
      });

      expect(result).toEqual({
        dryRun: 'true',
        timeout: '30'
      });
    });

    it('should set undefined for missing inputs without defaults', () => {
      mockGetInput.mockReturnValue('');

      const result = mapInputs({
        'optional-field': { required: false }
      });

      expect(result).toEqual({
        optionalField: undefined
      });
    });
  });

  describe('parseInputs', () => {
    it('should parse valid inputs', () => {
      const schema = z.object({
        token: z.string().min(1),
        count: z.number().optional()
      });

      const result = parseInputs(schema, {
        token: 'test-token',
        count: 5
      });

      expect(result).toEqual({
        token: 'test-token',
        count: 5
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should return null and call setFailed on validation error', () => {
      const schema = z.object({
        token: z.string().min(1, 'Token required')
      });

      const result = parseInputs(schema, {
        token: ''
      });

      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
      expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('Token required'));
    });

    it('should handle multiple validation errors', () => {
      const schema = z.object({
        token: z.string().min(1, 'Token required'),
        count: z.number().min(1, 'Count must be positive')
      });

      const result = parseInputs(schema, {
        token: '',
        count: 0
      });

      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });
  });

  describe('setOutputsValidated', () => {
    it('should set valid outputs', () => {
      const schema = z.object({
        result: z.string(),
        count: z.number().optional()
      });

      const outputs = {
        result: 'success',
        count: 42
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('result', 'success');
      expect(mockSetOutput).toHaveBeenCalledWith('count', '42');
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should set empty string for undefined values', () => {
      const schema = z.object({
        optional: z.string().optional(),
        nullable: z.string().nullable()
      });

      const outputs = {
        optional: undefined,
        nullable: null
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('optional', '');
      expect(mockSetOutput).toHaveBeenCalledWith('nullable', '');
    });

    it('should stringify object values', () => {
      const schema = z.object({
        data: z.object({ key: z.string() })
      });

      const outputs = {
        data: { key: 'value' }
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('data', JSON.stringify({ key: 'value' }));
    });

    it('should convert values to strings', () => {
      const schema = z.object({
        text: z.string(),
        boolean: z.boolean(),
        number: z.number()
      });

      const outputs = {
        text: 'hello',
        boolean: true,
        number: 123
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('text', 'hello');
      expect(mockSetOutput).toHaveBeenCalledWith('boolean', 'true');
      expect(mockSetOutput).toHaveBeenCalledWith('number', '123');
    });

    it('should call setFailed on validation error', () => {
      const schema = z.object({
        token: z.string().min(1, 'Token required')
      });

      const outputs = {
        token: ''
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Output validation failed')
      );
    });

    it('should handle array values', () => {
      const schema = z.object({
        items: z.array(z.string())
      });

      const outputs = {
        items: ['a', 'b', 'c']
      };

      setOutputsValidated(schema, outputs);

      expect(mockSetOutput).toHaveBeenCalledWith('items', JSON.stringify(['a', 'b', 'c']));
    });
  });
});
