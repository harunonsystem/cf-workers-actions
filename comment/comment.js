const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const token = core.getInput('github-token');
    const deploymentUrl = core.getInput('deployment-url');
    const status = core.getInput('deployment-status');
    const customMessage = core.getInput('custom-message');
    
    const octokit = github.getOctokit(token);
    const context = github.context;
    
    if (!context.payload.pull_request) {
      core.info('Not a pull request event');
      return;
    }
    
    const statusIcon = status === 'true' ? '✅' : '❌';
    const statusText = status === 'true' ? 'Success' : 'Failed';
    
    const body = `## 🚀 Preview Deployment

**Preview URL:** ${status === 'true' ? `[${deploymentUrl}](${deploymentUrl})` : 'Deploy failed'}

**Build Status:** ${statusIcon} ${statusText}
**Commit:** ${context.sha.substring(0, 7)}

${customMessage || 'This preview will be automatically updated when you push new commits.'}
`;
    
    const comments = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
    });
    
    const existingComment = comments.data.find(
      comment => comment.user.login === 'github-actions[bot]' &&
                 comment.body.includes('🚀 Preview Deployment')
    );
    
    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: body
      });
      core.info('Updated existing comment');
    } else {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: body
      });
      core.info('Created new comment');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
