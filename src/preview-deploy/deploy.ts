import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { DeploymentResult } from './types';

/**
 * Deploy to Cloudflare Workers using wrangler
 */
export async function deployToCloudflare(
  apiToken: string,
  accountId: string,
  environment: string,
  workerName: string
): Promise<DeploymentResult> {
  // Set environment variables for wrangler
  process.env.CLOUDFLARE_API_TOKEN = apiToken;
  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;

  let output = '';
  let errorOutput = '';

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString();
      },
      stderr: (data: Buffer) => {
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
    } catch {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fullError = errorOutput || errorMessage;

    throw new Error(`Wrangler deployment failed: ${fullError}`, {
      cause: error
    });
  }
}
