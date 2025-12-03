#!/usr/bin/env node
import { execSync } from 'node:child_process';
import path from 'node:path';

const actions = ['cleanup', 'pr-comment', 'prepare-preview-deploy', 'preview-deploy'];

console.log('🔨 Building actions with ncc...\n');

for (const action of actions) {
  const srcPath = `src/${action}/index.ts`;
  const outDir = `dist/${action}`;

  console.log(`📦 Building ${action}...`);
  try {
    execSync(`ncc build ${srcPath} -o ${outDir}`, {
      stdio: 'inherit',
      cwd: path.resolve(process.cwd())
    });
  } catch (_error) {
    console.error(`❌ Failed to build ${action}`);
    process.exit(1);
  }
}

console.log('\n✅ All actions built successfully!');
