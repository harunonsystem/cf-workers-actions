const core = require("@actions/core");
const { exec } = require("@actions/exec");
const fs = require("fs").promises;
const path = require("path");

/**
 * Wrangler CLI wrapper for deployment operations
 */
class WranglerClient {
  constructor(apiToken, accountId) {
    if (!apiToken || !accountId) {
      throw new Error("API token and account ID are required");
    }

    this.apiToken = apiToken;
    this.accountId = accountId;
    this.env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    };
  }

  /**
   * Execute wrangler command
   * @param {Array<string>} args - Command arguments
   * @param {object} options - Execution options
   * @returns {Promise<object>} Execution result
   */
  async execWrangler(args, options = {}) {
    const cmd = "npx";
    const cmdArgs = ["wrangler", ...args];

    let stdout = "";
    let stderr = "";

    const execOptions = {
      env: this.env,
      cwd: options.cwd || process.cwd(),
      listeners: {
        stdout: (data) => {
          stdout += data.toString();
        },
        stderr: (data) => {
          stderr += data.toString();
        },
      },
      ignoreReturnCode: true,
      ...options,
    };

    core.debug(`Executing: ${cmd} ${cmdArgs.join(" ")}`);
    const exitCode = await exec(cmd, cmdArgs, execOptions);

    return {
      exitCode,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  }

  /**
   * Deploy worker using wrangler
   * @param {object} config - Deployment configuration
   * @returns {Promise<object>} Deployment result
   */
  async deployWorker(config) {
    const {
      workerName,
      scriptPath,
      environment = "production",
      vars = {},
      secrets = {},
      compatibility_date = new Date().toISOString().split("T")[0],
    } = config;

    // Create wrangler.toml if it doesn't exist
    const wranglerTomlPath = path.join(process.cwd(), "wrangler.toml");
    const wranglerConfig = `
name = "${workerName}"
main = "${scriptPath || "index.js"}"
compatibility_date = "${compatibility_date}"
account_id = "${this.accountId}"

[env.${environment}]
name = "${workerName}"
${Object.entries(vars)
  .map(([key, value]) => `vars.${key} = "${value}"`)
  .join("\n")}
`;

    try {
      await fs.writeFile(wranglerTomlPath, wranglerConfig.trim());
      core.debug(`Created wrangler.toml: ${wranglerConfig}`);

      // Set secrets if provided
      for (const [key, value] of Object.entries(secrets)) {
        await this.setSecret(key, value, environment);
      }

      // Deploy
      const deployArgs = ["deploy"];
      if (environment !== "production") {
        deployArgs.push("--env", environment);
      }

      const result = await this.execWrangler(deployArgs);

      if (result.exitCode !== 0) {
        throw new Error(`Deployment failed: ${result.stderr || result.stdout}`);
      }

      // Extract URL from output
      const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : null;

      core.info(`Successfully deployed worker: ${workerName}`);
      if (deploymentUrl) {
        core.info(`Deployment URL: ${deploymentUrl}`);
      }

      return {
        success: true,
        workerName,
        url: deploymentUrl,
        output: result.stdout,
      };
    } catch (error) {
      core.error(`Deployment failed: ${error.message}`);
      throw error;
    } finally {
      // Clean up wrangler.toml
      try {
        await fs.unlink(wranglerTomlPath);
      } catch (cleanupError) {
        core.warning(
          `Failed to clean up wrangler.toml: ${cleanupError.message}`,
        );
      }
    }
  }

  /**
   * Set worker secret
   * @param {string} key - Secret key
   * @param {string} value - Secret value
   * @param {string} environment - Environment name
   */
  async setSecret(key, value, environment = "production") {
    const args = ["secret", "put", key];
    if (environment !== "production") {
      args.push("--env", environment);
    }

    const result = await this.execWrangler(args, {
      input: Buffer.from(value),
    });

    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to set secret ${key}: ${result.stderr || result.stdout}`,
      );
    }

    core.debug(`Set secret: ${key}`);
  }

  /**
   * Check if wrangler is available
   * @returns {Promise<boolean>} Availability status
   */
  async checkWranglerAvailable() {
    try {
      const result = await this.execWrangler(["--version"]);
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = { WranglerClient };
