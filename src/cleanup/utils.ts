import * as core from '@actions/core';
import { debug, info } from '../shared/lib/logger';
import { parseCommaSeparatedList } from '../shared/lib/string-utils';

/**
 * Parse worker names from various input formats
 * Priority: full names > prefix+numbers
 */
export function parseWorkerNamesInput(
  workerNamesInput: string,
  workerNumbersInput: string,
  workerPrefix: string
): string[] | undefined {
  if (workerNamesInput) {
    return parseCommaSeparatedList(workerNamesInput);
  }

  if (workerNumbersInput && workerPrefix) {
    const numbers = parseCommaSeparatedList(workerNumbersInput);
    return numbers.map((num) => `${workerPrefix}${num}`);
  }

  return undefined;
}

/**
 * Exclusion filter for worker names (internal use only)
 */
interface ExclusionFilter {
  exactNames: Set<string>;
  patterns: RegExp[];
}

/**
 * Create exclusion filter from comma-separated string
 * Supports exact names and glob patterns (* and ?)
 */
export function createExclusionFilter(excludeInput: string | undefined): ExclusionFilter {
  const filter: ExclusionFilter = {
    exactNames: new Set<string>(),
    patterns: []
  };

  if (!excludeInput) {
    return filter;
  }

  const items = parseCommaSeparatedList(excludeInput);
  const exactNames: string[] = [];
  const patternStrings: string[] = [];

  for (const item of items) {
    if (item.includes('*') || item.includes('?')) {
      patternStrings.push(item);
      filter.patterns.push(new RegExp(`^${item.replace(/\*/g, '.*').replace(/\?/g, '.')}$`));
    } else {
      exactNames.push(item);
      filter.exactNames.add(item);
    }
  }

  if (exactNames.length > 0) {
    info(`⏭️  Excluded workers (exact): ${exactNames.join(', ')}`);
  }
  if (patternStrings.length > 0) {
    info(`⏭️  Excluded patterns: ${patternStrings.join(', ')}`);
  }

  return filter;
}

/**
 * Filter workers by exclusion filter
 */
export function filterWorkersByExclusion(workers: string[], filter: ExclusionFilter): string[] {
  if (workers.length === 0) {
    return workers;
  }

  const beforeCount = workers.length;

  const filtered = workers.filter((name) => {
    // Check exact excluded names
    if (filter.exactNames.has(name)) {
      debug(`⏭️  Excluded: ${name} (exact match)`);
      return false;
    }

    // Check excluded patterns
    for (const pattern of filter.patterns) {
      if (pattern.test(name)) {
        debug(`⏭️  Excluded: ${name} (matches pattern)`);
        return false;
      }
    }

    return true;
  });

  const excludedCount = beforeCount - filtered.length;
  if (excludedCount > 0) {
    info(`⏭️  Total excluded workers: ${excludedCount}`);
  }

  return filtered;
}

/**
 * Cleanup output keys (internal use only)
 */
const CLEANUP_OUTPUT_KEYS = {
  DELETED_WORKERS: 'deleted-workers',
  DELETED_COUNT: 'deleted-count',
  SKIPPED_WORKERS: 'skipped-workers',
  DRY_RUN_RESULTS: 'dry-run-results'
} as const;

/**
 * Set empty cleanup outputs
 */
export function setEmptyCleanupOutputs(): void {
  core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_WORKERS, '[]');
  core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_COUNT, '0');
  core.setOutput(CLEANUP_OUTPUT_KEYS.SKIPPED_WORKERS, '[]');
  core.setOutput(CLEANUP_OUTPUT_KEYS.DRY_RUN_RESULTS, '[]');
}

/**
 * Cleanup result (internal use only)
 */
interface CleanupResult {
  deletedWorkers: string[];
  skippedWorkers: string[];
}

/**
 * Set cleanup outputs
 */
export function setCleanupOutputs(result: CleanupResult, isDryRun: boolean): void {
  if (isDryRun) {
    core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_WORKERS, '[]');
    core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_COUNT, '0');
    core.setOutput(CLEANUP_OUTPUT_KEYS.SKIPPED_WORKERS, '[]');
    // For dry run, deletedWorkers contains workers that would be deleted
    core.setOutput(CLEANUP_OUTPUT_KEYS.DRY_RUN_RESULTS, JSON.stringify(result.deletedWorkers));
  } else {
    core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_WORKERS, JSON.stringify(result.deletedWorkers));
    core.setOutput(CLEANUP_OUTPUT_KEYS.DELETED_COUNT, result.deletedWorkers.length.toString());
    core.setOutput(CLEANUP_OUTPUT_KEYS.SKIPPED_WORKERS, JSON.stringify(result.skippedWorkers));
    core.setOutput(CLEANUP_OUTPUT_KEYS.DRY_RUN_RESULTS, '[]');
  }
}

/**
 * Create dry run summary
 */
export async function createDryRunSummary(workers: string[]): Promise<void> {
  await core.summary
    .addHeading('🔍 Cloudflare Workers Cleanup (Dry Run)')
    .addTable([
      ['Property', 'Value'],
      ['Workers Found', workers.length.toString()],
      ['Mode', 'Dry Run (no deletion)']
    ])
    .addHeading('Workers that would be deleted:')
    .addList(workers)
    .write();
}

/**
 * Create cleanup summary
 */
export async function createCleanupSummary(
  result: CleanupResult,
  totalProcessed: number
): Promise<void> {
  const table = [
    ['Property', 'Value'],
    ['Workers Deleted', result.deletedWorkers.length.toString()],
    ['Workers Skipped', result.skippedWorkers.length.toString()],
    ['Total Processed', totalProcessed.toString()],
    ['Success Rate', `${Math.round((result.deletedWorkers.length / totalProcessed) * 100)}%`]
  ];

  let summaryBuilder = core.summary.addHeading('🗑️ Cloudflare Workers Cleanup').addTable(table);

  if (result.deletedWorkers.length > 0) {
    summaryBuilder = summaryBuilder
      .addHeading('✅ Successfully Deleted Workers:')
      .addList(result.deletedWorkers);
  }

  if (result.skippedWorkers.length > 0) {
    summaryBuilder = summaryBuilder.addHeading('⚠️ Skipped Workers:').addList(result.skippedWorkers);
  }

  await summaryBuilder.write();
}
