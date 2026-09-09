import { PullRequestService } from "../pull-request-service";

// Mock dependencies
jest.mock("@/shared/logger", () => ({
  logger: {
    error: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

type MockGiteaClient = {
  repos: {
    repoGetPullRequest: jest.Mock;
    repoGetPullRequestFiles: jest.Mock;
    repoDownloadPullDiffOrPatch: jest.Mock;
    repoGetBranch: jest.Mock;
    repoCreateBranch: jest.Mock;
    repoGetContents: jest.Mock;
    repoUpdateFile: jest.Mock;
    repoCreateFile: jest.Mock;
    repoCompareDiff: jest.Mock;
    repoCreatePullRequest: jest.Mock;
    repoMergePullRequest: jest.Mock;
    repoEditPullRequest: jest.Mock;
  };
};

describe("PullRequestService", () => {
  let service: PullRequestService;
  let mockClient: MockGiteaClient;
  let mockGiteaClientFactory: { getUserApiClient: jest.Mock };
  const userId = "user-id";
  const identity = {
    userId,
    method: "session",
    scopes: new Set<string>(),
  } as const;
  const authorization = {
    authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      repos: {
        repoGetPullRequest: jest.fn().mockResolvedValue({ data: null }),
        repoGetPullRequestFiles: jest.fn().mockResolvedValue({ data: [] }),
        repoDownloadPullDiffOrPatch: jest.fn().mockResolvedValue({ data: "" }),
        repoGetBranch: jest.fn(),
        repoCreateBranch: jest.fn(),
        repoGetContents: jest.fn(),
        repoUpdateFile: jest.fn(),
        repoCreateFile: jest.fn(),
        repoCompareDiff: jest.fn(),
        repoCreatePullRequest: jest.fn(),
        repoMergePullRequest: jest.fn(),
        repoEditPullRequest: jest.fn(),
      },
    };

    mockGiteaClientFactory = {
      getUserApiClient: jest.fn().mockResolvedValue(mockClient),
    };
    service = new PullRequestService(
      mockGiteaClientFactory as never,
      authorization as never,
    );
  });

  describe("createPRFromPatch", () => {
    const owner = "testowner";
    const repo = "testrepo";
    const input = {
      title: "Test PR",
      description: "Test description",
      baseBranch: "main",
      clearCommitMessage: "Add test file",
      changes: [{ path: "test.txt", content: "Hello World" }],
    };

    function mockSuccessfulCreate() {
      mockClient.repos.repoGetBranch.mockImplementation(
        async (_owner: string, _repo: string, branch: string) => ({
          data: {
            name: branch,
            commit: { id: branch === "main" ? "base-sha" : "head-sha" },
          },
        }),
      );
      mockClient.repos.repoCreateBranch.mockResolvedValue({
        data: { name: "pr-patch-123-xyz" },
      });
      mockClient.repos.repoGetContents.mockRejectedValue(
        new Error("File not found"),
      );
      mockClient.repos.repoCreateFile.mockResolvedValue({
        data: { commit: { sha: "def456" } },
      });
      mockClient.repos.repoCompareDiff.mockResolvedValue({
        data: { total_commits: 1 },
      });
      mockClient.repos.repoCreatePullRequest.mockResolvedValue({
        data: {
          number: 42,
          html_url: "https://gitea.test/owner/repo/pulls/42",
          base: { ref: "main" },
          head: { ref: "pr-patch-123-xyz" },
        },
      });
    }

    it("should successfully create a PR with new file", async () => {
      mockSuccessfulCreate();

      const result = await service.createPRFromPatch(
        identity,
        owner,
        repo,
        input,
      );

      expect(result.prNumber).toBe(42);
      expect(result.prUrl).toBe("https://gitea.test/owner/repo/pulls/42");
      expect(result.baseBranch).toBe("main");
      expect(result.headBranch).toBe("pr-patch-123-xyz");
      expect(mockClient.repos.repoCreateFile).toHaveBeenCalledWith(
        owner,
        repo,
        "test.txt",
        expect.objectContaining({ message: "Add test file" }),
        { format: "json" },
      );
    });

    it("should route the created PR's actual refs through", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoCreatePullRequest.mockResolvedValue({
        data: {
          number: 43,
          html_url: "https://gitea.test/owner/repo/pulls/43",
          base: { ref: "feature/base" },
          head: { ref: "pr-patch-999" },
        },
      });

      const result = await service.createPRFromPatch(identity, owner, repo, {
        ...input,
        baseBranch: "feature/base",
      });

      expect(result.baseBranch).toBe("feature/base");
      expect(result.headBranch).toBe("pr-patch-999");
    });

    it("should throw error when base branch not found", async () => {
      mockClient.repos.repoGetBranch.mockResolvedValue({ data: null });

      await expect(
        service.createPRFromPatch(identity, owner, repo, input),
      ).rejects.toThrow("Base branch 'main' not found");
    });

    it.each([
      ["title", { ...input, title: "  " }, "title must not be empty"],
      [
        "description",
        { ...input, description: "" },
        "description must not be empty",
      ],
      [
        "clearCommitMessage",
        { ...input, clearCommitMessage: "" },
        "clearCommitMessage must not be empty",
      ],
    ])("should refuse an empty %s", async (_field, badInput, message) => {
      await expect(
        service.createPRFromPatch(identity, owner, repo, badInput),
      ).rejects.toThrow(message);
      expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
    });

    it("should refuse a diff-less branch with the revisions to re-verify", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoCompareDiff.mockResolvedValue({
        data: { total_commits: 0 },
      });

      await expect(
        service.createPRFromPatch(identity, owner, repo, input),
      ).rejects.toThrow(/No differences between main \(base-sha\) and \S+ \(head-sha\)/);
      expect(
        mockClient.repos.repoCreatePullRequest,
      ).not.toHaveBeenCalled();
    });

    it("requests parsed bodies from the generated client on every call", async () => {
      mockSuccessfulCreate();

      await service.createPRFromPatch(identity, owner, repo, input);

      // The generated client resolves `data` to null unless `format` is set,
      // so a missing format breaks every read below against a live Gitea
      // while mocks keep passing.
      for (const call of [
        mockClient.repos.repoGetBranch.mock.calls,
        mockClient.repos.repoCreateBranch.mock.calls,
        mockClient.repos.repoGetContents.mock.calls,
        mockClient.repos.repoCreateFile.mock.calls,
        mockClient.repos.repoCompareDiff.mock.calls,
        mockClient.repos.repoCreatePullRequest.mock.calls,
      ]) {
        expect(call.length).toBeGreaterThan(0);
        for (const args of call) {
          expect(args[args.length - 1]).toEqual({ format: "json" });
        }
      }
    });

    it("should skip verification with fastForward", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoCompareDiff.mockResolvedValue({
        data: { total_commits: 0 },
      });

      const result = await service.createPRFromPatch(identity, owner, repo, {
        ...input,
        fastForward: true,
      });

      expect(result.prNumber).toBe(42);
      expect(mockClient.repos.repoCompareDiff).not.toHaveBeenCalled();
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

      mockClient.repos.repoGetPullRequest.mockResolvedValue({
        data: mockPRData,
      });

      const result = await service.getPRDetails(
        identity,
        owner,
        repo,
        prNumber,
      );

      expect(result.number).toBe(42);
      expect(result.title).toBe("Test PR");
    });

    it("should handle PR not found", async () => {
      mockClient.repos.repoGetPullRequest.mockResolvedValue({ data: null });

      await expect(
        service.getPRDetails(identity, owner, repo, prNumber),
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

      const result = await service.mergePR(identity, owner, repo, prNumber);

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

      const result = await service.closePR(identity, owner, repo, prNumber);

      expect(result.success).toBe(true);
      expect(result.message).toBe("PR closed successfully");
    });
  });
});
