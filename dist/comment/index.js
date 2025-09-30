"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
async function run() {
    try {
        // Get inputs
        const inputs = {
            deploymentUrl: core.getInput('worker-url', { required: true }),
            deploymentStatus: core.getInput('deployment-status') || 'success',
            workerName: core.getInput('worker-name') || undefined,
            githubToken: core.getInput('github-token', { required: true }),
            customMessage: core.getInput('custom-message') || undefined,
            commentTemplate: core.getInput('comment-template') || undefined,
            updateExisting: core.getInput('update-existing') === 'true',
            commentTag: core.getInput('comment-tag') || 'cloudflare-workers-deployment'
        };
        // Validate deployment URL
        try {
            const url = new URL(inputs.deploymentUrl);
            void url; // Use the variable to satisfy linter
        }
        catch {
            throw new Error(`Invalid deployment URL: ${inputs.deploymentUrl}. Must be a valid HTTPS URL.`);
        }
        if (!inputs.deploymentUrl.startsWith('https://')) {
            throw new Error(`Deployment URL must use HTTPS: ${inputs.deploymentUrl}`);
        }
        // Validate deployment status
        if (!['success', 'failure', 'pending'].includes(inputs.deploymentStatus)) {
            throw new Error(`Invalid deployment status: ${inputs.deploymentStatus}. Must be 'success', 'failure', or 'pending'.`);
        }
        // GitHub token validation is handled by GitHub API
        // Get PR context
        const context = github.context;
        if (context.eventName !== 'pull_request' && context.eventName !== 'issue_comment') {
            throw new Error('This action can only be used on pull_request or issue_comment events');
        }
        const prNumber = context.eventName === 'pull_request' && context.payload.pull_request
            ? context.payload.pull_request.number
            : context.payload.issue?.number;
        if (!prNumber) {
            throw new Error('Unable to determine PR number from context');
        }
        // Initialize GitHub client
        const octokit = github.getOctokit(inputs.githubToken);
        // Generate comment content
        const commentContent = generateCommentContent({
            deploymentUrl: inputs.deploymentUrl,
            deploymentStatus: inputs.deploymentStatus,
            workerName: inputs.workerName,
            customMessage: inputs.customMessage,
            commentTemplate: inputs.commentTemplate,
            commentTag: inputs.commentTag,
            prNumber
        });
        let commentId;
        let commentUrl;
        if (inputs.updateExisting) {
            // Try to find existing comment
            const existingComment = await findExistingComment(octokit, context, inputs.commentTag);
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
            }
            else {
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
        }
        else {
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
        core.setOutput('comment-id', commentId.toString());
        core.setOutput('comment-url', commentUrl);
        // Set summary
        await core.summary
            .addHeading('💬 PR Comment Posted')
            .addTable([
            ['Property', 'Value'],
            ['Comment ID', commentId.toString()],
            ['Comment URL', `[View Comment](${commentUrl})`],
            ['Deployment URL', `[${inputs.deploymentUrl}](${inputs.deploymentUrl})`],
            ['Status', inputs.deploymentStatus === 'success' ? '✅ Success' : '❌ Failed']
        ])
            .write();
        core.info(`✅ Successfully posted comment to PR #${prNumber}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        core.error(`❌ Failed to post comment: ${errorMessage}`);
        // Set failure outputs
        core.setOutput('comment-id', '');
        core.setOutput('comment-url', '');
        // Set failure summary
        await core.summary
            .addHeading('❌ PR Comment Failed')
            .addCodeBlock(errorMessage, 'text')
            .write();
        core.setFailed(errorMessage);
    }
}
/**
 * Generate comment content
 */
function generateCommentContent(params) {
    const { deploymentUrl, deploymentStatus, workerName, customMessage, commentTemplate, commentTag, prNumber } = params;
    if (commentTemplate) {
        // Use custom template
        return commentTemplate
            .replace('{deployment_url}', deploymentUrl)
            .replace('{deployment_status}', deploymentStatus)
            .replace('{worker_name}', workerName || 'N/A')
            .replace('{custom_message}', customMessage || '')
            .replace('{comment_tag}', commentTag)
            .replace('{pr_number}', prNumber.toString());
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
    }
    else {
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
    const prNumber = context.eventName === 'pull_request' && context.payload.pull_request
        ? context.payload.pull_request.number
        : context.payload.issue?.number;
    if (!prNumber) {
        return undefined;
    }
    try {
        const comments = await octokit.rest.issues.listComments({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: prNumber
        });
        return comments.data.find((comment) => comment.body && comment.body.includes(`<!-- ${commentTag} -->`));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        core.warning(`Failed to fetch existing comments: ${errorMessage}`);
        return undefined;
    }
}
// Self-invoking async function to handle top-level await
void run();
