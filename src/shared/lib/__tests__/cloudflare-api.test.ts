import { beforeEach, describe, expect, test, vi } from "vitest";
import { CloudflareApi, CloudflareApiError, isCloudflareRateLimitError } from "../cloudflare-api";

function mockFetchResponse(status: number, body: Record<string, unknown>) {
  (global.fetch as any).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body)
  });
}

describe("CloudflareApi", () => {
  let cf: CloudflareApi;

  beforeEach(() => {
    vi.clearAllMocks();
    cf = new CloudflareApi("token", "account");
  });

  describe("isCloudflareRateLimitError", () => {
    test("should identify a 429 Cloudflare error", () => {
      expect(isCloudflareRateLimitError(new CloudflareApiError("rate limited", 429))).toBe(true);
    });

    test("should reject other errors", () => {
      expect(isCloudflareRateLimitError(new CloudflareApiError("server error", 500))).toBe(false);
      expect(isCloudflareRateLimitError(new Error("rate limited"))).toBe(false);
    });
  });

  describe("deleteWorker", () => {
    test("should return false when Cloudflare returns 404 (worker does not exist)", async () => {
      mockFetchResponse(404, {
        success: false,
        errors: [{ code: 10007, message: "This Worker does not exist on your account." }]
      });

      const result = await cf.deleteWorker("missing-worker");

      expect(result).toBe(false);
    });

    test("should return true when delete succeeds", async () => {
      mockFetchResponse(200, { success: true, result: null });

      const result = await cf.deleteWorker("existing-worker");

      expect(result).toBe(true);
    });

    test("should throw when Cloudflare returns 500", async () => {
      mockFetchResponse(500, {
        success: false,
        errors: [{ code: 10000, message: "Internal error" }]
      });

      await expect(cf.deleteWorker("some-worker")).rejects.toThrow();
    });
  });

  describe("getWorker", () => {
    test("should return null when Cloudflare returns 404", async () => {
      mockFetchResponse(404, {
        success: false,
        errors: [{ code: 10007, message: "This Worker does not exist on your account." }]
      });

      const result = await cf.getWorker("missing-worker");

      expect(result).toBeNull();
    });
  });
});
