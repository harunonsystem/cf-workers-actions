import { beforeEach, describe, expect, test, vi } from "vitest";
import { CloudflareApiError } from "../../shared/lib/cloudflare-api";
import { type CleanupPolicyLogger, executeCleanupPolicy } from "../cleanup-policy";

function createLogger(): CleanupPolicyLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  };
}

describe("executeCleanupPolicy", () => {
  let logger: CleanupPolicyLogger;
  let sleep: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = createLogger();
    sleep = vi.fn().mockResolvedValue(undefined);
  });

  test("should return workers without deleting in dry run mode", async () => {
    const deleteWorker = vi.fn();

    const result = await executeCleanupPolicy(
      { workerNames: ["preview-1", "preview-2"], dryRun: true },
      { deleteWorker, logger, sleep }
    );

    expect(result).toEqual({
      deletedWorkers: ["preview-1", "preview-2"],
      skippedWorkers: [],
      dryRun: true
    });
    expect(deleteWorker).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  test("should classify deleted and missing workers and delay between operations", async () => {
    const deleteWorker = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await executeCleanupPolicy(
      { workerNames: ["preview-1", "preview-2"], dryRun: false },
      { deleteWorker, logger, sleep }
    );

    expect(result).toEqual({
      deletedWorkers: ["preview-1"],
      skippedWorkers: ["preview-2"],
      dryRun: false
    });
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 500);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  test("should retry rate-limited deletion with exponential backoff", async () => {
    const deleteWorker = vi
      .fn()
      .mockRejectedValueOnce(new CloudflareApiError("rate limited", 429))
      .mockResolvedValueOnce(true);

    const result = await executeCleanupPolicy(
      { workerNames: ["preview-1"], dryRun: false },
      { deleteWorker, logger, sleep }
    );

    expect(result.deletedWorkers).toEqual(["preview-1"]);
    expect(deleteWorker).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 30000);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  test("should skip a worker after a non-retryable error and continue", async () => {
    const deleteWorker = vi
      .fn()
      .mockRejectedValueOnce(new Error("permission denied"))
      .mockResolvedValueOnce(true);

    const result = await executeCleanupPolicy(
      { workerNames: ["preview-1", "preview-2"], dryRun: false },
      { deleteWorker, logger, sleep }
    );

    expect(result).toEqual({
      deletedWorkers: ["preview-2"],
      skippedWorkers: ["preview-1"],
      dryRun: false
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
  });
});
