import core from '@actions/core';
// import github from '@actions/github'; // May be needed for future GitHub integration

// Import shared libraries
import { CloudflareApi } from '../shared/lib/cloudflare-api.js';

async function run() {
  try {
    // Get inputs
    const workerPattern = core.getInput('worker-pattern');
    const workerNamesInput = core.getInput('worker-names');
    const apiToken = core.getInput('api-token', { required: true });
    const accountId = core.getInput('account-id', { required: true });
    const dryRun = core.getInput('dry-run') === 'true';
    const maxAgeDays = core.getInput('max-age-days');
    const excludePattern = core.getInput('exclude-pattern');
    const confirmDeletion = core.getInput('confirm-deletion');

    // Validate inputs
    if (!workerPattern && !workerNamesInput) {
      throw new Error('Either worker-pattern or worker-names must be provided');
    }

    if (!dryRun && confirmDeletion !== 'yes') {
      throw new Error('confirm-deletion must be set to "yes" to proceed with actual deletion');
    }

    // Parse worker names
    const specificWorkers = workerNamesInput
      ? workerNamesInput
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    // Initialize Cloudflare API client
    const cf = new CloudflareApi(apiToken, accountId);

    // Get workers to process
    let workersToProcess = [];

    if (specificWorkers.length > 0) {
      // Use specific worker names
      workersToProcess = specificWorkers;
      core.info(`Processing specific workers: ${specificWorkers.join(', ')}`);
    } else if (workerPattern) {
      // Find workers by pattern
      workersToProcess = await cf.findWorkersByPattern(workerPattern);
      core.info(`Found ${workersToProcess.length} workers matching pattern: ${workerPattern}`);
    }

    // Apply exclusion pattern if provided
    if (excludePattern && workersToProcess.length > 0) {
      const excludeRegex = new RegExp(
        `^${excludePattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`
      );
      const beforeExclusion = workersToProcess.length;
      workersToProcess = workersToProcess.filter((name) => !excludeRegex.test(name));
      const excluded = beforeExclusion - workersToProcess.length;
      if (excluded > 0) {
        core.info(`Excluded ${excluded} workers matching exclude pattern: ${excludePattern}`);
      }
    }

    // Apply age filter if provided
    if (maxAgeDays && workersToProcess.length > 0) {
      const maxAgeMs = parseInt(maxAgeDays) * 24 * 60 * 60 * 1000;
      const _cutoffDate = new Date(Date.now() - maxAgeMs);

      // Note: This is a simplified age check. In practice, you'd need to fetch
      // worker metadata to get creation dates. For now, we'll skip this filter.
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

    const deletedWorkers = [];
    const skippedWorkers = [];

    if (dryRun) {
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
      core.summary
        .addHeading('🔍 Cloudflare Workers Cleanup (Dry Run)')
        .addTable([
          ['Property', 'Value'],
          ['Workers Found', workersToProcess.length.toString()],
          ['Mode', 'Dry Run (no deletion)']
        ])
        .addHeading('Workers that would be deleted:')
        .addList(workersToProcess);

      await core.summary.write();
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
          core.error(`❌ Failed to delete ${workerName}: ${error.message}`);
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
      core.summary.addHeading('🗑️ Cloudflare Workers Cleanup').addTable([
        ['Property', 'Value'],
        ['Workers Deleted', deletedWorkers.length.toString()],
        ['Workers Skipped', skippedWorkers.length.toString()],
        ['Total Processed', workersToProcess.length.toString()],
        ['Success Rate', `${Math.round((deletedWorkers.length / workersToProcess.length) * 100)}%`]
      ]);

      if (deletedWorkers.length > 0) {
        core.summary.addHeading('✅ Successfully Deleted Workers:').addList(deletedWorkers);
      }

      if (skippedWorkers.length > 0) {
        core.summary.addHeading('⚠️ Skipped Workers:').addList(skippedWorkers);
      }

      await core.summary.write();

      core.info(
        `✅ Cleanup completed: ${deletedWorkers.length} deleted, ${skippedWorkers.length} skipped`
      );
    }
  } catch (error) {
    core.error(`❌ Cleanup failed: ${error.message}`);

    // Set failure outputs
    core.setOutput('deleted-workers', '[]');
    core.setOutput('deleted-count', '0');
    core.setOutput('skipped-workers', '[]');
    core.setOutput('dry-run-results', '[]');

    // Set failure summary
    core.summary
      .addHeading('❌ Cloudflare Workers Cleanup Failed')
      .addCodeBlock(error.message, 'text');

    await core.summary.write();

    core.setFailed(error.message);
  }
}

// Self-invoking async function to handle top-level await
(async () => {
  await run();
})();
