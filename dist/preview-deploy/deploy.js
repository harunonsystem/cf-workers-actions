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
exports.deployToCloudflare = deployToCloudflare;
const exec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
/**
 * Deploy to Cloudflare Workers using wrangler
 */
async function deployToCloudflare(apiToken, accountId, environment, workerName) {
    // Set environment variables for wrangler
    process.env.CLOUDFLARE_API_TOKEN = apiToken;
    process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
    let output = '';
    let errorOutput = '';
    const options = {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            },
            stderr: (data) => {
                errorOutput += data.toString();
            }
        },
        ignoreReturnCode: false,
        silent: false
    };
    try {
        // Check if wrangler is available
        try {
            await exec.exec('wrangler', ['--version'], { silent: true });
        }
        catch {
            core.info('Installing wrangler globally...');
            await exec.exec('npm', ['install', '-g', 'wrangler']);
        }
        // Deploy using wrangler
        await exec.exec('wrangler', ['deploy', '--env', environment], options);
        // Extract worker URL from output
        // wrangler output typically contains: "Published <worker-name> (X.X sec)"
        // and "https://<worker-name>.workers.dev"
        const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
        const workerUrl = urlMatch ? urlMatch[0] : `https://${workerName}.workers.dev`;
        // Generate deployment ID (timestamp)
        const deploymentId = Date.now().toString();
        return {
            url: workerUrl,
            deploymentId
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const fullError = errorOutput || errorMessage;
        throw new Error(`Wrangler deployment failed: ${fullError}`, {
            cause: error
        });
    }
}
