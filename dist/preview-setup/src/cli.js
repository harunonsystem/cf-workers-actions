#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const setup_1 = require('./setup');
async function main() {
  try {
    const wranglerTomlPath = process.env.INPUT_WRANGLER_TOML_PATH || 'wrangler.toml';
    const environmentName = process.env.INPUT_ENVIRONMENT_NAME;
    const workerName = process.env.INPUT_WORKER_NAME;
    const createBackup = process.env.INPUT_CREATE_BACKUP !== 'false';
    const updateVarsStr = process.env.INPUT_UPDATE_VARS;
    const updateRoutesStr = process.env.INPUT_UPDATE_ROUTES;
    if (!environmentName) {
      throw new Error('environment-name is required');
    }
    if (!workerName) {
      throw new Error('worker-name is required');
    }
    const updateVars = updateVarsStr ? JSON.parse(updateVarsStr) : undefined;
    const updateRoutes = updateRoutesStr ? JSON.parse(updateRoutesStr) : undefined;
    console.log('Setting up preview environment...');
    console.log(`  Worker name: ${workerName}`);
    console.log(`  Environment: ${environmentName}`);
    console.log(`  Wrangler TOML: ${wranglerTomlPath}`);
    const result = (0, setup_1.setupPreviewEnvironment)({
      wranglerTomlPath,
      environmentName,
      workerName,
      createBackup,
      updateVars,
      updateRoutes
    });
    // Set GitHub Actions outputs
    if (result.backupPath) {
      console.log(`\nbackup-path=${result.backupPath}`);
      console.log(`::set-output name=backup-path::${result.backupPath}`);
    }
    console.log('updated=true');
    console.log('::set-output name=updated::true');
    console.log('\n✅ Preview environment setup completed');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
main();
