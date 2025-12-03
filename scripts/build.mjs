#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const actions = ['cleanup', 'pr-comment', 'prepare-preview-deploy', 'preview-deploy'];

console.log('🔨 Building actions with ncc...\n');

for (const action of actions) {
  const srcPath = `src/${action}/index.ts`;
  const outDir = `dist/${action}`;

  console.log(`📦 Building ${action}...`);
  try {
    execSync(`ncc build ${srcPath} -o ${outDir} -m --no-source-map-register`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Clean up unnecessary .d.ts files and directories
    const distPath = join(process.cwd(), outDir);

    // Remove all subdirectories (they only contain .d.ts files)
    for (const item of [
      'cleanup',
      'pr-comment',
      'prepare-preview-deploy',
      'preview-deploy',
      'shared'
    ]) {
      try {
        rmSync(join(distPath, item), { recursive: true, force: true });
      } catch {
        // Directory might not exist, ignore
      }
    }
  } catch (_error) {
    console.error(`❌ Failed to build ${action}`);
    process.exit(1);
  }
}

console.log('\n✅ All actions built successfully!');
