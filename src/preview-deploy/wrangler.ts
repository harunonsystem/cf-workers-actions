import * as fs from 'fs';
import * as core from '@actions/core';

/**
 * Update wrangler.toml with worker name for the specified environment
 */
export function updateWranglerToml(
  tomlPath: string,
  environmentName: string,
  workerName: string
): void {
  if (!fs.existsSync(tomlPath)) {
    throw new Error(`wrangler.toml not found at: ${tomlPath}`);
  }

  let content = fs.readFileSync(tomlPath, 'utf-8');

  // Check if environment section exists
  const envSectionRegex = new RegExp(`^\\[env\\.${environmentName}\\]`, 'm');

  if (envSectionRegex.test(content)) {
    // Update existing environment
    const nameRegex = new RegExp(`(\\[env\\.${environmentName}\\][\\s\\S]*?)^name = .*$`, 'm');

    if (nameRegex.test(content)) {
      // Replace existing name
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

  fs.writeFileSync(tomlPath, content, 'utf-8');
}

/**
 * Restore wrangler.toml from backup
 */
export function restoreWranglerToml(tomlPath: string, backupPath: string): void {
  try {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, tomlPath);
      fs.unlinkSync(backupPath); // Remove backup file
      core.info(`♻️ Restored wrangler.toml from backup`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    core.warning(`Failed to restore wrangler.toml: ${errorMessage}`);
  }
}
