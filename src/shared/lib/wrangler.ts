import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { promises as fs } from 'fs';
import path from 'path';
import { WranglerDeployConfig, WranglerExecResult, WranglerDeployResult } from '../types';

/**
 * Wrangler CLI wrapper for deployment operations
 */
export class WranglerClient {
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly env: Record<string, string>;

  constructor(apiToken: string, accountId: string) {
    if (!apiToken || !accountId) {
      throw new Error('API token and account ID are required');
    }

    this.apiToken = apiToken;
    this.accountId = accountId;
    this.env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId
    };
  }

  /**
   * Execute wrangler command
   */
  async execWrangler(
    args: string[],
    options: {
      cwd?: string;
      input?: Buffer;
    } = {}
  ): Promise<WranglerExecResult> {
    const cmd = 'npx';
    const cmdArgs = ['wrangler', ...args];

    let stdout = '';
    let stderr = '';

    const execOptions = {
      env: this.env,
      cwd: options.cwd || process.cwd(),
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        }
      },
      ignoreReturnCode: true,
      input: options.input
    };

    core.debug(`Executing: ${cmd} ${cmdArgs.join(' ')}`);
    const exitCode = await exec(cmd, cmdArgs, execOptions);

    return {
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim()
    };
  }

  /**
   * Deploy worker using wrangler
   */
  async deployWorker(config: WranglerDeployConfig): Promise<WranglerDeployResult> {
    const {
      workerName,
      scriptPath = 'index.js',
      environment = 'production',
      vars = {},
      secrets = {},
      compatibility_date = new Date().toISOString().split('T')[0]
    } = config;

    // Create wrangler.toml if it doesn't exist
    const wranglerTomlPath = path.join(process.cwd(), 'wrangler.toml');
    const wranglerConfig = `
name = "${workerName}"
main = "${scriptPath}"
compatibility_date = "${compatibility_date}"
account_id = "${this.accountId}"

[env.${environment}]
name = "${workerName}"
${Object.entries(vars)
  .map(([key, value]) => `vars.${key} = "${value}"`)
  .join('\n')}
`;

    try {
      await fs.writeFile(wranglerTomlPath, wranglerConfig.trim());
      core.debug(`Created wrangler.toml: ${wranglerConfig}`);

      // Set secrets if provided
      for (const [key, value] of Object.entries(secrets)) {
        await this.setSecret(key, value, environment);
      }

      // Deploy
      const deployArgs = ['deploy'];
      if (environment !== 'production') {
        deployArgs.push('--env', environment);
      }

      const result = await this.execWrangler(deployArgs);

      if (result.exitCode !== 0) {
        return {
          success: false,
          workerName,
          output: result.stdout,
          error: result.stderr || result.stdout
        };
      }

      // Extract URL from output
      const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : undefined;

      core.info(`Successfully deployed worker: ${workerName}`);
      if (deploymentUrl) {
        core.info(`Deployment URL: ${deploymentUrl}`);
      }

      return {
        success: true,
        workerName,
        url: deploymentUrl,
        output: result.stdout
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.error(`Deployment failed: ${errorMessage}`);
      return {
        success: false,
        workerName,
        output: '',
        error: errorMessage
      };
    } finally {
      // Clean up wrangler.toml
      try {
        await fs.unlink(wranglerTomlPath);
      } catch (cleanupError) {
        const errorMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
        core.warning(`Failed to clean up wrangler.toml: ${errorMessage}`);
      }
    }
  }

  /**
   * Set worker secret
   */
  async setSecret(key: string, value: string, environment = 'production'): Promise<void> {
    const args = ['secret', 'put', key];
    if (environment !== 'production') {
      args.push('--env', environment);
    }

    const result = await this.execWrangler(args, {
      input: Buffer.from(value)
    });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to set secret ${key}: ${result.stderr || result.stdout}`);
    }

    core.debug(`Set secret: ${key}`);
  }

  /**
   * Check if wrangler is available
   */
  async checkWranglerAvailable(): Promise<boolean> {
    try {
      const result = await this.execWrangler(['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
}
