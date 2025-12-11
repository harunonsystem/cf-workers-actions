import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { handleActionError } from '../shared/lib/error-handler';
import { mapInputs, parseInputs } from '../shared/validation';
import { DeployPreviewInputSchema } from './schemas.js';

/**
 * Process template variables in worker name
 */
function processTemplate(
  template: string,
  variables: {
    prNumber?: string;
    branchName: string;
  }
): string {
  let result = template;

  // Replace {pr-number} with PR number if available, otherwise fall back to branch-name
  const prIdentifier = variables.prNumber || variables.branchName;
  result = result.replace(/\{pr-number\}/g, prIdentifier);

  // Replace {branch-name} with branch name
  result = result.replace(/\{branch-name\}/g, variables.branchName);

  // Sanitize: remove invalid characters (only alphanumeric and dashes allowed)
  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  return result;
}

/**
 * Get sanitized branch name from GitHub ref
 */
function getSanitizedBranchName(): string {
  // For pull requests, use GITHUB_HEAD_REF which contains the source branch name
  // For pushes, use GITHUB_REF and strip the refs/heads/ prefix
  const headRef = process.env.GITHUB_HEAD_REF;
  const ref = process.env.GITHUB_REF || '';

  const branchName = headRef || ref.replace(/^refs\/heads\//, '');
  // Replace / with - and remove invalid characters
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * Update wrangler.toml with worker name
 */
async function updateWranglerToml(
  tomlPath: string,
  environment: string,
  workerName: string
): Promise<void> {
  // We use sed to update wrangler.toml for simplicity in this action
  // In a real implementation, we might want to use a TOML parser
  // But since we want to preserve comments and structure, regex replacement is often safer for simple edits

  // Note: This implementation assumes standard wrangler.toml formatting
  // It looks for [env.{environment}] and updates/adds name = "{workerName}"

  // For this action, we'll use a simplified approach:
  // We will use the prepare-preview-deploy logic if we were importing it,
  // but here we will just use a simple replacement or assume the user uses prepare-preview-deploy separately?
  // No, preview-deploy is a "batteries included" action.

  // Let's use the same logic as prepare-preview-deploy (simplified for this file)
  // Actually, we can just use the same implementation logic.

  const fs = await import('node:fs');

  if (!fs.existsSync(tomlPath)) {
    throw new Error(`wrangler.toml not found at ${tomlPath}`);
  }

  const content = fs.readFileSync(tomlPath, 'utf8');
  const lines = content.split('\n');
  const envSection = `[env.${environment}]`;
  const envIndex = lines.findIndex((line) => line.trim() === envSection);

  if (envIndex === -1) {
    throw new Error(`[env.${environment}] section not found in wrangler.toml`);
  }

  // Find name in section
  let nameUpdated = false;
  for (let i = envIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('[')) break; // Next section
    if (line.startsWith('name =')) {
      lines[i] = `name = "${workerName}"`;
      nameUpdated = true;
      break;
    }
  }

  if (!nameUpdated) {
    // Insert name after section header
    lines.splice(envIndex + 1, 0, `name = "${workerName}"`);
  }

  fs.writeFileSync(tomlPath, lines.join('\n'));
}

/**
 * Deploy worker using wrangler
 */
async function deployWorker(
  environment: string,
  apiToken: string,
  accountId: string
): Promise<boolean> {
  try {
    const envVars = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId
    };

    await exec.exec('npx', ['wrangler', 'deploy', '-e', environment], {
      env: envVars
    });
    return true;
  } catch (error) {
    core.error(`Deployment failed: ${error}`);
    return false;
  }
}

/**
 * Create or update PR comment
 */
