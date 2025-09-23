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
const url_generator_1 = require("../shared/lib/url-generator");
const wrangler_1 = require("../shared/lib/wrangler");
async function run() {
    try {
        // Get inputs
        const inputs = {
            environment: core.getInput('environment', { required: true }),
            workerNamePattern: core.getInput('worker-name-pattern') || 'project-pr-{pr_number}',
            scriptPath: core.getInput('script-path') || 'index.js',
            apiToken: core.getInput('cloudflare-api-token', { required: true }),
            accountId: core.getInput('cloudflare-account-id', { required: true }),
            subdomain: core.getInput('subdomain') || undefined,
            vars: {},
            secrets: {},
            compatibilityDate: core.getInput('compatibility-date') || undefined
        };
        // Parse JSON inputs
        const varsInput = core.getInput('vars') || '{}';
        const secretsInput = core.getInput('secrets') || '{}';
        try {
            inputs.vars = JSON.parse(varsInput);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            core.warning(`Failed to parse vars JSON: ${errorMessage}`);
        }
        try {
            inputs.secrets = JSON.parse(secretsInput);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            core.warning(`Failed to parse secrets JSON: ${errorMessage}`);
        }
        // Generate worker name
        let workerName;
        if (inputs.environment === 'production') {
            // For production, use a simple name without PR number
            workerName = inputs.workerNamePattern.replace('-{pr_number}', '').replace('{pr_number}', '');
        }
        else {
            // For preview, generate from PR number
            const prNumber = (0, url_generator_1.getPrNumber)(github.context);
            workerName = (0, url_generator_1.generateWorkerName)(inputs.workerNamePattern, prNumber);
        }
        core.info(`Deploying worker: ${workerName} (environment: ${inputs.environment})`);
        // Initialize Wrangler client
        const wrangler = new wrangler_1.WranglerClient(inputs.apiToken, inputs.accountId);
        // Check if wrangler is available
        const wranglerAvailable = await wrangler.checkWranglerAvailable();
        if (!wranglerAvailable) {
            throw new Error('Wrangler CLI is not available. Please install it first.');
        }
        // Deploy configuration
        const deployConfig = {
            workerName,
            scriptPath: inputs.scriptPath,
            environment: inputs.environment,
            vars: inputs.vars,
            secrets: inputs.secrets,
            compatibility_date: inputs.compatibilityDate
        };
        // Deploy worker
        const deployResult = await wrangler.deployWorker(deployConfig);
        if (!deployResult.success) {
            throw new Error(`Deployment failed: ${deployResult.error || 'Unknown error'}`);
        }
        // Generate URL if not returned by wrangler
        let deploymentUrl = deployResult.url;
        if (!deploymentUrl) {
            deploymentUrl = (0, url_generator_1.generateWorkerUrl)(workerName, inputs.subdomain);
        }
        // Generate unique deployment ID
        const deploymentId = `${workerName}-${Date.now()}`;
        // Set outputs
        core.setOutput('url', deploymentUrl);
        core.setOutput('worker-name', workerName);
        core.setOutput('success', 'true');
        core.setOutput('deployment-id', deploymentId);
        // Set summary
        await core.summary
            .addHeading('🚀 Cloudflare Workers Deployment')
            .addTable([
            ['Property', 'Value'],
            ['Worker Name', workerName],
            ['Environment', inputs.environment],
            ['URL', `[${deploymentUrl}](${deploymentUrl})`],
            ['Deployment ID', deploymentId],
            ['Status', '✅ Success']
        ])
            .write();
        core.info(`✅ Successfully deployed worker: ${workerName}`);
        core.info(`🔗 Deployment URL: ${deploymentUrl}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        core.error(`❌ Deployment failed: ${errorMessage}`);
        // Set failure outputs
        core.setOutput('success', 'false');
        core.setOutput('url', '');
        core.setOutput('worker-name', '');
        core.setOutput('deployment-id', '');
        // Set failure summary
        await core.summary
            .addHeading('❌ Cloudflare Workers Deployment Failed')
            .addCodeBlock(errorMessage, 'text')
            .write();
        core.setFailed(errorMessage);
    }
}
// Self-invoking async function to handle top-level await
void run();
