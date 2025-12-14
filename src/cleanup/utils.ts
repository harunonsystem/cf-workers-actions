import * as core from '@actions/core';
import { debug, info } from '../shared/lib/logger';
import { parseCommaSeparatedList } from '../shared/lib/string-utils';
import { setOutputsValidated } from '../shared/validation';
import { CleanupOutputSchema } from './schemas';

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
 * Cleanup result (internal use only)
 */
export interface CleanupResult {
  deletedWorkers: string[];
  skippedWorkers: string[];
}

/**
 * Set empty cleanup outputs
 */
export function setEmptyCleanupOutputs(): void {
  setOutputsValidated(CleanupOutputSchema, {
    deletedWorkers: [],
    deletedCount: 0,
    skippedWorkers: [],
    dryRunResults: []
  });
}

/**
 * Set cleanup outputs
 */
export function setCleanupOutputs(result: CleanupResult, isDryRun: boolean): void {
  if (isDryRun) {
    setOutputsValidated(CleanupOutputSchema, {
      deletedWorkers: [],
      deletedCount: 0,
      skippedWorkers: [],
      dryRunResults: result.deletedWorkers
    });
  } else {
    setOutputsValidated(CleanupOutputSchema, {
      deletedWorkers: result.deletedWorkers,
      deletedCount: result.deletedWorkers.length,
      skippedWorkers: result.skippedWorkers,
      dryRunResults: []
    });
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
