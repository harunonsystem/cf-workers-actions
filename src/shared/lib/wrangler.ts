import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from '@actions/exec';
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
    const { workerName, environment = 'production', secrets = {} } = config;

    try {
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

// Wrangler TOML backup and modification utilities
export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  wasModified: boolean;
}

export async function backupAndModifyWranglerToml(
  wranglerFile: string,
  environment: string,
  workerName: string
): Promise<BackupInfo> {
  const originalPath = path.resolve(wranglerFile);
  const timestamp = Date.now();
  const backupPath = `${originalPath}.bak-${timestamp}`;

  core.info(`📝 Backing up ${originalPath} to ${backupPath}`);

  try {
    // Read original file
    const originalContent = await fs.promises.readFile(originalPath, 'utf8');

    // Create backup
    await fs.promises.writeFile(backupPath, originalContent, 'utf8');

    // Modify content
    const modifiedContent = modifyWranglerTomlContent(originalContent, environment, workerName);

    // Write modified file
    await fs.promises.writeFile(originalPath, modifiedContent, 'utf8');

    core.info(
      `✅ Modified ${wranglerFile} for environment [${environment}] with worker name: ${workerName}`
    );

    return {
      originalPath,
      backupPath,
      wasModified: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to backup/modify wrangler.toml: ${errorMessage}`, { cause: error });
  }
}

export function modifyWranglerTomlContent(
  content: string,
  environment: string,
  workerName: string
): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inTargetEnv = false;
  let envSectionFound = false;
  let nameUpdated = false;

  const targetSection = `[env.${environment}]`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we're entering the target environment section
    if (line === targetSection) {
      inTargetEnv = true;
      envSectionFound = true;
      result.push(lines[i]);
      continue;
    }

    // Check if we're entering a different environment section
    if (line.startsWith('[env.') && line !== targetSection) {
      inTargetEnv = false;
    }

    // Check if we're entering any other section
    if (line.startsWith('[') && !line.startsWith('[env.')) {
      inTargetEnv = false;
    }

    // If we're in the target environment and find a name line, replace it
    if (inTargetEnv && line.startsWith('name ')) {
      result.push(`name = "${workerName}"`);
      nameUpdated = true;
      continue;
    }

    result.push(lines[i]);
  }

  // If environment section wasn't found, add it
  if (!envSectionFound) {
    result.push('');
    result.push(`# Added by deploy action`);
    result.push(targetSection);
    result.push(`name = "${workerName}"`);
    nameUpdated = true;
  }

  // If environment section was found but no name was updated, add name
  if (envSectionFound && !nameUpdated) {
    // Find the target section and add name after it
    const modifiedResult: string[] = [];
    let addedName = false;

    for (let i = 0; i < result.length; i++) {
      modifiedResult.push(result[i]);

      if (result[i].trim() === targetSection && !addedName) {
        modifiedResult.push(`name = "${workerName}"`);
        addedName = true;
      }
    }

    return modifiedResult.join('\n');
  }

  return result.join('\n');
}

export async function restoreWranglerToml(backupInfo: BackupInfo): Promise<void> {
  try {
    core.info(`🔄 Restoring ${backupInfo.originalPath} from backup`);

    const backupContent = await fs.promises.readFile(backupInfo.backupPath, 'utf8');
    await fs.promises.writeFile(backupInfo.originalPath, backupContent, 'utf8');

    // Clean up backup file
    await fs.promises.unlink(backupInfo.backupPath);

    core.info(`✅ Restored wrangler.toml successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.warning(`Failed to restore wrangler.toml: ${errorMessage}`);
  }
}
