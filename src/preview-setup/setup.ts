import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { existsSync } from 'fs';

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
export function createBackup(tomlPath: string): string {
  if (!existsSync(tomlPath)) {
    throw new Error(`File not found: ${tomlPath}`);
  }

  const timestamp = Date.now();
  const backupPath = `${tomlPath}.backup.${timestamp}`;

  copyFileSync(tomlPath, backupPath);

  return backupPath;
}

/**
 * Update worker name in wrangler.toml
 */
export function updateWorkerName(
  tomlPath: string,
  environmentName: string,
  workerName: string
): void {
  if (!existsSync(tomlPath)) {
    throw new Error(`File not found: ${tomlPath}`);
  }

  let content = readFileSync(tomlPath, 'utf-8');
  const envSectionRegex = new RegExp(`^\\[env\\.${environmentName}\\]`, 'm');

  if (envSectionRegex.test(content)) {
    // Update existing environment
    const nameRegex = new RegExp(`(\\[env\\.${environmentName}\\][\\s\\S]*?)^name = .*$`, 'm');

    if (nameRegex.test(content)) {
      content = content.replace(nameRegex, `$1name = "${workerName}"`);
    } else {
      // Add name to existing environment section
      content = content.replace(
        envSectionRegex,
        `[env.${environmentName}]\nname = "${workerName}"`
      );
    }
  } else {
    // Add new environment section
    content += `\n\n[env.${environmentName}]\nname = "${workerName}"\n`;
  }

  writeFileSync(tomlPath, content, 'utf-8');
}

/**
 * Update environment variables in wrangler.toml
 */
export function updateEnvVars(
  tomlPath: string,
  environmentName: string,
  vars: Record<string, string>
): void {
  if (!existsSync(tomlPath)) {
    throw new Error(`File not found: ${tomlPath}`);
  }

  let content = readFileSync(tomlPath, 'utf-8');

  // Add vars section
  const varsSection = Object.entries(vars)
    .map(([key, value]) => `${key} = "${value}"`)
    .join('\n');

  content += `\n[env.${environmentName}.vars]\n${varsSection}\n`;

  writeFileSync(tomlPath, content, 'utf-8');
}

/**
 * Update routes in wrangler.toml
 */
export function updateRoutes(tomlPath: string, environmentName: string, routes: string[]): void {
  if (!existsSync(tomlPath)) {
    throw new Error(`File not found: ${tomlPath}`);
  }

  let content = readFileSync(tomlPath, 'utf-8');

  // Add routes
  routes.forEach((route) => {
    content += `\n[[env.${environmentName}.routes]]\npattern = "${route}"\n`;
  });

  writeFileSync(tomlPath, content, 'utf-8');
}

/**
 * Main setup function
 */
export function setupPreviewEnvironment(options: SetupOptions): SetupResult {
  const {
    wranglerTomlPath,
    environmentName,
    workerName,
    createBackup: shouldCreateBackup = true,
    updateVars,
    updateRoutes: routesToUpdate
  } = options;

  const result: SetupResult = {
    updated: false
  };

  // Create backup if requested
  if (shouldCreateBackup) {
    result.backupPath = createBackup(wranglerTomlPath);
  }

  // Update worker name
  updateWorkerName(wranglerTomlPath, environmentName, workerName);
  result.updated = true;

  // Update environment variables if provided
  if (updateVars && Object.keys(updateVars).length > 0) {
    updateEnvVars(wranglerTomlPath, environmentName, updateVars);
  }

  // Update routes if provided
  if (routesToUpdate && routesToUpdate.length > 0) {
    updateRoutes(wranglerTomlPath, environmentName, routesToUpdate);
  }

  return result;
}
