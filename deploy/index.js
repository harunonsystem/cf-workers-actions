const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");

// Import shared libraries
const {
  generateWorkerName,
  generateWorkerUrl,
  getPrNumber,
} = require("../shared/lib/url-generator");
const { WranglerClient } = require("../shared/lib/wrangler");
const { CloudflareApi } = require("../shared/lib/cloudflare-api");

async function run() {
  try {
    // Get inputs
    const environment = core.getInput("environment", { required: true });
    const workerNamePattern =
      core.getInput("worker-name-pattern") || "project-pr-{pr_number}";
    const scriptPath = core.getInput("script-path") || "index.js";
    const apiToken = core.getInput("api-token", { required: true });
    const accountId = core.getInput("account-id", { required: true });
    const subdomain = core.getInput("subdomain");
    const varsInput = core.getInput("vars") || "{}";
    const secretsInput = core.getInput("secrets") || "{}";
    const compatibilityDate = core.getInput("compatibility-date");

    // Parse JSON inputs
    let vars = {};
    let secrets = {};

    try {
      vars = JSON.parse(varsInput);
    } catch (error) {
      core.warning(`Failed to parse vars JSON: ${error.message}`);
    }

    try {
      secrets = JSON.parse(secretsInput);
    } catch (error) {
      core.warning(`Failed to parse secrets JSON: ${error.message}`);
    }

    // Generate worker name
    let workerName;
    if (environment === "production") {
      // For production, use a simple name without PR number
      workerName = workerNamePattern
        .replace("-{pr_number}", "")
        .replace("{pr_number}", "");
    } else {
      // For preview, generate from PR number
      const prNumber = getPrNumber(github.context);
      workerName = generateWorkerName(workerNamePattern, prNumber);
    }

    core.info(`Deploying worker: ${workerName} (environment: ${environment})`);

    // Initialize Wrangler client
    const wrangler = new WranglerClient(apiToken, accountId);

    // Check if wrangler is available
    const wranglerAvailable = await wrangler.checkWranglerAvailable();
    if (!wranglerAvailable) {
      throw new Error(
        "Wrangler CLI is not available. Please install it first.",
      );
    }

    // Deploy configuration
    const deployConfig = {
      workerName,
      scriptPath,
      environment,
      vars,
      secrets,
      compatibility_date: compatibilityDate,
    };

    // Deploy worker
    const deployResult = await wrangler.deployWorker(deployConfig);

    if (!deployResult.success) {
      throw new Error(
        `Deployment failed: ${deployResult.error || "Unknown error"}`,
      );
    }

    // Generate URL if not returned by wrangler
    let deploymentUrl = deployResult.url;
    if (!deploymentUrl) {
      deploymentUrl = generateWorkerUrl(workerName, subdomain);
    }

    // Generate unique deployment ID
    const deploymentId = `${workerName}-${Date.now()}`;

    // Set outputs
    core.setOutput("url", deploymentUrl);
    core.setOutput("worker-name", workerName);
    core.setOutput("success", "true");
    core.setOutput("deployment-id", deploymentId);

    // Set summary
    core.summary.addHeading("🚀 Cloudflare Workers Deployment").addTable([
      ["Property", "Value"],
      ["Worker Name", workerName],
      ["Environment", environment],
      ["URL", `[${deploymentUrl}](${deploymentUrl})`],
      ["Deployment ID", deploymentId],
      ["Status", "✅ Success"],
    ]);

    await core.summary.write();

    core.info(`✅ Successfully deployed worker: ${workerName}`);
    core.info(`🔗 Deployment URL: ${deploymentUrl}`);
  } catch (error) {
    core.error(`❌ Deployment failed: ${error.message}`);

    // Set failure outputs
    core.setOutput("success", "false");
    core.setOutput("url", "");
    core.setOutput("worker-name", "");
    core.setOutput("deployment-id", "");

    // Set failure summary
    core.summary
      .addHeading("❌ Cloudflare Workers Deployment Failed")
      .addCodeBlock(error.message, "text");

    await core.summary.write();

    core.setFailed(error.message);
  }
}

// Self-invoking async function to handle top-level await
(async () => {
  await run();
})();
