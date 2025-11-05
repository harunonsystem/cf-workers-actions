import * as core from '@actions/core';
import { setupPreviewEnvironment } from './setup';

async function run(): Promise<void> {
  try {
    // Get inputs
    const wranglerTomlPath = core.getInput('wrangler-toml-path') || 'wrangler.toml';
    const environmentName = core.getInput('environment-name', { required: true });
    const workerName = core.getInput('worker-name', { required: true });
    const createBackup = core.getInput('create-backup') !== 'false';
    const updateVarsStr = core.getInput('update-vars');
    const updateRoutesStr = core.getInput('update-routes');

    const updateVars = updateVarsStr ? JSON.parse(updateVarsStr) : undefined;
    const updateRoutes = updateRoutesStr ? JSON.parse(updateRoutesStr) : undefined;

    core.info('Setting up preview environment...');
    core.info(`  Worker name: ${workerName}`);
    core.info(`  Environment: ${environmentName}`);
    core.info(`  Wrangler TOML: ${wranglerTomlPath}`);

    const result = setupPreviewEnvironment({
      wranglerTomlPath,
      environmentName,
      workerName,
      createBackup,
      updateVars,
      updateRoutes,
    });

    // Set outputs
    if (result.backupPath) {
      core.setOutput('backup-path', result.backupPath);
    }
    core.setOutput('updated', 'true');

    core.info('✅ Preview environment setup completed');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
