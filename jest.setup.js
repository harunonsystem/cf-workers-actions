// Mock @actions/core
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  getInput: jest.fn(),
  summary: {
    addHeading: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    addList: jest.fn().mockReturnThis(),
    addCodeBlock: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(),
  },
}));

// Mock @actions/github
jest.mock("@actions/github", () => ({
  context: {
    eventName: "pull_request",
    ref: "refs/pull/123/merge",
    repo: {
      owner: "test-owner",
      repo: "test-repo",
    },
    payload: {
      pull_request: {
        number: 123,
      },
    },
  },
  getOctokit: jest.fn(() => ({
    rest: {
      issues: {
        createComment: jest.fn(),
        updateComment: jest.fn(),
        listComments: jest.fn(),
      },
    },
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();
