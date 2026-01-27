import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PrepareDeploymentOptions } from '../../src/shared/lib/deployment-utils';
import { prepareDeployment } from '../../src/shared/lib/deployment-utils';

// Mock dependencies
vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn()
}));

vi.mock('../../src/shared/lib/github-utils', () => ({
  getSanitizedBranchName: vi.fn(),
  getPrNumber: vi.fn()
}));

vi.mock('../../src/shared/lib/template-utils', () => ({
  processTemplate: vi.fn()
}));

vi.mock('../../src/shared/lib/wrangler-utils', () => ({
  updateWranglerToml: vi.fn()
}));

import * as core from '@actions/core';
import { getPrNumber, getSanitizedBranchName } from '../../src/shared/lib/github-utils';
import { processTemplate } from '../../src/shared/lib/template-utils';
import { updateWranglerToml } from '../../src/shared/lib/wrangler-utils';

describe('deployment-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareDeployment', () => {
    const defaultOptions: PrepareDeploymentOptions = {
      workerNameTemplate: 'preview-{branch-name}',
      environment: 'preview',
      domain: 'workers.dev',
      wranglerTomlPath: './wrangler.toml'
    };

    test('should prepare deployment with branch name template', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('feature-branch');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('preview-feature-branch');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      const result = await prepareDeployment(defaultOptions);

      expect(result).toEqual({
        workerName: 'preview-feature-branch',
        deploymentUrl: 'https://preview-feature-branch.workers.dev',
        prNumber: undefined,
        branchName: 'feature-branch'
      });

      expect(processTemplate).toHaveBeenCalledWith('preview-{branch-name}', {
        prNumber: undefined,
        branchName: 'feature-branch'
      });

      expect(updateWranglerToml).toHaveBeenCalledWith(
        './wrangler.toml',
        'preview',
        'preview-feature-branch'
      );
    });

    test('should prepare deployment with PR number template', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('feature-branch');
      vi.mocked(getPrNumber).mockReturnValue(123);
      vi.mocked(processTemplate).mockReturnValue('preview-pr-123');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      const options: PrepareDeploymentOptions = {
        ...defaultOptions,
        workerNameTemplate: 'preview-pr-{pr-number}'
      };

      const result = await prepareDeployment(options);

      expect(result).toEqual({
        workerName: 'preview-pr-123',
        deploymentUrl: 'https://preview-pr-123.workers.dev',
        prNumber: 123,
        branchName: 'feature-branch'
      });

      expect(processTemplate).toHaveBeenCalledWith('preview-pr-{pr-number}', {
        prNumber: '123',
        branchName: 'feature-branch'
      });
    });

    test('should prepare deployment with combined template', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('my-feature');
      vi.mocked(getPrNumber).mockReturnValue(456);
      vi.mocked(processTemplate).mockReturnValue('app-456-my-feature');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      const options: PrepareDeploymentOptions = {
        ...defaultOptions,
        workerNameTemplate: 'app-{pr-number}-{branch-name}',
        domain: 'example.com'
      };

      const result = await prepareDeployment(options);

      expect(result).toEqual({
        workerName: 'app-456-my-feature',
        deploymentUrl: 'https://app-456-my-feature.example.com',
        prNumber: 456,
        branchName: 'my-feature'
      });
    });

    test('should throw error when worker name is empty', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('');

      await expect(prepareDeployment(defaultOptions)).rejects.toThrow(
        'Worker name is empty after template processing'
      );
    });

    test('should log branch name and PR number', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('test-branch');
      vi.mocked(getPrNumber).mockReturnValue(789);
      vi.mocked(processTemplate).mockReturnValue('preview-test-branch');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      await prepareDeployment(defaultOptions);

      expect(core.info).toHaveBeenCalledWith('Branch name (sanitized): test-branch');
      expect(core.info).toHaveBeenCalledWith('PR number: 789');
    });

    test('should not log PR number when undefined', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('test-branch');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('preview-test-branch');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      await prepareDeployment(defaultOptions);

      expect(core.info).toHaveBeenCalledWith('Branch name (sanitized): test-branch');
      expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('PR number:'));
    });

    test('should log generated worker name and URL', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('main');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('preview-main');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      await prepareDeployment(defaultOptions);

      expect(core.info).toHaveBeenCalledWith('✅ Generated worker name: preview-main');
      expect(core.info).toHaveBeenCalledWith('✅ Generated URL: https://preview-main.workers.dev');
    });

    test('should call updateWranglerToml with correct parameters', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('develop');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('worker-develop');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      const options: PrepareDeploymentOptions = {
        workerNameTemplate: 'worker-{branch-name}',
        environment: 'staging',
        domain: 'mydomain.com',
        wranglerTomlPath: '/path/to/wrangler.toml'
      };

      await prepareDeployment(options);

      expect(updateWranglerToml).toHaveBeenCalledWith(
        '/path/to/wrangler.toml',
        'staging',
        'worker-develop'
      );
    });

    test('should propagate updateWranglerToml errors', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('test');
      vi.mocked(getPrNumber).mockReturnValue(undefined);
      vi.mocked(processTemplate).mockReturnValue('preview-test');
      vi.mocked(updateWranglerToml).mockRejectedValue(new Error('File not found'));

      await expect(prepareDeployment(defaultOptions)).rejects.toThrow('File not found');
    });

    test('should handle template without placeholders', async () => {
      vi.mocked(getSanitizedBranchName).mockReturnValue('ignored');
      vi.mocked(getPrNumber).mockReturnValue(999);
      vi.mocked(processTemplate).mockReturnValue('static-worker-name');
      vi.mocked(updateWranglerToml).mockResolvedValue();

      const options: PrepareDeploymentOptions = {
        ...defaultOptions,
        workerNameTemplate: 'static-worker-name'
      };

      const result = await prepareDeployment(options);

      expect(result.workerName).toBe('static-worker-name');
      expect(result.deploymentUrl).toBe('https://static-worker-name.workers.dev');
    });
  });
});
