"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWranglerToml = updateWranglerToml;
exports.restoreWranglerToml = restoreWranglerToml;
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
/**
 * Update wrangler.toml with worker name for the specified environment
 */
function updateWranglerToml(tomlPath, environmentName, workerName) {
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
    fs.writeFileSync(tomlPath, content, 'utf-8');
}
/**
 * Restore wrangler.toml from backup
 */
function restoreWranglerToml(tomlPath, backupPath) {
    try {
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, tomlPath);
            fs.unlinkSync(backupPath); // Remove backup file
            core.info(`♻️ Restored wrangler.toml from backup`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        core.warning(`Failed to restore wrangler.toml: ${errorMessage}`);
    }
}
