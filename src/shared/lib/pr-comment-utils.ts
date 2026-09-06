import * as github from "@actions/github";
import { getBranchName, getCommitSha } from "./github-utils";

export interface PreviewCommentContext {
  branchName: string;
  commitSha: string;
  owner: string;
  repo: string;
}

export interface PreviewCommentDetails {
  deploymentName: string;
  deploymentSuccess: boolean;
  deploymentUrl: string;
}

export interface PreviewCommentRequest extends PreviewCommentDetails {
  prNumber: number;
}

export interface PreviewCommentRecord {
  body?: string | null;
  id: number;
  user?: { login?: string | null } | null;
}

export function getPreviewCommentContext(): PreviewCommentContext {
  const { owner, repo } = github.context.repo;
  return {
    owner,
    repo,
    branchName: getBranchName(),
    commitSha: getCommitSha()
  };
}

export function buildPreviewComment(
  details: PreviewCommentDetails,
  context: PreviewCommentContext
): string {
  const statusIcon = details.deploymentSuccess ? "✅" : "❌";
  const statusText = details.deploymentSuccess ? "Success" : "Failed";

  return `## 🚀 Preview Deployment

**Preview URL:** ${details.deploymentSuccess ? `[${details.deploymentUrl}](${details.deploymentUrl})` : `[Deploy failed - check logs](https://github.com/${context.owner}/${context.repo}/actions)`}

**Build Status:** ${statusIcon} ${statusText}
**Worker Name:** \`${details.deploymentName}\`
**Commit:** ${context.commitSha}
**Branch:** \`${context.branchName}\`

${details.deploymentSuccess ? "This preview will be automatically updated when you push new commits to this PR." : "Please check the workflow logs for details."}`;
}

export function findExistingPreviewComment(
  comments: readonly PreviewCommentRecord[]
): PreviewCommentRecord | undefined {
  return comments.find(
    (comment) =>
      comment.user?.login === "github-actions[bot]" &&
      comment.body?.includes("🚀 Preview Deployment")
  );
}

/**
 * Create or update PR comment with deployment status
 * @returns The comment ID of the created or updated comment
 */
export function createOrUpdatePreviewComment(
  octokit: ReturnType<typeof github.getOctokit>,
  request: PreviewCommentRequest,
  context?: PreviewCommentContext
): Promise<number>;
export function createOrUpdatePreviewComment(
  octokit: ReturnType<typeof github.getOctokit>,
  prNumber: number,
  deploymentUrl: string,
  deploymentName: string,
  deploymentSuccess: boolean
): Promise<number>;
export async function createOrUpdatePreviewComment(
  octokit: ReturnType<typeof github.getOctokit>,
  requestOrPrNumber: PreviewCommentRequest | number,
  deploymentUrlOrContext?: string | PreviewCommentContext,
  deploymentName?: string,
  deploymentSuccess?: boolean
): Promise<number> {
  const request: PreviewCommentRequest =
    typeof requestOrPrNumber === "number"
      ? {
          prNumber: requestOrPrNumber,
          deploymentUrl: deploymentUrlOrContext as string,
          deploymentName: deploymentName as string,
          deploymentSuccess: deploymentSuccess as boolean
        }
      : requestOrPrNumber;
  const resolvedContext =
    typeof deploymentUrlOrContext === "object" && deploymentUrlOrContext
      ? deploymentUrlOrContext
      : getPreviewCommentContext();
  const body = buildPreviewComment(request, resolvedContext);

  // Find existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: resolvedContext.owner,
    repo: resolvedContext.repo,
    issue_number: request.prNumber
  });

  const existingComment = findExistingPreviewComment(comments);

  if (existingComment) {
    // Update existing comment
    await octokit.rest.issues.updateComment({
      owner: resolvedContext.owner,
      repo: resolvedContext.repo,
      comment_id: existingComment.id,
      body
    });
    return existingComment.id;
  } else {
    // Create new comment
    const { data: newComment } = await octokit.rest.issues.createComment({
      owner: resolvedContext.owner,
      repo: resolvedContext.repo,
      issue_number: request.prNumber,
      body
    });
    return newComment.id;
  }
}
