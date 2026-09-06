import * as core from "@actions/core";
import * as github from "@actions/github";
import { env } from "../shared/lib/env";
import { handleActionError } from "../shared/lib/error-handler";
import { getGithubToken } from "../shared/lib/github-utils";
import { info, warning } from "../shared/lib/logger";
import { createOrUpdatePreviewComment } from "../shared/lib/pr-comment-utils";
import { executePreviewDeployment } from "../shared/lib/preview-deployment";
import { getActionInputs, setOutputsValidated } from "../shared/validation";
import {
  DeployPreviewInputConfig,
  DeployPreviewInputSchema,
  DeployPreviewOutputSchema
} from "./schemas.js";

async function run(): Promise<void> {
  // Variables to hold outputs for error handling
  let workerName = "";
  let deploymentUrl = "";

  try {
    // Get and validate inputs
    const inputs = getActionInputs(DeployPreviewInputSchema, DeployPreviewInputConfig);
    if (!inputs) {
      throw new Error("Input validation failed");
    }

    info("🚀 Starting deploy preview...");
    info(`Worker name template: ${inputs.workerName}`);
    info(`Environment: ${inputs.environment}`);

    await executePreviewDeployment(
      {
        workerNameTemplate: inputs.workerName,
        environment: inputs.environment,
        domain: inputs.domain,
        wranglerTomlPath: inputs.wranglerTomlPath,
        cloudflareApiToken: inputs.cloudflareApiToken,
        cloudflareAccountId: inputs.cloudflareAccountId
      },
      {
        onPrepared: (config) => {
          workerName = config.workerName;
          deploymentUrl = config.deploymentUrl;
          info("✅ Updated wrangler.toml");
        },
        postComment: async (config) => {
          if (!config.prNumber) {
            return;
          }

          try {
            const token = getGithubToken(core.getInput("github-token"));
            const octokit = github.getOctokit(token);
            await createOrUpdatePreviewComment(octokit, {
              prNumber: config.prNumber,
              deploymentUrl: config.deploymentUrl,
              deploymentName: config.workerName,
              deploymentSuccess: true
            });
            info("✅ PR comment posted");
          } catch {
            warning("GITHUB_TOKEN not found, skipping PR comment");
          }
        }
      }
    );
    // Set outputs
    setOutputsValidated(DeployPreviewOutputSchema, {
      deploymentUrl,
      deploymentName: workerName,
      deploymentSuccess: "true"
    });

    info("✅ Deploy preview completed");
  } catch (err) {
    await handleActionError(err, {
      summaryTitle: "Deploy Preview Failed",
      outputs: {
        "deployment-url": deploymentUrl,
        "deployment-name": workerName,
        "deployment-success": "false"
      }
    });
  }
}

export { run };

// Execute if not in test environment
if (!env.isTest()) {
  void run();
}
