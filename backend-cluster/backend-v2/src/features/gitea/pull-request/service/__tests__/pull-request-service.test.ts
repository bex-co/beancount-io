import { PullRequestService } from "../pull-request-service";
import axios from "axios";

// Mock dependencies
jest.mock("axios");
jest.mock("@/shared/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

type MockGiteaClient = {
  repos: {
    repoGetBranch: jest.Mock;
    repoCreateBranch: jest.Mock;
    repoGetContents: jest.Mock;
    repoUpdateFile: jest.Mock;
    repoCreateFile: jest.Mock;
    repoCreatePullRequest: jest.Mock;
    repoMergePullRequest: jest.Mock;
    repoEditPullRequest: jest.Mock;
  };
};

describe("PullRequestService", () => {
  let service: PullRequestService;
  let mockClient: MockGiteaClient;
  let mockGiteaClientFactory: { getUserApiClient: jest.Mock };
  let mockModels: { user: { getById: jest.Mock } };
  const userId = "user-id";

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      repos: {
        repoGetBranch: jest.fn(),
        repoCreateBranch: jest.fn(),
        repoGetContents: jest.fn(),
        repoUpdateFile: jest.fn(),
        repoCreateFile: jest.fn(),
        repoCreatePullRequest: jest.fn(),
        repoMergePullRequest: jest.fn(),
        repoEditPullRequest: jest.fn(),
      },
    };

    mockGiteaClientFactory = {
      getUserApiClient: jest.fn().mockResolvedValue(mockClient),
    };
    mockModels = {
      user: {
        getById: jest.fn().mockResolvedValue({
          ledger_username: "testuser",
          ledger_password: "testpass",
        }),
      },
    };

    service = new PullRequestService(
      mockGiteaClientFactory as never,
      mockModels as never,
      {} as never,
    );
  });

  describe("createPRFromPatch", () => {
    const owner = "testowner";
    const repo = "testrepo";
    const title = "Test PR";
    const description = "Test description";
    const baseBranch = "main";
    const changes = [{ path: "test.txt", content: "Hello World" }];

    it("should successfully create a PR with new file", async () => {
      mockClient.repos.repoGetBranch.mockResolvedValue({
        data: { name: baseBranch, commit: { sha: "abc123" } },
      });
      mockClient.repos.repoCreateBranch.mockResolvedValue({
        data: { name: "pr-patch-123-xyz" },
      });
      mockClient.repos.repoGetContents.mockRejectedValue(
        new Error("File not found"),
      );
      mockClient.repos.repoCreateFile.mockResolvedValue({
        data: { commit: { sha: "def456" } },
      });
      mockClient.repos.repoCreatePullRequest.mockResolvedValue({
        data: {
          number: 42,
          html_url: "https://gitea.test/owner/repo/pulls/42",
        },
      });

      const result = await service.createPRFromPatch(
        userId,
        owner,
        repo,
        title,
        description,
        baseBranch,
        changes,
      );

      expect(result.prNumber).toBe(42);
      expect(result.prUrl).toBe("https://gitea.test/owner/repo/pulls/42");
    });

    it("should throw error when base branch not found", async () => {
      mockClient.repos.repoGetBranch.mockResolvedValue({ data: null });

      await expect(
        service.createPRFromPatch(
          userId,
          owner,
          repo,
          title,
          description,
          baseBranch,
          changes,
        ),
      ).rejects.toThrow("Base branch 'main' not found");
    });
  });

  describe("getPRDetails", () => {
    const owner = "testowner";
    const repo = "testrepo";
    const prNumber = 42;

    it("should successfully fetch PR details", async () => {
      const mockPRData = {
        number: 42,
        title: "Test PR",
        body: "Test description",
        state: "open",
        user: { login: "testuser" },
        head: { ref: "feature-branch" },
        base: { ref: "main" },
      };

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: mockPRData })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: "" });

      const result = await service.getPRDetails(userId, owner, repo, prNumber);

      expect(result.number).toBe(42);
      expect(result.title).toBe("Test PR");
    });

    it("should handle PR not found", async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: null });

      await expect(
        service.getPRDetails(userId, owner, repo, prNumber),
      ).rejects.toThrow("Pull request #42 not found");
    });
  });

  describe("mergePR", () => {
    const owner = "testowner";
    const repo = "testrepo";
    const prNumber = 42;

    it("should successfully merge PR", async () => {
      mockClient.repos.repoMergePullRequest.mockResolvedValue({
        data: { merged: true },
      });

      const result = await service.mergePR(userId, owner, repo, prNumber);

      expect(result.success).toBe(true);
      expect(result.message).toBe("PR merged successfully");
    });
  });

  describe("closePR", () => {
    const owner = "testowner";
    const repo = "testrepo";
    const prNumber = 42;

    it("should successfully close PR", async () => {
      mockClient.repos.repoEditPullRequest.mockResolvedValue({
        data: { state: "closed" },
      });

      const result = await service.closePR(userId, owner, repo, prNumber);

      expect(result.success).toBe(true);
      expect(result.message).toBe("PR closed successfully");
    });
  });
});
