import { getInput, info, summary, warning } from '@actions/core';
import { context as githubContext, getOctokit } from '@actions/github';
import { GitHubContext } from '../shared/types';
import { CommentInputSchema, CommentOutputSchema } from '../shared/schemas';
import { parseInputs, setOutputsValidated } from '../shared/validation';
import { handleActionError, COMMENT_ERROR_OUTPUTS } from '../shared/lib/error-handler';
import {
  COMMENT_DEFAULT_TAG,
  COMMENT_STATUS_METADATA,
  CommentDeploymentStatus
} from './constants';

interface CommentGenerationParams {
  deploymentUrl: string;
  deploymentStatus: CommentDeploymentStatus;
  workerName?: string;
  customMessage?: string;
  commentTemplate?: string;
  commentTag: string;
  prNumber: number;
}

async function run(): Promise<void> {
  try {
    // Get and validate inputs
    const raw = {
      deploymentUrl: getInput('deployment-url', { required: true }),
      deploymentStatus: getInput('deployment-status') || undefined,
      workerName: getInput('worker-name') || undefined,
      githubToken: getInput('github-token', { required: true }),
      customMessage: getInput('custom-message') || undefined,
      commentTemplate: getInput('comment-template') || undefined,
      updateExisting: getInput('update-existing') === 'true',
      commentTag: getInput('comment-tag') || undefined
    };

    const inputs = parseInputs(CommentInputSchema, raw);
    if (!inputs) return;

    // Get PR context
    const context = githubContext as GitHubContext;
    if (context.eventName !== 'pull_request' && context.eventName !== 'issue_comment') {
      throw new Error('This action can only be used on pull_request or issue_comment events');
    }

    const prNumber = getPullRequestNumber(context);
    if (!prNumber) {
      throw new Error('Unable to determine PR number from context');
    }

    const commentTag = sanitizeCommentTag(inputs.commentTag ?? COMMENT_DEFAULT_TAG);

    // Initialize GitHub client
    const octokit = getOctokit(inputs.githubToken);

    // Generate comment content
    const commentContent = generateCommentContent({
      deploymentUrl: inputs.deploymentUrl,
      deploymentStatus: inputs.deploymentStatus,
      workerName: inputs.workerName,
      customMessage: inputs.customMessage,
      commentTemplate: inputs.commentTemplate,
      commentTag,
      prNumber
    });

    const { commentId, commentUrl, action } = await upsertComment({
      octokit,
      context,
      prNumber,
      commentContent,
      commentTag,
      updateExisting: inputs.updateExisting
    });

    info(`${action === 'updated' ? 'Updated existing' : 'Created new'} comment: ${commentUrl}`);

    // Set validated outputs
    setOutputsValidated(CommentOutputSchema, {
      commentId: commentId.toString(),
      commentUrl: commentUrl
    });

    // Set summary
    const statusSummary = COMMENT_STATUS_METADATA[inputs.deploymentStatus].summary;

    await summary
      .addHeading('💬 PR Comment Posted')
      .addTable([
        ['Property', 'Value'],
        ['Comment ID', commentId.toString()],
        ['Comment URL', `[View Comment](${commentUrl})`],
        ['Deployment URL', `[${inputs.deploymentUrl}](${inputs.deploymentUrl})`],
        ['Status', statusSummary]
      ])
      .write();

    info(`✅ Successfully posted comment to PR #${prNumber}`);
  } catch (error) {
    await handleActionError(error, {
      summaryTitle: 'PR Comment Failed',
      outputs: COMMENT_ERROR_OUTPUTS
    });
  }
}

/**
 * Sanitize user input to prevent script injection in markdown
 */
