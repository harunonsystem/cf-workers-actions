import * as core from "@actions/core";
import { CloudflareApi } from "../shared/lib/cloudflare-api";
import { env } from "../shared/lib/env";
import { CLEANUP_ERROR_OUTPUTS, handleActionError } from "../shared/lib/error-handler";
import { info } from "../shared/lib/logger";
import { getActionInputs } from "../shared/validation";
import { createDefaultCleanupPolicyDependencies, executeCleanupPolicy } from "./cleanup-policy";
import { CleanupInputConfig, CleanupInputSchema } from "./schemas";
import {
  createCleanupSummary,
  createDryRunSummary,
  createExclusionFilter,
  filterWorkersByExclusion,
  parseWorkerNamesInput,
  setCleanupOutputs,
  setEmptyCleanupOutputs
} from "./utils";

async function run(): Promise<void> {
  try {
    // Get and validate inputs
    const inputs = getActionInputs(CleanupInputSchema, CleanupInputConfig, (raw) => {
      // Parse worker names from various input formats
      const workerNames = parseWorkerNamesInput(
        core.getInput("worker-names"),
        core.getInput("worker-numbers"),
        core.getInput("worker-prefix")
      );
      return {
        ...raw,
        workerNames,
        dryRun: raw.dryRun === "true"
      };
    });
    if (!inputs) {
      throw new Error("Input validation failed");
    }

    // Initialize Cloudflare API client
    const cf = new CloudflareApi(inputs.cloudflareApiToken, inputs.cloudflareAccountId);

    // Get workers to process
    let workersToProcess: string[] = [];
    if (inputs.workerNames && inputs.workerNames.length > 0) {
      workersToProcess = inputs.workerNames;
      info(`Processing specific workers: ${inputs.workerNames.join(", ")}`);
    }

    // Apply exclusion filter
    const exclusionFilter = createExclusionFilter(inputs.exclude);
    workersToProcess = filterWorkersByExclusion(workersToProcess, exclusionFilter);

    // Early exit if no workers to process
    if (workersToProcess.length === 0) {
      info("No workers found to process");
      setEmptyCleanupOutputs();
      return;
    }

    const result = await executeCleanupPolicy(
      { workerNames: workersToProcess, dryRun: inputs.dryRun },
      createDefaultCleanupPolicyDependencies(cf.deleteWorker.bind(cf))
    );

    if (result.dryRun) {
      setCleanupOutputs(result, true);
      await createDryRunSummary(result.deletedWorkers);
    } else {
      setCleanupOutputs(result, false);
      await createCleanupSummary(result, workersToProcess.length);
      info(
        `✅ Cleanup completed: ${result.deletedWorkers.length} deleted, ${result.skippedWorkers.length} skipped`
      );
    }
  } catch (err) {
    await handleActionError(err, {
      summaryTitle: "Cloudflare Workers Cleanup Failed",
      outputs: CLEANUP_ERROR_OUTPUTS
    });
  }
}

export { run };

// Execute if not in test environment
if (!env.isTest()) {
  void run();
}
