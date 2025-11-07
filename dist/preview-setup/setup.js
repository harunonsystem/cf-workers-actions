"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackup = createBackup;
exports.updateWorkerName = updateWorkerName;
exports.updateEnvVars = updateEnvVars;
exports.updateRoutes = updateRoutes;
exports.setupPreviewEnvironment = setupPreviewEnvironment;
const fs_1 = require("fs");
const fs_2 = require("fs");
/**
 * Create a backup of wrangler.toml
 */
function createBackup(tomlPath) {
    if (!(0, fs_2.existsSync)(tomlPath)) {
        throw new Error(`File not found: ${tomlPath}`);
    }
    const timestamp = Date.now();
    const backupPath = `${tomlPath}.backup.${timestamp}`;
    (0, fs_1.copyFileSync)(tomlPath, backupPath);
    return backupPath;
}
/**
 * Update worker name in wrangler.toml
 */
function updateWorkerName(tomlPath, environmentName, workerName) {
    if (!(0, fs_2.existsSync)(tomlPath)) {
        throw new Error(`File not found: ${tomlPath}`);
    }
    let content = (0, fs_1.readFileSync)(tomlPath, 'utf-8');
    const envSectionRegex = new RegExp(`^\\[env\\.${environmentName}\\]`, 'm');
    if (envSectionRegex.test(content)) {
        // Update existing environment
        const nameRegex = new RegExp(`(\\[env\\.${environmentName}\\][\\s\\S]*?)^name = .*$`, 'm');
        if (nameRegex.test(content)) {
            content = content.replace(nameRegex, `$1name = "${workerName}"`);
        }
        else {
            // Add name to existing environment section
            content = content.replace(envSectionRegex, `[env.${environmentName}]\nname = "${workerName}"`);
        }
    }
    else {
        // Add new environment section
        content += `\n\n[env.${environmentName}]\nname = "${workerName}"\n`;
    }
    (0, fs_1.writeFileSync)(tomlPath, content, 'utf-8');
}
/**
 * Update environment variables in wrangler.toml
 */
function updateEnvVars(tomlPath, environmentName, vars) {
    if (!(0, fs_2.existsSync)(tomlPath)) {
        throw new Error(`File not found: ${tomlPath}`);
    }
    let content = (0, fs_1.readFileSync)(tomlPath, 'utf-8');
    // Add vars section
    const varsSection = Object.entries(vars)
        .map(([key, value]) => `${key} = "${value}"`)
        .join('\n');
    content += `\n[env.${environmentName}.vars]\n${varsSection}\n`;
    (0, fs_1.writeFileSync)(tomlPath, content, 'utf-8');
}
/**
 * Update routes in wrangler.toml
 */
function updateRoutes(tomlPath, environmentName, routes) {
    if (!(0, fs_2.existsSync)(tomlPath)) {
        throw new Error(`File not found: ${tomlPath}`);
    }
    let content = (0, fs_1.readFileSync)(tomlPath, 'utf-8');
    // Add routes
    routes.forEach((route) => {
        content += `\n[[env.${environmentName}.routes]]\npattern = "${route}"\n`;
    });
    (0, fs_1.writeFileSync)(tomlPath, content, 'utf-8');
}
/**
 * Main setup function
 */
function setupPreviewEnvironment(options) {
    const { wranglerTomlPath, environmentName, workerName, createBackup: shouldCreateBackup = true, updateVars, updateRoutes: routesToUpdate } = options;
    const result = {
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
