import * as fs from "node:fs";
import { env } from "./env";
import { debug, error, info } from "./logger";

export interface WranglerFileSystem {
  existsSync(path: string): boolean;
  copyFileSync(source: string, destination: string): void;
  readFileSync(path: string, encoding: "utf8"): string;
  writeFileSync(path: string, content: string): void;
}

const nodeFileSystem: WranglerFileSystem = {
  existsSync: fs.existsSync,
  copyFileSync: fs.copyFileSync,
  readFileSync: (path, encoding) => fs.readFileSync(path, encoding),
  writeFileSync: fs.writeFileSync
};

interface WranglerContentUpdate {
  content: string;
  operation: "updated" | "added";
}

function updateWranglerTomlDocument(
  content: string,
  environment: string,
  workerName: string
): WranglerContentUpdate {
  const lines = content.split("\n");
  const envSection = `[env.${environment}]`;
  const envIndex = lines.findIndex((line) => line.trim() === envSection);

  if (envIndex === -1) {
    throw new Error(
      `[env.${environment}] section not found in wrangler.toml. Please add it to your wrangler.toml file.`
    );
  }

  let nextSectionIndex = lines.length;
  for (let i = envIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("[")) {
      nextSectionIndex = i;
      break;
    }
  }

  let nameLineIndex = -1;
  for (let i = envIndex + 1; i < nextSectionIndex; i++) {
    if (lines[i].trim().startsWith("name =")) {
      nameLineIndex = i;
      break;
    }
  }

  if (nameLineIndex >= 0) {
    lines[nameLineIndex] = `name = "${workerName}"`;
    return { content: lines.join("\n"), operation: "updated" };
  }

  lines.splice(envIndex + 1, 0, `name = "${workerName}"`);
  return { content: lines.join("\n"), operation: "added" };
}

export function updateWranglerTomlContent(
  content: string,
  environment: string,
  workerName: string
): string {
  return updateWranglerTomlDocument(content, environment, workerName).content;
}

/**
 * Update wrangler.toml with worker name for a specific environment
 */
export async function updateWranglerToml(
  tomlPath: string,
  environment: string,
  workerName: string,
  fileSystem: WranglerFileSystem = nodeFileSystem
): Promise<void> {
  if (!fileSystem.existsSync(tomlPath)) {
    throw new Error(`wrangler.toml not found at ${tomlPath}`);
  }

  // Create backup
  const backupPath = `${tomlPath}.bak`;
  fileSystem.copyFileSync(tomlPath, backupPath);
  info(`✅ Created backup: ${backupPath}`);

  try {
    const content = fileSystem.readFileSync(tomlPath, "utf8");
    const update = updateWranglerTomlDocument(content, environment, workerName);

    if (update.operation === "updated") {
      info("✅ Updated existing name in wrangler.toml");
    } else {
      info("✅ Added name to wrangler.toml");
    }

    // Write back
    fileSystem.writeFileSync(tomlPath, update.content);

    // Only show full contents in debug mode
    const updatedContent = fileSystem.readFileSync(tomlPath, "utf8");
    debug(`Updated wrangler.toml:\n${updatedContent}`);
    if (!env.isDebug()) {
      info("✅ Updated wrangler.toml for preview environment");
    }
  } catch (err) {
    // Restore backup on failure
    fileSystem.copyFileSync(backupPath, tomlPath);
    error("❌ Failed to update wrangler.toml, restored from backup");
    throw err;
  }
}
