import * as core from '@actions/core';
import { CloudflareApi } from '../shared/lib/cloudflare-api';
import { CleanupInputs } from '../shared/types';

async function run(): Promise<void> {
  try {
    // Get inputs
    const inputs: CleanupInputs = {
      workerPattern: core.getInput('worker-pattern') || undefined,
      workerNames: undefined,
      apiToken: core.getInput('cloudflare-api-token', { required: true }),
      accountId: core.getInput('cloudflare-account-id', { required: true }),
      dryRun: core.getInput('dry-run') === 'true',
      maxAgeDays: core.getInput('max-age-days')
        ? parseInt(core.getInput('max-age-days'), 10)
        : undefined,
      excludePattern: core.getInput('exclude-pattern') || undefined,
      confirmDeletion: core.getInput('confirm-deletion')
    };

    // Parse worker names
    const workerNamesInput = core.getInput('worker-names');
    if (workerNamesInput) {
      inputs.workerNames = workerNamesInput
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    }

    // Validate inputs
    if (!inputs.workerPattern && !inputs.workerNames) {
      throw new Error('Either worker-pattern or worker-names must be provided');
    }

    if (!inputs.dryRun && inputs.confirmDeletion !== 'yes') {
      throw new Error('confirm-deletion must be set to "yes" to proceed with actual deletion');
    }

    // Initialize Cloudflare API client
    const cf = new CloudflareApi(inputs.apiToken, inputs.accountId);

    // Get workers to process
    let workersToProcess: string[] = [];

    if (inputs.workerNames && inputs.workerNames.length > 0) {
      // Use specific worker names
      workersToProcess = inputs.workerNames;
      core.info(`Processing specific workers: ${inputs.workerNames.join(', ')}`);
    } else if (inputs.workerPattern) {
      // Find workers by pattern
      workersToProcess = await cf.findWorkersByPattern(inputs.workerPattern);
      core.info(
        `Found ${workersToProcess.length} workers matching pattern: ${inputs.workerPattern}`
      );
    }

    // Apply exclusion pattern if provided
    if (inputs.excludePattern && workersToProcess.length > 0) {
      const excludeRegex = new RegExp(
        `^${inputs.excludePattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`
      );
      const beforeExclusion = workersToProcess.length;
      workersToProcess = workersToProcess.filter((name) => !excludeRegex.test(name));
      const excluded = beforeExclusion - workersToProcess.length;
      if (excluded > 0) {
        core.info(
          `Excluded ${excluded} workers matching exclude pattern: ${inputs.excludePattern}`
        );
      }
    }

    // Apply age filter if provided
    if (inputs.maxAgeDays && workersToProcess.length > 0) {
      // Note: Age-based filtering would require fetching worker metadata to get creation dates.
      // For now, we'll skip this filter as the Cloudflare API doesn't provide creation dates
      // in the simple list workers endpoint.
      core.warning(
        'Age-based filtering is not yet implemented. All matching workers will be processed.'
      );
    }

    if (workersToProcess.length === 0) {
      core.info('No workers found to process');

      // Set empty outputs
      core.setOutput('deleted-workers', '[]');
      core.setOutput('deleted-count', '0');
      core.setOutput('skipped-workers', '[]');
      core.setOutput('dry-run-results', '[]');

      return;
    }

    const deletedWorkers: string[] = [];
    const skippedWorkers: string[] = [];

    if (inputs.dryRun) {
      // Dry run mode - just list what would be deleted
      core.info(`🔍 DRY RUN MODE: Would delete ${workersToProcess.length} workers:`);
      for (const workerName of workersToProcess) {
        core.info(`  - ${workerName}`);
      }

      // Set dry run outputs
      core.setOutput('deleted-workers', '[]');
      core.setOutput('deleted-count', '0');
      core.setOutput('skipped-workers', '[]');
      core.setOutput('dry-run-results', JSON.stringify(workersToProcess));

      // Set summary
      await core.summary
        .addHeading('🔍 Cloudflare Workers Cleanup (Dry Run)')
        .addTable([
          ['Property', 'Value'],
          ['Workers Found', workersToProcess.length.toString()],
          ['Mode', 'Dry Run (no deletion)']
        ])
        .addHeading('Workers that would be deleted:')
        .addList(workersToProcess)
        .write();
    } else {
      // Actual deletion mode
      core.info(`🗑️  Deleting ${workersToProcess.length} workers...`);

      for (const workerName of workersToProcess) {
        try {
          const deleted = await cf.deleteWorker(workerName);
          if (deleted) {
            deletedWorkers.push(workerName);
            core.info(`✅ Deleted: ${workerName}`);
          } else {
            skippedWorkers.push(workerName);
            core.warning(`⚠️  Skipped (not found): ${workerName}`);
          }
        } catch (error) {
          skippedWorkers.push(workerName);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          core.error(`❌ Failed to delete ${workerName}: ${errorMessage}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Set outputs
      core.setOutput('deleted-workers', JSON.stringify(deletedWorkers));
      core.setOutput('deleted-count', deletedWorkers.length.toString());
      core.setOutput('skipped-workers', JSON.stringify(skippedWorkers));
      core.setOutput('dry-run-results', '[]');

      // Set summary
      const table = [
        ['Property', 'Value'],
        ['Workers Deleted', deletedWorkers.length.toString()],
        ['Workers Skipped', skippedWorkers.length.toString()],
        ['Total Processed', workersToProcess.length.toString()],
        ['Success Rate', `${Math.round((deletedWorkers.length / workersToProcess.length) * 100)}%`]
      ];

      let summaryBuilder = core.summary.addHeading('🗑️ Cloudflare Workers Cleanup').addTable(table);

      if (deletedWorkers.length > 0) {
        summaryBuilder = summaryBuilder
          .addHeading('✅ Successfully Deleted Workers:')
          .addList(deletedWorkers);
      }

      if (skippedWorkers.length > 0) {
        summaryBuilder = summaryBuilder.addHeading('⚠️ Skipped Workers:').addList(skippedWorkers);
      }

      await summaryBuilder.write();

      core.info(
        `✅ Cleanup completed: ${deletedWorkers.length} deleted, ${skippedWorkers.length} skipped`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.error(`❌ Cleanup failed: ${errorMessage}`);

    // Set failure outputs
    core.setOutput('deleted-workers', '[]');
    core.setOutput('deleted-count', '0');
    core.setOutput('skipped-workers', '[]');
    core.setOutput('dry-run-results', '[]');

    // Set failure summary
    await core.summary
      .addHeading('❌ Cloudflare Workers Cleanup Failed')
      .addCodeBlock(errorMessage, 'text')
      .write();

    core.setFailed(errorMessage);
  }
}

// Self-invoking async function to handle top-level await
void run();
