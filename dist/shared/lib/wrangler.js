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
exports.WranglerClient = void 0;
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
/**
 * Wrangler CLI wrapper for deployment operations
 */
class WranglerClient {
    apiToken;
    accountId;
    env;
    constructor(apiToken, accountId) {
        if (!apiToken || !accountId) {
            throw new Error('API token and account ID are required');
        }
        this.apiToken = apiToken;
        this.accountId = accountId;
        this.env = {
            ...process.env,
            CLOUDFLARE_API_TOKEN: apiToken,
            CLOUDFLARE_ACCOUNT_ID: accountId
        };
    }
    /**
     * Execute wrangler command
     */
    async execWrangler(args, options = {}) {
        const cmd = 'npx';
        const cmdArgs = ['wrangler', ...args];
        let stdout = '';
        let stderr = '';
        const execOptions = {
            env: this.env,
            cwd: options.cwd || process.cwd(),
            listeners: {
                stdout: (data) => {
                    stdout += data.toString();
                },
                stderr: (data) => {
                    stderr += data.toString();
                }
            },
            ignoreReturnCode: true,
            input: options.input
        };
        core.debug(`Executing: ${cmd} ${cmdArgs.join(' ')}`);
        const exitCode = await (0, exec_1.exec)(cmd, cmdArgs, execOptions);
        return {
            exitCode,
            stdout: stdout.trim(),
            stderr: stderr.trim()
        };
    }
    /**
     * Deploy worker using wrangler
     */
    async deployWorker(config) {
        const { workerName, environment = 'production', secrets = {} } = config;
        try {
            // Set secrets if provided
            for (const [key, value] of Object.entries(secrets)) {
                await this.setSecret(key, value, environment);
            }
            // Deploy
            const deployArgs = ['deploy'];
            if (environment !== 'production') {
                deployArgs.push('--env', environment);
            }
            const result = await this.execWrangler(deployArgs);
            if (result.exitCode !== 0) {
                return {
                    success: false,
                    workerName,
                    output: result.stdout,
                    error: result.stderr || result.stdout
                };
            }
            // Extract URL from output
            const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
            const deploymentUrl = urlMatch ? urlMatch[0] : undefined;
            core.info(`Successfully deployed worker: ${workerName}`);
            if (deploymentUrl) {
                core.info(`Deployment URL: ${deploymentUrl}`);
            }
            return {
                success: true,
                workerName,
                url: deploymentUrl,
                output: result.stdout
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            core.error(`Deployment failed: ${errorMessage}`);
            return {
                success: false,
                workerName,
                output: '',
                error: errorMessage
            };
        }
    }
    /**
     * Set worker secret
     */
    async setSecret(key, value, environment = 'production') {
        const args = ['secret', 'put', key];
        if (environment !== 'production') {
            args.push('--env', environment);
        }
        const result = await this.execWrangler(args, {
            input: Buffer.from(value)
        });
        if (result.exitCode !== 0) {
            throw new Error(`Failed to set secret ${key}: ${result.stderr || result.stdout}`);
        }
        core.debug(`Set secret: ${key}`);
    }
    /**
     * Check if wrangler is available
     */
    async checkWranglerAvailable() {
        try {
            const result = await this.execWrangler(['--version']);
            return result.exitCode === 0;
        }
        catch {
            return false;
        }
    }
}
exports.WranglerClient = WranglerClient;
