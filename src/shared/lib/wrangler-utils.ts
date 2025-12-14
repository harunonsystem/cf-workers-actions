import * as fs from 'node:fs';
import { env } from './env';
import { debug, error, info } from './logger';

/**
 * Update wrangler.toml with worker name for a specific environment
 */
export async function updateWranglerToml(
  tomlPath: string,
  environment: string,
  workerName: string
): Promise<void> {
  if (!fs.existsSync(tomlPath)) {
    throw new Error(`wrangler.toml not found at ${tomlPath}`);
  }

  // Create backup
  const backupPath = `${tomlPath}.bak`;
  fs.copyFileSync(tomlPath, backupPath);
  info(`✅ Created backup: ${backupPath}`);

  try {
    const content = fs.readFileSync(tomlPath, 'utf8');
    const lines = content.split('\n');

    // Find [env.{environment}] section
    const envSection = `[env.${environment}]`;
    const envIndex = lines.findIndex((line) => line.trim() === envSection);

    if (envIndex === -1) {
      throw new Error(
        `[env.${environment}] section not found in wrangler.toml. Please add it to your wrangler.toml file.`
      );
    }

    // Find the next section or end of file
    let nextSectionIndex = lines.length;
    for (let i = envIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith('[')) {
        nextSectionIndex = i;
        break;
      }
    }

    // Check if name exists in this section
    let nameLineIndex = -1;
    for (let i = envIndex + 1; i < nextSectionIndex; i++) {
      if (lines[i].trim().startsWith('name =')) {
        nameLineIndex = i;
        break;
      }
    }

    if (nameLineIndex >= 0) {
      // Replace existing name
      lines[nameLineIndex] = `name = "${workerName}"`;
      info('✅ Updated existing name in wrangler.toml');
    } else {
      // Add name after section header
      lines.splice(envIndex + 1, 0, `name = "${workerName}"`);
      info('✅ Added name to wrangler.toml');
    }

    // Write back
    fs.writeFileSync(tomlPath, lines.join('\n'));

    // Only show full contents in debug mode
    const updatedContent = fs.readFileSync(tomlPath, 'utf8');
    debug(`Updated wrangler.toml:\n${updatedContent}`);
    if (!env.isDebug()) {
      info('✅ Updated wrangler.toml for preview environment');
    }
  } catch (err) {
    // Restore backup on failure
    fs.copyFileSync(backupPath, tomlPath);
    error('❌ Failed to update wrangler.toml, restored from backup');
    throw err;
  }
}
