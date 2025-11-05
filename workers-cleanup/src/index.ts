import * as core from '@actions/core';
import { cleanupWorkers } from './cleanup';

async function run(): Promise<void> {
  try {
    // Get inputs
    const mode = core.getInput('cleanup-mode', { required: true }) as 'pr-linked' | 'manual' | 'batch';
    const accountId = core.getInput('cloudflare-account-id', { required: true });
    const apiToken = core.getInput('cloudflare-api-token', { required: true });
    const prNumberStr = core.getInput('pr-number');
    const workerNamePrefix = core.getInput('worker-name-prefix') || 'preview';
    const workerNamesStr = core.getInput('worker-names');
    const batchPattern = core.getInput('batch-pattern');
    const excludeWorkersStr = core.getInput('exclude-workers');
    const dryRun = core.getInput('dry-run') === 'true';

    const prNumber = prNumberStr ? parseInt(prNumberStr, 10) : undefined;
    const workerNames = workerNamesStr ? workerNamesStr.split(',').map(s => s.trim()) : undefined;
    const excludeWorkers = excludeWorkersStr ? excludeWorkersStr.split(',').map(s => s.trim()) : undefined;

    core.info(`Cleanup mode: ${mode}`);
    core.info(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
    core.info('');

    const result = await cleanupWorkers({
      mode,
      accountId,
      apiToken,
      prNumber,
      workerNamePrefix,
      workerNames,
      batchPattern,
      excludeWorkers,
      dryRun,
    });

    // Set outputs
    core.setOutput('deleted-count', result.deleted.toString());
    core.setOutput('skipped-count', result.skipped.toString());
    core.setOutput('deleted-workers', JSON.stringify(result.deletedNames));

    core.info('');
    core.info('=== Cleanup Summary ===');
    core.info(`Deleted: ${result.deleted}`);
    core.info(`Skipped: ${result.skipped}`);
    core.info(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      core.error('Errors encountered:');
      result.errors.forEach(error => core.error(`  - ${error}`));
      core.setFailed('Cleanup completed with errors');
    } else {
      core.info('');
      core.info('✅ Cleanup completed successfully');
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
