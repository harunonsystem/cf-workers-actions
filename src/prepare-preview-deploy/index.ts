import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as github from '@actions/github';
import { mapInputs, parseInputs } from '../shared/validation';
import { handleActionError } from '../shared/lib/error-handler';
import { PreparePreviewDeployInputSchema } from './schemas.js';

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
  const ref = process.env.GITHUB_REF || '';
  const branchName = ref.replace(/^refs\/heads\//, '');
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
      throw new Error(
        `[env.${environment}] section not found in wrangler.toml. Please add it to your wrangler.toml file.`
      );
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
    } else {
      // Add name after section header
      lines.splice(envIndex + 1, 0, `name = "${workerName}"`);
      core.info('✅ Added name to wrangler.toml');
    }

    // Write back
    fs.writeFileSync(tomlPath, lines.join('\n'));

    core.info('Updated wrangler.toml:');
    core.info(fs.readFileSync(tomlPath, 'utf8'));
  } catch (error) {
    // Restore backup on failure
    fs.copyFileSync(backupPath, tomlPath);
    core.error('❌ Failed to update wrangler.toml, restored from backup');
    throw error;
  }
}

async function run(): Promise<void> {
  try {
    // Map and validate inputs
    const rawInputs = mapInputs({
      'worker-name': { required: true },
      environment: { required: true },
      domain: { required: false, default: 'workers.dev' },
      'wrangler-toml-path': { required: false, default: './wrangler.toml' }
    });

    const inputs = parseInputs(PreparePreviewDeployInputSchema, rawInputs);
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
  } catch (error) {
    await handleActionError(error, {
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