async function createOrUpdateComment(
  prNumber: number,
  deploymentUrl: string,
  deploymentName: string,
  deploymentSuccess: boolean,
  githubToken?: string
): Promise<void> {
  const token = githubToken || process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning('GITHUB_TOKEN not found, skipping PR comment');
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const commitSha = github.context.sha.substring(0, 7);
  // For pull requests, get branch name from pull_request.head.ref
  // For pushes, use GITHUB_REF or context.ref
  const branchName =
    github.context.payload.pull_request?.head?.ref ||
    process.env.GITHUB_HEAD_REF ||
    github.context.ref.replace(/^refs\/heads\//, '');

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });

  const existingComment = comments.find(
    (comment) =>
      comment.user?.login === 'github-actions[bot]' &&
      comment.body?.includes('🚀 Preview Deployment')
  );

  const statusIcon = deploymentSuccess ? '✅' : '❌';
  const statusText = deploymentSuccess ? 'Success' : 'Failed';
  const body = `## 🚀 Preview Deployment

**Preview URL:** ${deploymentSuccess ? `[${deploymentUrl}](${deploymentUrl})` : `[Deploy failed - check logs](https://github.com/${owner}/${repo}/actions)`}

**Build Status:** ${statusIcon} ${statusText}
**Worker Name:** \`${deploymentName}\`
**Commit:** ${commitSha}
**Branch:** \`${branchName}\`

${deploymentSuccess ? 'This preview will be automatically updated when you push new commits to this PR.' : 'Please check the workflow logs for details.'}`;

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
  }
}

async function run(): Promise<void> {
  // Variables to hold outputs for error handling
  let workerName = '';
  let deploymentUrl = '';
  let deploymentSuccess = false;

  try {
    // Map and validate inputs
    const rawInputs = mapInputs({
      'cloudflare-api-token': { required: true },
      'cloudflare-account-id': { required: true },
      'worker-name': { required: true },
      environment: { required: false, default: 'preview' },
      domain: { required: false, default: 'workers.dev' },
      'wrangler-toml-path': { required: false, default: './wrangler.toml' },
      'github-token': { required: false }
    });

    const inputs = parseInputs(DeployPreviewInputSchema, rawInputs);
    if (!inputs) {
      throw new Error('Input validation failed');
    }

    core.info('🚀 Starting deploy preview...');
    core.info(`Worker name template: ${inputs.workerName}`);
    core.info(`Environment: ${inputs.environment}`);

    // Step 1: Prepare preview deployment
    const branchName = getSanitizedBranchName();
    const prNumber = github.context.payload.pull_request?.number?.toString();

    core.info(`Branch name (sanitized): ${branchName}`);
    if (prNumber) {
      core.info(`PR number: ${prNumber}`);
    }

    workerName = processTemplate(inputs.workerName, {
      prNumber,
      branchName
    });

    if (!workerName) {
      throw new Error('Worker name is empty after template processing');
    }

    core.info(`✅ Generated worker name: ${workerName}`);

    deploymentUrl = `https://${workerName}.${inputs.domain}`;
    core.info(`✅ Generated URL: ${deploymentUrl}`);

    // Step 2: Update wrangler.toml
    await updateWranglerToml(inputs.wranglerTomlPath, inputs.environment, workerName);
    core.info('✅ Updated wrangler.toml');

    // Step 3: Deploy
    deploymentSuccess = await deployWorker(
      inputs.environment,
      inputs.cloudflareApiToken,
      inputs.cloudflareAccountId
    );

    if (!deploymentSuccess) {
      throw new Error('Deployment failed');
    }

    // Step 4: Comment on PR (if pr-number provided or detected)
    const prNumberInt = prNumber ? parseInt(prNumber, 10) : undefined;
    if (prNumberInt && !Number.isNaN(prNumberInt)) {
      await createOrUpdateComment(
        prNumberInt,
        deploymentUrl,
        workerName,
        deploymentSuccess,
        rawInputs.githubToken as string | undefined
      );
      core.info('✅ PR comment posted');
    }

    // Set outputs
    core.setOutput('deployment-url', deploymentUrl);
    core.setOutput('deployment-name', workerName);
    core.setOutput('deployment-success', 'true');

    core.info('✅ Deploy preview completed');
  } catch (error) {
    await handleActionError(error, {
      summaryTitle: 'Deploy Preview Failed',
      outputs: {
        'deployment-url': deploymentUrl,
        'deployment-name': workerName,
        'deployment-success': 'false'
      }
    });
  }
}

export { run };

// Execute if not in test environment
if (process.env.NODE_ENV !== 'test') {
  void run();
}
