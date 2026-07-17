#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
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

    // GitHub Actions run only the bundled index.js — drop every other ncc byproduct (.d.ts, chunk files, subdirectories)
    const distPath = join(process.cwd(), outDir);
    for (const item of readdirSync(distPath)) {
      if (item !== 'index.js') {
        rmSync(join(distPath, item), { recursive: true, force: true });
      }
    }
  } catch (_error) {
    console.error(`❌ Failed to build ${action}`);
    process.exit(1);
  }
}

// ncc also emits declaration trees outside the per-action output dirs
rmSync(join(process.cwd(), 'dist/shared'), { recursive: true, force: true });

console.log('\n✅ All actions built successfully!');
