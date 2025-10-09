import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentInputSchema, CommentOutputSchema } from '../src/shared/schemas';
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

  describe('CommentInputSchema', () => {
    it('should parse valid inputs', () => {
      const raw = {
        deploymentUrl: 'https://example.com',
        deploymentStatus: 'success',
        workerName: 'test-worker',
        githubToken: 'token123',
        customMessage: 'Test message',
        commentTemplate: 'Template',
        updateExisting: true,
        commentTag: 'test-tag'
      };
      const result = parseInputs(CommentInputSchema, raw);
      expect(result).toEqual({
        deploymentUrl: 'https://example.com',
        deploymentStatus: 'success',
        workerName: 'test-worker',
        githubToken: 'token123',
        customMessage: 'Test message',
        commentTemplate: 'Template',
        updateExisting: true,
        commentTag: 'test-tag'
      });
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should fail on invalid URL', () => {
      const raw = {
        deploymentUrl: 'invalid-url',
        deploymentStatus: 'success',
        githubToken: 'token123'
      };
      const result = parseInputs(CommentInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });

    it('should fail on empty githubToken', () => {
      const raw = {
        deploymentUrl: 'https://example.com',
        deploymentStatus: 'success',
        githubToken: ''
      };
      const result = parseInputs(CommentInputSchema, raw);
      expect(result).toBeNull();
      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Input validation failed')
      );
    });
  });

  describe('CommentOutputSchema', () => {
    it('should validate outputs', () => {
      const outputs = {
        commentId: '123',
        commentUrl: 'https://github.com'
      };
      expect(() => setOutputsValidated(CommentOutputSchema, outputs)).not.toThrow();
    });

    it('should handle valid outputs', () => {
      const outputs = {
        commentId: '123',
        commentUrl: 'https://github.com'
      };
      expect(() => setOutputsValidated(CommentOutputSchema, outputs)).not.toThrow();
    });
  });
});
