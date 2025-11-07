export interface SetupOptions {
  wranglerTomlPath: string;
  environmentName: string;
  workerName: string;
  createBackup?: boolean;
  updateVars?: Record<string, string>;
  updateRoutes?: string[];
}
export interface SetupResult {
  backupPath?: string;
  updated: boolean;
}
/**
 * Create a backup of wrangler.toml
 */
export declare function createBackup(tomlPath: string): string;
/**
 * Update worker name in wrangler.toml
 */
export declare function updateWorkerName(
  tomlPath: string,
  environmentName: string,
  workerName: string
): void;
/**
 * Update environment variables in wrangler.toml
 */
export declare function updateEnvVars(
  tomlPath: string,
  environmentName: string,
  vars: Record<string, string>
): void;
/**
 * Update routes in wrangler.toml
 */
export declare function updateRoutes(
  tomlPath: string,
  environmentName: string,
  routes: string[]
): void;
/**
 * Main setup function
 */
export declare function setupPreviewEnvironment(options: SetupOptions): SetupResult;
