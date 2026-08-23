import { describe, expect, test, vi } from 'vitest';
import type { DeploymentConfig } from '../../src/shared/lib/deployment-utils';
import { executePreviewDeployment } from '../../src/shared/lib/preview-deployment';

const preparedConfig: DeploymentConfig = {
  branchName: 'feature-test',
  commitHash: 'abc123d',
  deploymentUrl: 'https://preview.workers.dev',
  prNumber: 42,
  workerName: 'preview-feature-test'
};

describe('executePreviewDeployment', () => {
  test('should prepare, deploy, and post a comment through its dependencies', async () => {
    const prepareDeployment = vi.fn().mockResolvedValue(preparedConfig);
    const deployWorker = vi.fn().mockResolvedValue(true);
    const onPrepared = vi.fn();
    const postComment = vi.fn().mockResolvedValue(undefined);

    const result = await executePreviewDeployment(
      {
        cloudflareAccountId: 'account',
        cloudflareApiToken: 'token',
        domain: 'workers.dev',
        environment: 'preview',
        wranglerTomlPath: './wrangler.toml',
        workerNameTemplate: 'preview-{branch-name}'
      },
      { deployWorker, onPrepared, postComment, prepareDeployment }
    );

    expect(result).toEqual({ ...preparedConfig, deploymentSuccess: true });
    expect(prepareDeployment).toHaveBeenCalledWith({
      domain: 'workers.dev',
      environment: 'preview',
      wranglerTomlPath: './wrangler.toml',
      workerNameTemplate: 'preview-{branch-name}'
    });
    expect(onPrepared).toHaveBeenCalledWith(preparedConfig);
    expect(deployWorker).toHaveBeenCalledWith('preview', 'token', 'account', './wrangler.toml');
    expect(postComment).toHaveBeenCalledWith(preparedConfig);
  });

  test('should not post a comment for a direct deployment without a PR', async () => {
    const prepareDeployment = vi.fn().mockResolvedValue({ ...preparedConfig, prNumber: undefined });
    const deployWorker = vi.fn().mockResolvedValue(true);
    const postComment = vi.fn();

    await executePreviewDeployment(
      {
        cloudflareAccountId: 'account',
        cloudflareApiToken: 'token',
        domain: 'workers.dev',
        environment: 'preview',
        wranglerTomlPath: './wrangler.toml',
        workerNameTemplate: 'preview-{branch-name}'
      },
      { deployWorker, postComment, prepareDeployment }
    );

    expect(postComment).not.toHaveBeenCalled();
  });

  test('should stop before commenting when deployment fails', async () => {
    const prepareDeployment = vi.fn().mockResolvedValue(preparedConfig);
    const deployWorker = vi.fn().mockResolvedValue(false);
    const postComment = vi.fn();

    await expect(
      executePreviewDeployment(
        {
          cloudflareAccountId: 'account',
          cloudflareApiToken: 'token',
          domain: 'workers.dev',
          environment: 'preview',
          wranglerTomlPath: './wrangler.toml',
          workerNameTemplate: 'preview-{branch-name}'
        },
        { deployWorker, postComment, prepareDeployment }
      )
    ).rejects.toThrow('Deployment failed');

    expect(postComment).not.toHaveBeenCalled();
  });
});
