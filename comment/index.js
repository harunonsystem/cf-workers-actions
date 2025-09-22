import core from '@actions/core';
import github from '@actions/github';

async function run() {
  try {
    // Get inputs
    const deploymentUrl = core.getInput('deployment-url', { required: true });
    const deploymentStatus = core.getInput('deployment-status') || 'success';
    const workerName = core.getInput('worker-name');
    const githubToken = core.getInput('github-token', { required: true });
    const customMessage = core.getInput('custom-message');
    const commentTemplate = core.getInput('comment-template');
    const updateExisting = core.getInput('update-existing') === 'true';
    const commentTag = core.getInput('comment-tag') || 'cloudflare-workers-deployment';

    // Get PR context
    const context = github.context;
    if (context.eventName !== 'pull_request' && context.eventName !== 'issue_comment') {
      throw new Error('This action can only be used on pull_request or issue_comment events');
    }

    const prNumber =
      context.eventName === 'pull_request'
        ? context.payload.pull_request.number
        : context.payload.issue.number;

    // Initialize GitHub client
    const octokit = github.getOctokit(githubToken);

    // Generate comment content
    const commentContent = generateCommentContent({
      deploymentUrl,
      deploymentStatus,
      workerName,
      customMessage,
      commentTemplate,
      commentTag,
      prNumber
    });

    let commentId;
    let commentUrl;

    if (updateExisting) {
      // Try to find existing comment
      const existingComment = await findExistingComment(octokit, context, commentTag);

      if (existingComment) {
        // Update existing comment
        const updateResponse = await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: existingComment.id,
          body: commentContent
        });

        commentId = updateResponse.data.id;
        commentUrl = updateResponse.data.html_url;

        core.info(`Updated existing comment: ${commentUrl}`);
      } else {
        // Create new comment if no existing one found
        const createResponse = await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          body: commentContent
        });

        commentId = createResponse.data.id;
        commentUrl = createResponse.data.html_url;

        core.info(`Created new comment: ${commentUrl}`);
      }
    } else {
      // Always create new comment
      const createResponse = await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        body: commentContent
      });

      commentId = createResponse.data.id;
      commentUrl = createResponse.data.html_url;

      core.info(`Created new comment: ${commentUrl}`);
    }

    // Set outputs
    core.setOutput('comment-id', commentId);
    core.setOutput('comment-url', commentUrl);

    // Set summary
    core.summary.addHeading('💬 PR Comment Posted').addTable([
      ['Property', 'Value'],
      ['Comment ID', commentId.toString()],
      ['Comment URL', `[View Comment](${commentUrl})`],
      ['Deployment URL', `[${deploymentUrl}](${deploymentUrl})`],
      ['Status', deploymentStatus === 'success' ? '✅ Success' : '❌ Failed']
    ]);

    await core.summary.write();

    core.info(`✅ Successfully posted comment to PR #${prNumber}`);
  } catch (error) {
    core.error(`❌ Failed to post comment: ${error.message}`);

    // Set failure outputs
    core.setOutput('comment-id', '');
    core.setOutput('comment-url', '');

    // Set failure summary
    core.summary.addHeading('❌ PR Comment Failed').addCodeBlock(error.message, 'text');

    await core.summary.write();

    core.setFailed(error.message);
  }
}

/**
 * Generate comment content
 */
function generateCommentContent({
  deploymentUrl,
  deploymentStatus,
  workerName,
  customMessage,
  commentTemplate,
  commentTag,
  prNumber
}) {
  if (commentTemplate) {
    // Use custom template
    return commentTemplate
      .replace('{deployment_url}', deploymentUrl)
      .replace('{deployment_status}', deploymentStatus)
      .replace('{worker_name}', workerName || 'N/A')
      .replace('{custom_message}', customMessage || '')
      .replace('{comment_tag}', commentTag)
      .replace('{pr_number}', prNumber);
  }

  // Default template
  const statusIcon = deploymentStatus === 'success' ? '✅' : '❌';
  const statusText = deploymentStatus === 'success' ? 'Success' : 'Failed';

  let content = `<!-- ${commentTag} -->\n\n`;
  content += `## ${statusIcon} Cloudflare Workers Deployment ${statusText}\n\n`;

  if (deploymentStatus === 'success') {
    content += `🚀 **Preview URL**: [${deploymentUrl}](${deploymentUrl})\n\n`;

    if (workerName) {
      content += `📦 **Worker Name**: \`${workerName}\`\n\n`;
    }

    content += `🔍 **Environment**: Preview\n`;
    content += `📅 **Deployed**: ${new Date().toISOString()}\n\n`;

    if (customMessage) {
      content += `💬 **Additional Notes**:\n${customMessage}\n\n`;
    }

    content += `---\n`;
    content += `*Deployment powered by [Cloudflare Workers](https://workers.cloudflare.com/)*`;
  } else {
    content += `❌ **Deployment failed**\n\n`;
    content += `Please check the deployment logs for more details.\n\n`;

    if (customMessage) {
      content += `**Error Details**:\n${customMessage}\n\n`;
    }
  }

  return content;
}

/**
 * Find existing comment with the specified tag
 */
async function findExistingComment(octokit, context, commentTag) {
  const prNumber =
    context.eventName === 'pull_request'
      ? context.payload.pull_request.number
      : context.payload.issue.number;

  try {
    const comments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber
    });

    return comments.data.find(
      (comment) => comment.body && comment.body.includes(`<!-- ${commentTag} -->`)
    );
  } catch (error) {
    core.warning(`Failed to fetch existing comments: ${error.message}`);
    return null;
  }
}

// Self-invoking async function to handle top-level await
(async () => {
  await run();
})();
