/**
 * Parse comma-separated string into array of trimmed non-empty strings
 * @param input - Comma-separated string
 * @returns Array of trimmed strings
 */
export function parseCommaSeparatedList(input: string): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
