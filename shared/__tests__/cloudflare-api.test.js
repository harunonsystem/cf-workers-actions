const { CloudflareApi } = require("../lib/cloudflare-api");

describe("CloudflareApi", () => {
  let api;
  const mockApiToken = "test-token";
  const mockAccountId = "test-account";

  beforeEach(() => {
    api = new CloudflareApi(mockApiToken, mockAccountId);
    fetch.mockClear();
  });

  describe("constructor", () => {
    test("should initialize with valid credentials", () => {
      expect(api.apiToken).toBe(mockApiToken);
      expect(api.accountId).toBe(mockAccountId);
      expect(api.baseUrl).toBe("https://api.cloudflare.com/client/v4");
    });

    test("should throw error for missing API token", () => {
      expect(() => new CloudflareApi(null, mockAccountId)).toThrow(
        "API token and account ID are required",
      );
    });

    test("should throw error for missing account ID", () => {
      expect(() => new CloudflareApi(mockApiToken, null)).toThrow(
        "API token and account ID are required",
      );
    });
  });

  describe("makeRequest", () => {
    test("should make successful GET request", async () => {
      const mockResponse = {
        success: true,
        result: { id: "test-worker" },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await api.makeRequest("GET", "/test-endpoint");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.cloudflare.com/client/v4/test-endpoint",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
        },
      );

      expect(result).toEqual(mockResponse);
    });

    test("should make successful POST request with data", async () => {
      const mockResponse = { success: true };
      const testData = { name: "test" };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await api.makeRequest("POST", "/test-endpoint", testData);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.cloudflare.com/client/v4/test-endpoint",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testData),
        },
      );
    });

    test("should throw error for HTTP error response", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
        json: jest.fn().mockResolvedValueOnce({
          errors: [{ message: "Invalid token" }],
        }),
      });

      await expect(api.makeRequest("GET", "/test-endpoint")).rejects.toThrow(
        "Cloudflare API error: Invalid token",
      );
    });

    test("should throw error for API error response", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: false,
          errors: [{ message: "Worker not found" }],
        }),
      });

      await expect(api.makeRequest("GET", "/test-endpoint")).rejects.toThrow(
        "Cloudflare API error: Worker not found",
      );
    });
  });

  describe("listWorkers", () => {
    test("should return list of workers", async () => {
      const mockWorkers = [{ id: "worker1" }, { id: "worker2" }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers,
        }),
      });

      const result = await api.listWorkers();

      expect(result).toEqual(mockWorkers);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${mockAccountId}/workers/scripts`,
        expect.any(Object),
      );
    });
  });

  describe("deleteWorker", () => {
    test("should successfully delete worker", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
        }),
      });

      const result = await api.deleteWorker("test-worker");

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${mockAccountId}/workers/scripts/test-worker`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    test("should return false for non-existent worker", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: jest.fn().mockResolvedValueOnce({
          errors: [{ message: "not found" }],
        }),
      });

      const result = await api.deleteWorker("non-existent-worker");

      expect(result).toBe(false);
    });
  });

  describe("findWorkersByPattern", () => {
    beforeEach(() => {
      const mockWorkers = [
        { id: "project-pr-123" },
        { id: "project-pr-456" },
        { id: "project-main" },
        { id: "other-worker" },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers,
        }),
      });
    });

    test("should find workers matching wildcard pattern", async () => {
      const result = await api.findWorkersByPattern("project-pr-*");

      expect(result).toEqual(["project-pr-123", "project-pr-456"]);
    });

    test("should return all workers for * pattern", async () => {
      const result = await api.findWorkersByPattern("*");

      expect(result).toEqual([
        "project-pr-123",
        "project-pr-456",
        "project-main",
        "other-worker",
      ]);
    });

    test("should find workers matching specific pattern", async () => {
      const result = await api.findWorkersByPattern("project-main");

      expect(result).toEqual(["project-main"]);
    });

    test("should return empty array for no matches", async () => {
      const result = await api.findWorkersByPattern("nonexistent-*");

      expect(result).toEqual([]);
    });
  });
});