function sanitizeMarkdown(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Strip markdown links
    .replace(/`/g, '\\`') // Escape backticks
    .replace(/\$/g, '\\$'); // Escape dollar signs
}

/**
 * Generate comment content
 */
function generateCommentContent(params: CommentGenerationParams): string {
  const {
    deploymentUrl,
    deploymentStatus,
    workerName,
    customMessage,
    commentTemplate,
    commentTag,
    prNumber
  } = params;

  if (commentTemplate) {
    // Use custom template with sanitized user inputs
    return commentTemplate
      .replace('{deployment_url}', deploymentUrl)
      .replace('{deployment_status}', deploymentStatus)
      .replace('{worker_name}', sanitizeMarkdown(workerName || 'N/A'))
      .replace('{custom_message}', sanitizeMarkdown(customMessage || ''))
      .replace('{comment_tag}', commentTag)
      .replace('{pr_number}', prNumber.toString());
  }

  // Default template with sanitized user inputs
  const statusDetails = COMMENT_STATUS_METADATA[deploymentStatus];

  let content = `<!-- ${commentTag} -->\n\n`;
  content += `## ${statusDetails.icon} Cloudflare Workers Deployment ${statusDetails.label}\n\n`;

  if (deploymentStatus === 'success') {
    content += `🚀 **Preview URL**: [${deploymentUrl}](${deploymentUrl})\n\n`;

    if (workerName) {
      content += `📦 **Worker Name**: \`${sanitizeMarkdown(workerName)}\`\n\n`;
    }

    content += `🔍 **Environment**: Preview\n`;
    content += `📅 **Deployed**: ${new Date().toISOString()}\n\n`;

    if (customMessage) {
      content += `💬 **Additional Notes**:\n${sanitizeMarkdown(customMessage)}\n\n`;
    }

    content += `---\n`;
    content += `*Deployment powered by [Cloudflare Workers](https://workers.cloudflare.com/)*`;
  } else if (deploymentStatus === 'failure') {
    content += `❌ **Deployment failed**\n\n`;
    content += `Please check the deployment logs for more details.\n\n`;

    if (customMessage) {
      content += `**Error Details**:\n${sanitizeMarkdown(customMessage)}\n\n`;
    }
  } else {
    content += `⏳ **Deployment pending**\n\n`;
    content += `The deployment is still in progress. Please check back later for updates.\n\n`;

    if (customMessage) {
      content += `**Notes**:\n${sanitizeMarkdown(customMessage)}\n\n`;
    }
  }

  return content;
}

/**
 * Find existing comment with the specified tag
 */
async function findExistingComment(
  octokit: ReturnType<typeof getOctokit>,
  context: GitHubContext,
  commentTag: string,
  prNumber: number
): Promise<{ id: number } | undefined> {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    warning(`Failed to fetch existing comments: ${errorMessage}`);
    return undefined;
  }
}

function getPullRequestNumber(context: GitHubContext): number | undefined {
  if (context.eventName === 'pull_request' && context.payload.pull_request) {
    return context.payload.pull_request.number;
  }

  if (context.eventName === 'issue_comment' && context.payload.issue) {
    return context.payload.issue.number;
  }

  return undefined;
}

function sanitizeCommentTag(tag: string): string {
  const trimmed = tag.trim().replace(/-->/g, '');
  const safeTag = trimmed.replace(/[^A-Za-z0-9:_\-\.]+/g, '-');
  return safeTag.length > 0 ? safeTag : COMMENT_DEFAULT_TAG;
}

async function upsertComment(params: {
  octokit: ReturnType<typeof getOctokit>;
  context: GitHubContext;
  prNumber: number;
  commentContent: string;
  commentTag: string;
  updateExisting: boolean;
}): Promise<{ commentId: number; commentUrl: string; action: 'created' | 'updated' }> {
  const { octokit, context, prNumber, commentContent, commentTag, updateExisting } = params;

  if (updateExisting) {
    const existingComment = await findExistingComment(octokit, context, commentTag, prNumber);

    if (existingComment) {
      const updateResponse = await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: commentContent
      });

      return {
        commentId: updateResponse.data.id,
        commentUrl: updateResponse.data.html_url,
        action: 'updated'
      };
    }
  }

  const createResponse = await octokit.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    body: commentContent
  });

  return {
    commentId: createResponse.data.id,
    commentUrl: createResponse.data.html_url,
    action: 'created'
  };
}

// Self-invoking async function to handle top-level await
void run();
