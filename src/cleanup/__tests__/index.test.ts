import { beforeEach, describe, expect, test, vi } from "vitest";
import { CloudflareApi } from "../../shared/lib/cloudflare-api";
import { run } from "../index";

global.fetch = vi.fn();

const coreMocks = vi.hoisted(() => ({
  __esModule: true,
  default: {},
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  summary: {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    addList: vi.fn().mockReturnThis(),
    addCodeBlock: vi.fn().mockReturnThis(),
    write: vi.fn()
  }
}));

// Mock @actions/core
vi.mock("@actions/core", () => coreMocks);

// Mock CloudflareApi
vi.mock("../../shared/lib/cloudflare-api");

// Mock sleep to keep tests fast
vi.mock("../../shared/lib/string-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../shared/lib/string-utils")>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined)
  };
});

describe("cleanup action integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should require worker names or a worker prefix with numbers", async () => {
    const mockCf = {
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      return "";
    });

    await run();

    expect(coreMocks.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("Input validation failed")
    );
  });

  test("should process full worker names resolved from pull request numbers", async () => {
    const mockCf = {
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "worker-names") return "myapp-pr-123,myapp-pr-456";
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      if (name === "dry-run") return "true";
      return "";
    });

    await run();

    expect(coreMocks.info).toHaveBeenCalledWith(
      "Processing specific workers: myapp-pr-123, myapp-pr-456"
    );
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      "dry-run-results",
      JSON.stringify(["myapp-pr-123", "myapp-pr-456"])
    );
  });

  test("should expand pull request numbers with a worker prefix", async () => {
    const mockCf = {
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "worker-numbers") return "123,456";
      if (name === "worker-prefix") return "myapp-pr-";
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      if (name === "dry-run") return "true";
      return "";
    });

    await run();

    expect(coreMocks.info).toHaveBeenCalledWith(
      "Processing specific workers: myapp-pr-123, myapp-pr-456"
    );
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      "dry-run-results",
      JSON.stringify(["myapp-pr-123", "myapp-pr-456"])
    );
  });

  test("should use full names when provided (overrides prefix+numbers)", async () => {
    const mockCf = {
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "worker-names") return "custom-worker-1,custom-worker-2";
      if (name === "worker-numbers") return "1,2,3"; // Should be ignored
      if (name === "worker-prefix") return "myapp-pr-"; // Should be ignored
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      if (name === "dry-run") return "true";
      return "";
    });

    await run();

    expect(coreMocks.info).toHaveBeenCalledWith(
      "Processing specific workers: custom-worker-1, custom-worker-2"
    );
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      "dry-run-results",
      JSON.stringify(["custom-worker-1", "custom-worker-2"])
    );
  });

  test("should set empty outputs and exit early when all workers are excluded", async () => {
    const mockCf = {
      deleteWorker: vi.fn()
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "worker-names") return "myapp-prod";
      if (name === "exclude") return "*-prod";
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      if (name === "dry-run") return "false";
      return "";
    });

    await run();

    expect(coreMocks.info).toHaveBeenCalledWith("No workers found to process");
    expect(mockCf.deleteWorker).not.toHaveBeenCalled();
    expect(coreMocks.setOutput).toHaveBeenCalledWith("deleted-workers", "[]");
    expect(coreMocks.setOutput).toHaveBeenCalledWith("deleted-count", "0");
  });

  test("should delete workers and write cleanup summary when dry-run is false", async () => {
    const mockCf = {
      deleteWorker: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    };
    (CloudflareApi as any).mockImplementation(function () {
      return mockCf;
    });

    coreMocks.getInput.mockImplementation((name: string) => {
      if (name === "worker-names") return "myapp-pr-1,myapp-pr-2";
      if (name === "cloudflare-api-token") return "token";
      if (name === "cloudflare-account-id") return "account";
      if (name === "dry-run") return "false";
      return "";
    });

    await run();

    expect(mockCf.deleteWorker).toHaveBeenCalledTimes(2);
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      "deleted-workers",
      JSON.stringify(["myapp-pr-1"])
    );
    expect(coreMocks.setOutput).toHaveBeenCalledWith("deleted-count", "1");
    expect(coreMocks.setOutput).toHaveBeenCalledWith(
      "skipped-workers",
      JSON.stringify(["myapp-pr-2"])
    );
    expect(coreMocks.summary.write).toHaveBeenCalled();
  });
});
