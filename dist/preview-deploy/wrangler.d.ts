/**
 * Update wrangler.toml with worker name for the specified environment
 */
export declare function updateWranglerToml(tomlPath: string, environmentName: string, workerName: string): void;
/**
 * Restore wrangler.toml from backup
 */
export declare function restoreWranglerToml(tomlPath: string, backupPath: string): void;
