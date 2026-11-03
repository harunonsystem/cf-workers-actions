import * as core from "@actions/core";
import * as github from "@actions/github";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { run } from "../../src/pr-comment/index";

describe("pr-comment action", () => {
  let inputs: Record<string, string> = {};
  let outputs: Record<string, string> = {};
  let failedMessage: string | Error | undefined;

  const mockCreateComment = vi.fn();
  const mockUpdateComment = vi.fn();
  const mockListComments = vi.fn();

  beforeEach(() => {
    inputs = {};
    outputs = {};
    failedMessage = undefined;

    vi.clearAllMocks();
    mockCreateComment.mockReset();
    mockUpdateComment.mockReset();
    mockListComments.mockReset().mockResolvedValue({ data: [] });

    vi.mocked(core.getInput).mockImplementation((name) => inputs[name] || "");
    vi.mocked(core.setOutput).mockImplementation((name, value) => {
      outputs[name] = value;
    });
    vi.mocked(core.setFailed).mockImplementation((message) => {
      failedMessage = message;
    });

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        sha: "deadbeef1234567",
        ref: "refs/pull/42/merge",
        payload: {
          pull_request: {
            number: 42,
            head: {
              ref: "feature/pr-comment-test"
            }
          }
        }
      },
      writable: true,
      configurable: true
    });

    vi.mocked(github.getOctokit).mockReturnValue({
      rest: {
        issues: {
          listComments: mockListComments,
          createComment: mockCreateComment,
          updateComment: mockUpdateComment
        }
      }
    } as any);

    process.env.GITHUB_TOKEN = "env-github-token";
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  test("should create a PR comment and set comment-id output on successful deployment", async () => {
    inputs = {
      "deployment-url": "https://myapp-pr-42.example.workers.dev",
      "deployment-success": "true",
      "deployment-name": "myapp-pr-42",
      "github-token": "input-github-token"
    };
    mockCreateComment.mockResolvedValue({ data: { id: 98765 } });

    await run();

    expect(failedMessage).toBeUndefined();
    expect(github.getOctokit).toHaveBeenCalledWith("input-github-token");
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 42,
        body: expect.stringContaining("https://myapp-pr-42.example.workers.dev")
      })
    );
    expect(outputs["comment-id"]).toBe("98765");
    expect(core.summary.addTable).toHaveBeenCalledWith(
      expect.arrayContaining([["Status", "Success ✅"]])
    );
    expect(core.summary.write).toHaveBeenCalled();
  });

  test("should record Failed status in summary when deployment-success is false", async () => {
    inputs = {
      "deployment-url": "https://myapp-pr-42.example.workers.dev",
      "deployment-success": "false",
      "deployment-name": "myapp-pr-42"
    };
    mockCreateComment.mockResolvedValue({ data: { id: 11111 } });

    await run();

    expect(failedMessage).toBeUndefined();
    expect(outputs["comment-id"]).toBe("11111");
    expect(core.summary.addTable).toHaveBeenCalledWith(
      expect.arrayContaining([["Status", "Failed ❌"]])
    );
  });

  test("should fail and set empty comment-id output when not in a pull_request context", async () => {
    inputs = {
      "deployment-url": "https://myapp-pr-42.example.workers.dev",
      "deployment-success": "true",
      "deployment-name": "myapp-pr-42"
    };

    Object.defineProperty(github, "context", {
      value: {
        repo: { owner: "test-owner", repo: "test-repo" },
        sha: "deadbeef1234567",
        ref: "refs/heads/main",
        payload: {}
      },
      writable: true,
      configurable: true
    });

    await run();

    expect(failedMessage).toContain("Could not get PR number from context");
    expect(outputs["comment-id"]).toBe("");
  });

  test("should fail and set empty comment-id output when input validation fails", async () => {
    inputs = {
      "deployment-url": "not-a-valid-url",
      "deployment-success": "true",
      "deployment-name": ""
    };

    await run();

    expect(failedMessage).toBeDefined();
    expect(outputs["comment-id"]).toBe("");
    expect(mockCreateComment).not.toHaveBeenCalled();
  });
});
