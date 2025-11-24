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
const fs = __importStar(require("node:fs"));
const core = __importStar(require("@actions/core"));
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
    if (!fs.existsSync(tomlPath)) {
        throw new Error(`wrangler.toml not found at ${tomlPath}`);
    }
    // Create backup
    const backupPath = `${tomlPath}.bak`;
    fs.copyFileSync(tomlPath, backupPath);
    core.info(`✅ Created backup: ${backupPath}`);
    try {
        const content = fs.readFileSync(tomlPath, 'utf8');
        const lines = content.split('\n');
        // Find [env.{environment}] section
        const envSection = `[env.${environment}]`;
        const envIndex = lines.findIndex((line) => line.trim() === envSection);
        if (envIndex === -1) {
            throw new Error(`[env.${environment}] section not found in wrangler.toml. Please add it to your wrangler.toml file.`);
        }
        // Find the next section or end of file
        let nextSectionIndex = lines.length;
        for (let i = envIndex + 1; i < lines.length; i++) {
            if (lines[i].trim().startsWith('[')) {
                nextSectionIndex = i;
                break;
            }
        }
        // Check if name exists in this section
        let nameLineIndex = -1;
        for (let i = envIndex + 1; i < nextSectionIndex; i++) {
            if (lines[i].trim().startsWith('name =')) {
                nameLineIndex = i;
                break;
            }
        }
        if (nameLineIndex >= 0) {
            // Replace existing name
            lines[nameLineIndex] = `name = "${workerName}"`;
            core.info('✅ Updated existing name in wrangler.toml');
        }
        else {
            // Add name after section header
            lines.splice(envIndex + 1, 0, `name = "${workerName}"`);
            core.info('✅ Added name to wrangler.toml');
        }
        // Write back
        fs.writeFileSync(tomlPath, lines.join('\n'));
        core.info('Updated wrangler.toml:');
        core.info(fs.readFileSync(tomlPath, 'utf8'));
    }
    catch (error) {
        // Restore backup on failure
        fs.copyFileSync(backupPath, tomlPath);
        core.error('❌ Failed to update wrangler.toml, restored from backup');
        throw error;
    }
}
async function run() {
    try {
        // Map and validate inputs
        const rawInputs = (0, validation_1.mapInputs)({
            'worker-name': { required: true },
            environment: { required: true },
            domain: { required: false, default: 'workers.dev' },
            'wrangler-toml-path': { required: false, default: './wrangler.toml' }
        });
        const inputs = (0, validation_1.parseInputs)(schemas_js_1.PreparePreviewDeployInputSchema, rawInputs);
        if (!inputs) {
            throw new Error('Input validation failed');
        }
        core.info('🚀 Preparing preview deployment...');
        core.info(`Worker name template: ${inputs.workerName}`);
        core.info(`Environment: ${inputs.environment}`);
        // Get variables for template processing
        const branchName = getSanitizedBranchName();
        // Auto-detect PR number
        const prNumber = github.context.payload.pull_request?.number?.toString();
        core.info(`Branch name (sanitized): ${branchName}`);
        if (prNumber) {
            core.info(`PR number: ${prNumber}`);
        }
        // Process template
        const workerName = processTemplate(inputs.workerName, {
            prNumber,
            branchName
        });
        if (!workerName) {
            throw new Error('Worker name is empty after template processing');
        }
        core.info(`✅ Generated worker name: ${workerName}`);
        // Generate URL
        const deploymentUrl = `https://${workerName}.${inputs.domain}`;
        core.info(`✅ Generated URL: ${deploymentUrl}`);
        // Update wrangler.toml
        await updateWranglerToml(inputs.wranglerTomlPath, inputs.environment, workerName);
        // Set outputs
        core.setOutput('deployment-name', workerName);
        core.setOutput('deployment-url', deploymentUrl);
        core.info('✅ Prepare preview deployment completed');
    }
    catch (error) {
        await (0, error_handler_1.handleActionError)(error, {
            summaryTitle: 'Prepare Preview Deploy Failed',
            outputs: {
                'deployment-name': '',
                'deployment-url': ''
            }
        });
    }
}
// Self-invoking async function to handle top-level await
void run();
