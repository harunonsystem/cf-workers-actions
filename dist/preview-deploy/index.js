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
exports.run = run;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const github = __importStar(require("@actions/github"));
const error_handler_1 = require("../shared/lib/error-handler");
const validation_1 = require("../shared/validation");
const schemas_js_1 = require("./schemas.js");
/**
 * Process template variables in worker name
 */
function processTemplate(template, variables) {
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
function getSanitizedBranchName() {
    const ref = process.env.GITHUB_REF || '';
    const branchName = ref.replace(/^refs\/heads\//, '');
    // Replace / with - and remove invalid characters
    return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}
/**
 * Update wrangler.toml with worker name
 */
async function updateWranglerToml(tomlPath, environment, workerName) {
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
    const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
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
        if (line.startsWith('['))
            break; // Next section
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
async function deployWorker(environment, apiToken, accountId) {
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
    }
    catch (error) {
        core.error(`Deployment failed: ${error}`);
        return false;
    }
}
/**
 * Create or update PR comment
 */
async function createOrUpdateComment(prNumber, deploymentUrl, deploymentName, deploymentSuccess) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        core.warning('GITHUB_TOKEN not found, skipping PR comment');
        return;
    }
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    // Find existing comment
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber
    });
    const existingComment = comments.find((comment) => comment.user?.login === 'github-actions[bot]' &&
        comment.body?.includes('🚀 Preview Deployment'));
    const statusIcon = deploymentSuccess ? '✅' : '❌';
    const statusText = deploymentSuccess ? 'Success' : 'Failed';
    const body = `## 🚀 Preview Deployment
  
**Preview URL:** ${deploymentSuccess ? `[${deploymentUrl}](${deploymentUrl})` : 'Deployment Failed'}
**Status:** ${statusIcon} ${statusText}
**Worker Name:** \`${deploymentName}\`
**Environment:** \`${process.env.NODE_ENV || 'preview'}\`

${deploymentSuccess ? 'This preview will be updated on new commits.' : 'Check logs for details.'}`;
    if (existingComment) {
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existingComment.id,
            body
        });
    }
    else {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body
        });
    }
}
async function run() {
    // Variables to hold outputs for error handling
    let workerName = '';
    let deploymentUrl = '';
    let deploymentSuccess = false;
    try {
        // Map and validate inputs
        const rawInputs = (0, validation_1.mapInputs)({
            'cloudflare-api-token': { required: true },
            'cloudflare-account-id': { required: true },
            'worker-name': { required: true },
            environment: { required: false, default: 'preview' },
            domain: { required: false, default: 'workers.dev' },
            'wrangler-toml-path': { required: false, default: './wrangler.toml' }
        });
        const inputs = (0, validation_1.parseInputs)(schemas_js_1.DeployPreviewInputSchema, rawInputs);
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
        deploymentSuccess = await deployWorker(inputs.environment, inputs.cloudflareApiToken, inputs.cloudflareAccountId);
        if (!deploymentSuccess) {
            throw new Error('Deployment failed');
        }
        // Step 4: Comment on PR (if pr-number provided or detected)
        const prNumberInt = prNumber ? parseInt(prNumber, 10) : undefined;
        if (prNumberInt && !Number.isNaN(prNumberInt)) {
            await createOrUpdateComment(prNumberInt, deploymentUrl, workerName, deploymentSuccess);
            core.info('✅ PR comment posted');
        }
        // Set outputs
        core.setOutput('deployment-url', deploymentUrl);
        core.setOutput('deployment-name', workerName);
        core.setOutput('deployment-success', 'true');
        core.info('✅ Deploy preview completed');
    }
    catch (error) {
        await (0, error_handler_1.handleActionError)(error, {
            summaryTitle: 'Deploy Preview Failed',
            outputs: {
                'deployment-url': deploymentUrl,
                'deployment-name': workerName,
                'deployment-success': 'false'
            }
        });
    }
}
// Execute if not in test environment
if (process.env.NODE_ENV !== 'test') {
    void run();
}
