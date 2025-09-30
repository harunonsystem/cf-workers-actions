import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as github from '@actions/github';
import { generateWorkerName, generateWorkerUrl, getPrNumber } from '../shared/lib/url-generator';

function parseExcludeBranches(input: string): string[] {
  if (!input) return [];
  input = input.trim();
  if (input.startsWith('[')) {
    try {
      return JSON.parse(input);
    } catch {
      // Fallback to CSV parsing
    }
  }
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldSkipDeploy(inputs: Deploy2Inputs): boolean {
  const { workflowMode, excludeBranches, releaseBranchPattern } = inputs;

  // Get current branch name
  let refName: string | undefined;
  if (github.context.eventName === 'pull_request' && github.context.payload?.pull_request) {
    refName = github.context.payload.pull_request.head?.ref;
  } else if (github.context.ref && github.context.ref.startsWith('refs/heads/')) {
    refName = github.context.ref.replace('refs/heads/', '');
  }

  if (!refName) {
    core.warning('Unable to determine branch name, proceeding with deployment');
    return false;
  }

  core.info(`🌿 Current branch: ${refName}`);

  // Check exclude list
  const excluded = parseExcludeBranches(excludeBranches);
  if (excluded.includes(refName)) {
    core.info(`⏭️ Skipping deployment: branch '${refName}' is in exclude list`);
    return true;
  }

  // Apply workflow mode logic
  const isReleaseBranch = refName.startsWith('release/') || refName.startsWith('hotfix/');
  const isMainBranch = refName === 'main' || refName === 'master';

  if (workflowMode === 'auto') {
    // Auto-detect: if release/hotfix branches exist, treat as gitflow; otherwise githubflow
    if (isReleaseBranch) {
      const matches =
        refName.startsWith(releaseBranchPattern.replace(/\*.*$/, '')) ||
        refName.startsWith('hotfix/');
      if (!matches) {
        core.info(
          `⏭️ Skipping deployment: branch '${refName}' doesn't match release pattern in auto mode`
        );
        return true;
      }
    } else if (!isMainBranch) {
      core.info(
        `⏭️ Skipping deployment: branch '${refName}' is not main/master or release/hotfix in auto mode`
      );
      return true;
    }
  } else if (workflowMode === 'gitflow') {
    if (!isReleaseBranch) {
      core.info(
        `⏭️ Skipping deployment: branch '${refName}' is not a release/hotfix branch in gitflow mode`
      );
      return true;
    }
  } else if (workflowMode === 'githubflow') {
    if (!isMainBranch) {
      core.info(
        `⏭️ Skipping deployment: branch '${refName}' is not main/master in githubflow mode`
      );
      return true;
    }
  }

  core.info(`✅ Branch '${refName}' is eligible for deployment in ${workflowMode} mode`);
  return false;
}

interface Deploy2Inputs {
  environment: string;
  workerName?: string;
  workerNamePattern?: string;
  workerNamePatternBranch?: string;
  subdomain?: string;
  forcePreview?: boolean;
  apiToken: string;
  accountId: string;
  secrets: Record<string, string>;
  deployCommand: string;
  wranglerFile: string;
  workflowMode: 'auto' | 'gitflow' | 'githubflow';
  excludeBranches: string;
  releaseBranchPattern: string;
}

interface BackupInfo {
  originalPath: string;
  backupPath: string;
  wasModified: boolean;
}

interface WorkerNameResult {
  workerName: string;
  shouldPatch: boolean;
}

async function generateWorkerNameFromPattern(inputs: Deploy2Inputs): Promise<WorkerNameResult> {
  const isPullRequest = github.context.eventName === 'pull_request';

  // Get branch name (prefer PR head ref when available)
  let branchName: string | undefined;
  if (isPullRequest && github.context.payload?.pull_request) {
    branchName = github.context.payload.pull_request.head?.ref || undefined;
  } else if (github.context.ref && github.context.ref.startsWith('refs/heads/')) {
    branchName = github.context.ref.replace('refs/heads/', '');
  }

  // Get PR number if available
  let prNumber: number | undefined;
  try {
    prNumber = getPrNumber(github.context as any);
  } catch {
    prNumber = undefined;
  }

  // Choose pattern based on context
  let pattern: string;
  let shouldPatch: boolean;

  if (isPullRequest) {
    // PR deployment: use worker-name-pattern
    if (!inputs.workerNamePattern) {
      throw new Error('worker-name-pattern is required for PR deployments');
    }
    pattern = inputs.workerNamePattern;
    shouldPatch = true;
    core.info('🔀 PR deployment detected, using worker-name-pattern');
  } else {
    // Direct branch deployment: use worker-name-pattern-branch if available
    if (inputs.workerNamePatternBranch) {
      pattern = inputs.workerNamePatternBranch;
      shouldPatch = true;
      core.info('🌿 Branch deployment detected, using worker-name-pattern-branch');
    } else if (inputs.workerNamePattern) {
      pattern = inputs.workerNamePattern;
      const isPreviewPattern = pattern.includes('{pr_number}');
      shouldPatch = isPreviewPattern || inputs.forcePreview || false;
      core.info('🌿 Branch deployment detected, using worker-name-pattern (fallback)');
    } else {
      throw new Error('Either worker-name-pattern or worker-name-pattern-branch is required');
    }
  }

  // Generate worker name
  const workerName = generateWorkerName(pattern, prNumber, branchName);

  return {
    workerName,
    shouldPatch
  };
}

async function run(): Promise<void> {
  let backupInfo: BackupInfo | null = null;
  let inputs: Deploy2Inputs | undefined;

  try {
    // Get inputs
    inputs = {
      environment: core.getInput('environment', { required: true }),
      workerName: core.getInput('worker-name') || undefined,
      workerNamePattern: core.getInput('worker-name-pattern') || undefined,
      workerNamePatternBranch: core.getInput('worker-name-pattern-branch') || undefined,
      subdomain: core.getInput('subdomain') || undefined,
      forcePreview: core.getInput('force-preview') === 'true',
      apiToken: core.getInput('cloudflare-api-token', { required: true }),
      accountId: core.getInput('cloudflare-account-id') || '',
      secrets: {},
      deployCommand: core.getInput('deploy-command') || 'deploy',
      wranglerFile: core.getInput('wrangler-file') || 'wrangler.toml',
      workflowMode: (core.getInput('workflow-mode') || 'auto') as 'auto' | 'gitflow' | 'githubflow',
      excludeBranches: core.getInput('exclude-branches') || '',
      releaseBranchPattern: core.getInput('release-branch-pattern') || 'release/'
    };

    // Parse secrets JSON input
    const secretsInput = core.getInput('secrets') || '{}';
    try {
      const parsedSecrets = JSON.parse(secretsInput);
      if (
        typeof parsedSecrets !== 'object' ||
        parsedSecrets === null ||
        Array.isArray(parsedSecrets)
      ) {
        throw new Error('Secrets must be a JSON object');
      }
      inputs.secrets = parsedSecrets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse secrets JSON: ${errorMessage}`, { cause: error });
    }

    // Check if deployment should be skipped based on workflow mode and branch
    if (shouldSkipDeploy(inputs)) {
      return;
    }

    core.info(`🚀 Starting deployment for environment: ${inputs.environment}`);

    // Step 1: Generate worker name and URL if pattern is provided
    let finalWorkerName = inputs.workerName;
    let workerUrl: string | undefined;
    let shouldPatchWrangler = false;

    if (!finalWorkerName && inputs.workerNamePattern) {
      const result = await generateWorkerNameFromPattern(inputs);
      finalWorkerName = result.workerName;
      shouldPatchWrangler = result.shouldPatch;
      core.info(`🏷️ Generated worker name: ${finalWorkerName}`);
    } else if (finalWorkerName) {
      // Explicit worker name provided - decide if we should patch
      shouldPatchWrangler = inputs.environment !== 'production' || inputs.forcePreview || false;
      core.info(`🏷️ Using provided worker name: ${finalWorkerName}`);
    }

    // Generate URL if worker name is available
    if (finalWorkerName) {
      workerUrl = generateWorkerUrl(finalWorkerName, inputs.subdomain);
      core.info(`🔗 Worker URL: ${workerUrl}`);
    }

    // Step 2: Backup and modify wrangler.toml if needed
    if (finalWorkerName && shouldPatchWrangler) {
      backupInfo = await backupAndModifyWranglerToml(
        inputs.wranglerFile,
        inputs.environment,
        finalWorkerName
      );
    }

    // Step 3: Set secrets
    if (Object.keys(inputs.secrets).length > 0) {
      await setSecrets(inputs.secrets, inputs.environment, inputs.apiToken, inputs.accountId);
    }

    // Step 4: Deploy
    const deployResult = await deployWorker(inputs);

    // Step 5: Set outputs
    core.setOutput('worker-url', workerUrl || deployResult.url || '');
    core.setOutput('worker-name', finalWorkerName || 'unknown');
    core.setOutput('success', 'true');

    // Set summary
    await core.summary
      .addHeading('🚀 Cloudflare Workers Deployment (Deploy2)')
      .addTable([
        ['Property', 'Value'],
        ['Environment', inputs.environment],
        ['Worker Name', finalWorkerName || 'N/A'],
        [
          'URL',
          workerUrl || deployResult.url
            ? `[${workerUrl || deployResult.url}](${workerUrl || deployResult.url})`
            : 'N/A'
        ],
        ['Status', '✅ Success']
      ])
      .write();

    core.info(`✅ Successfully deployed worker`);
    if (deployResult.url) {
      core.info(`🔗 Deployment URL: ${deployResult.url}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.error(`❌ Deployment failed: ${errorMessage}`);

    // Set failure outputs
    core.setOutput('success', 'false');
    core.setOutput('worker-url', '');
    core.setOutput('worker-name', inputs?.workerName || 'unknown');
    core.setOutput('error-message', errorMessage);

    // Set failure summary
    await core.summary
      .addHeading('❌ Cloudflare Workers Deployment Failed (Deploy2)')
      .addCodeBlock(errorMessage, 'text')
      .write();

    core.setFailed(errorMessage);
  } finally {
    // Always restore wrangler.toml if it was modified
    if (backupInfo?.wasModified) {
      await restoreWranglerToml(backupInfo);
    }
  }
}

async function backupAndModifyWranglerToml(
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

function modifyWranglerTomlContent(
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
    result.push(`# Added by deploy2 action`);
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

async function restoreWranglerToml(backupInfo: BackupInfo): Promise<void> {
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

async function setSecrets(
  secrets: Record<string, string>,
  environment: string,
  apiToken: string,
  accountId: string
): Promise<void> {
  core.info(`🔐 Setting ${Object.keys(secrets).length} secrets for environment: ${environment}`);

  for (const [key, value] of Object.entries(secrets)) {
    const secretArgs = ['wrangler', 'secret', 'put', key];

    if (environment !== 'production') {
      secretArgs.push('--env', environment);
    }

    try {
      await exec.exec('npx', secretArgs, {
        input: Buffer.from(value),
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: apiToken,
          CLOUDFLARE_ACCOUNT_ID: accountId
        }
      });
      core.info(`✅ Set secret: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      core.warning(`Failed to set secret ${key}: ${errorMessage}`);
    }
  }
}

async function deployWorker(inputs: Deploy2Inputs): Promise<{ url?: string }> {
  const deployArgs = ['wrangler', inputs.deployCommand];

  if (inputs.environment !== 'production') {
    deployArgs.push('--env', inputs.environment);
  }

  let deployOutput = '';
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        deployOutput += data.toString();
      }
    },
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: inputs.apiToken,
      CLOUDFLARE_ACCOUNT_ID: inputs.accountId
    }
  };

  core.info(`🚀 Executing: npx ${deployArgs.join(' ')}`);
  await exec.exec('npx', deployArgs, options);

  // Extract URL from deploy output
  const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
  const deploymentUrl = urlMatch ? urlMatch[0] : undefined;

  return { url: deploymentUrl };
}

// Self-invoking async function
void run();
