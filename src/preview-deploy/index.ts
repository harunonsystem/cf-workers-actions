import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import { PreviewDeployInputs, GitHubContext } from './types';
import { checkBranchEligibility, determineWorkerName } from './branch';
import { updateWranglerToml, restoreWranglerToml } from './wrangler';
import { deployToCloudflare } from './deploy';

async function run(): Promise<void> {
  let backupPath: string | undefined;

  try {
    // Get inputs
    const inputs: PreviewDeployInputs = {
      cloudflareApiToken: core.getInput('cloudflare-api-token', { required: true }),
      cloudflareAccountId: core.getInput('cloudflare-account-id', { required: true }),
      workerNamePrefix: core.getInput('worker-name-prefix') || 'preview',
      workerNameSuffix: core.getInput('worker-name-suffix') || 'pr-number',
      customWorkerName: core.getInput('custom-worker-name') || undefined,
      wranglerTomlPath: core.getInput('wrangler-toml-path') || 'wrangler.toml',
      environmentName: core.getInput('environment-name') || 'preview',
      branchPatterns: core.getInput('branch-patterns') || 'feature/*,bugfix/*,hotfix/*',
      excludeBranches: core.getInput('exclude-branches') || 'develop,staging,main',
      buildCommand: core.getInput('build-command') || 'npm run build',
      skipBuild: core.getInput('skip-build') === 'true',
      commentEnabled: core.getInput('comment-enabled') !== 'false',
      commentTemplate: core.getInput('comment-template') || undefined,
      githubToken: core.getInput('github-token', { required: true })
    };

    const context = github.context as GitHubContext;

    // Step 1: Check branch eligibility
    const branchCheck = checkBranchEligibility(
      context,
      inputs.branchPatterns,
      inputs.excludeBranches
    );

    core.setOutput('deployed', branchCheck.shouldDeploy.toString());

    if (!branchCheck.shouldDeploy) {
      core.info(`⏭️ Skipping deployment: ${branchCheck.reason}`);

      // Set empty outputs
      core.setOutput('worker-name', '');
      core.setOutput('worker-url', '');
      core.setOutput('deployment-id', '');

      return;
    }

    core.info(`✅ Branch '${branchCheck.branch}' is eligible for deployment`);

    // Step 2: Determine worker name
    const workerName = determineWorkerName(
      context,
      inputs.workerNamePrefix,
      inputs.workerNameSuffix,
      inputs.customWorkerName
    );

    core.info(`📦 Worker name: ${workerName}`);

    // Step 3: Backup and update wrangler.toml
    backupPath = `${inputs.wranglerTomlPath}.backup`;

    if (fs.existsSync(inputs.wranglerTomlPath)) {
      fs.copyFileSync(inputs.wranglerTomlPath, backupPath);
      core.info(`💾 Backed up wrangler.toml to ${backupPath}`);
    }

    updateWranglerToml(inputs.wranglerTomlPath, inputs.environmentName, workerName);

    core.info(`📝 Updated wrangler.toml with worker name: ${workerName}`);

    // Step 4: Run build if needed
    if (!inputs.skipBuild) {
      core.info(`🔨 Running build command: ${inputs.buildCommand}`);
      // Run build command via shell
      await exec.exec('sh', ['-c', inputs.buildCommand]);
    }

    // Step 5: Deploy to Cloudflare
    const deploymentResult = await deployToCloudflare(
      inputs.cloudflareApiToken,
      inputs.cloudflareAccountId,
      inputs.environmentName,
      workerName
    );

    core.info(`🚀 Deployed to Cloudflare: ${deploymentResult.url}`);

    // Set outputs
    core.setOutput('worker-name', workerName);
    core.setOutput('worker-url', deploymentResult.url);
    core.setOutput('deployment-id', deploymentResult.deploymentId);

    // Step 6: Post PR comment if enabled
    if (
      inputs.commentEnabled &&
      context.eventName === 'pull_request' &&
      context.payload.pull_request
    ) {
      await postDeploymentComment(
        inputs.githubToken,
        context,
        workerName,
        deploymentResult.url,
        branchCheck.branch,
        inputs.commentTemplate,
        true
      );
    }

    // Set summary
    await core.summary
      .addHeading('🚀 Preview Deployment Successful')
      .addTable([
        ['Property', 'Value'],
        ['Worker Name', workerName],
        ['Preview URL', `[${deploymentResult.url}](${deploymentResult.url})`],
        ['Branch', branchCheck.branch],
        ['Environment', inputs.environmentName]
      ])
      .write();

    core.info(`✅ Successfully deployed preview environment`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.error(`❌ Preview deployment failed: ${errorMessage}`);

    // Try to post failure comment
    try {
      const inputs: PreviewDeployInputs = {
        githubToken: core.getInput('github-token'),
        commentEnabled: core.getInput('comment-enabled') !== 'false',
        commentTemplate: core.getInput('comment-template') || undefined,
        cloudflareApiToken: '',
        cloudflareAccountId: '',
        workerNamePrefix: '',
        workerNameSuffix: '',
        wranglerTomlPath: '',
        environmentName: '',
        branchPatterns: '',
        excludeBranches: '',
        buildCommand: '',
        skipBuild: false
      };

      const context = github.context as GitHubContext;
      const branch =
        context.payload.pull_request?.head?.ref || context.ref.replace('refs/heads/', '');

      if (
        inputs.commentEnabled &&
        inputs.githubToken &&
        context.eventName === 'pull_request' &&
        context.payload.pull_request
      ) {
        await postDeploymentComment(
          inputs.githubToken,
          context,
          '',
          '',
          branch,
          inputs.commentTemplate,
          false
        );
      }
    } catch (commentError) {
      core.warning(`Failed to post error comment: ${commentError}`);
    }

    // Set failure summary
    await core.summary
      .addHeading('❌ Preview Deployment Failed')
      .addCodeBlock(errorMessage, 'text')
      .write();

    core.setFailed(errorMessage);
  } finally {
    // Always restore wrangler.toml
    const wranglerTomlPath = core.getInput('wrangler-toml-path') || 'wrangler.toml';
    if (backupPath) {
      restoreWranglerToml(wranglerTomlPath, backupPath);
    }
  }
}

/**
 * Post deployment comment to PR
 */
async function postDeploymentComment(
  githubToken: string,
  context: GitHubContext,
  workerName: string,
  workerUrl: string,
  branch: string,
  customTemplate: string | undefined,
  success: boolean
): Promise<void> {
  const octokit = github.getOctokit(githubToken);

  let commentBody: string;

  if (customTemplate) {
    // Use custom template with variable substitution
    commentBody = customTemplate
      .replace(/\{\{url\}\}/g, workerUrl)
      .replace(/\{\{worker_name\}\}/g, workerName)
      .replace(/\{\{branch\}\}/g, branch);
  } else {
    // Default template
    if (success) {
      commentBody = `### ✅ Preview Environment Deployed

**Worker Name**: \`${workerName}\`
**Preview URL**: ${workerUrl}
**Branch**: \`${branch}\`

The preview environment has been successfully deployed!

<!-- cloudflare-preview-deployment -->`;
    } else {
      commentBody = `### ❌ Preview Deployment Failed

**Branch**: \`${branch}\`

Please check the [workflow logs](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}) for details.

<!-- cloudflare-preview-deployment -->`;
    }
  }

  const prNumber = context.payload.pull_request?.number;
  if (!prNumber) {
    core.warning('PR number not available, skipping comment');
    return;
  }

  try {
    // Find existing comment
    const comments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber
    });

    const existingComment = comments.data.find(
      (comment) => comment.body && comment.body.includes('<!-- cloudflare-preview-deployment -->')
    );

    if (existingComment) {
      // Update existing comment
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: commentBody
      });
      core.info(`Updated existing PR comment: ${existingComment.html_url}`);
    } else {
      // Create new comment
      const response = await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: commentBody
      });
      core.info(`Created new PR comment: ${response.data.html_url}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.warning(`Failed to post PR comment: ${errorMessage}`);
  }
}

// Self-invoking async function to handle top-level await
void run();
