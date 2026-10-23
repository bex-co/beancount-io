import { PullRequestService } from "../pull-request-service";
import { logger } from "@/shared/logger";

// Mock dependencies
jest.mock("@/shared/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
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
    repoDeleteBranch: jest.Mock;
    repoGetContents: jest.Mock;
    repoGetContentsList: jest.Mock;
    repoUpdateFile: jest.Mock;
    repoCreateFile: jest.Mock;
    repoCompareDiff: jest.Mock;
    repoCreatePullRequest: jest.Mock;
    repoMergePullRequest: jest.Mock;
    repoEditPullRequest: jest.Mock;
  };
};

// The merge's directive-limit check has its own tests
// (pull-request-merge-directive-limit.test.ts); here the ledger is unlimited.
jest.mock("@/features/gitea/policy/directive-limit-gate", () => ({
  ...jest.requireActual("@/features/gitea/policy/directive-limit-gate"),
  evaluateMergeDirectiveLimit: async () => ({ decision: "unlimited" }),
}));
const NO_DIRECTIVE_LIMIT = {
  favaClientFactory: { getPublicApiClient: async () => ({}) },
} as never;

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
        repoDeleteBranch: jest.fn().mockResolvedValue({ data: null }),
        repoGetContents: jest.fn(),
        repoGetContentsList: jest.fn().mockResolvedValue({ data: [] }),
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
      NO_DIRECTIVE_LIMIT,
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
      // What the generated client throws for a path the branch lacks.
      mockClient.repos.repoGetContents.mockRejectedValue({ status: 404 });
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
      ).rejects.toMatchObject({ category: "NOT_FOUND" });
    });

    it("maps the client's thrown 404 for the base branch to NOT_FOUND before creating anything", async () => {
      // The generated client throws the response itself for an unknown branch.
      mockClient.repos.repoGetBranch.mockRejectedValue({
        status: 404,
        error: { message: "branch does not exist [name: main]" },
      });

      const failure = await service
        .createPRFromPatch(identity, owner, repo, input)
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({ category: "NOT_FOUND" });
      expect((failure as Error).message).toContain("main");
      expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
    });

    it("does not relabel another base-branch failure as not found", async () => {
      mockClient.repos.repoGetBranch.mockRejectedValue({ status: 502 });

      const failure = await service
        .createPRFromPatch(identity, owner, repo, input)
        .catch((error: unknown) => error);
      expect(failure).not.toMatchObject({ category: "NOT_FOUND" });
      expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
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
      ).rejects.toThrow(
        /No differences between main \(base-sha\) and \S+ \(head-sha\)/,
      );
      expect(mockClient.repos.repoCreatePullRequest).not.toHaveBeenCalled();
    });

    // w21/567: the portable-name rule is for files a change creates; one
    // committed before it stays editable.
    describe("a legacy file name (w21/567)", () => {
      const legacy = { ...input, changes: [{ path: "aux.bean", content: "x" }] };

      it("opens a pull request that updates an existing aux.bean", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockResolvedValue({
          data: { sha: "old-sha", path: "aux.bean" },
        });
        mockClient.repos.repoUpdateFile.mockResolvedValue({
          data: { commit: { sha: "def456" } },
        });

        const result = await service.createPRFromPatch(
          identity,
          owner,
          repo,
          legacy,
        );

        expect(result.prNumber).toBe(42);
        expect(mockClient.repos.repoUpdateFile).toHaveBeenCalled();
        expect(mockClient.repos.repoCreateFile).not.toHaveBeenCalled();
      });

      it("refuses one that would create aux.bean, and deletes its branch", async () => {
        mockSuccessfulCreate();

        await expect(
          service.createPRFromPatch(identity, owner, repo, legacy),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          message: expect.stringContaining("Windows device name"),
        });
        expect(mockClient.repos.repoCreateFile).not.toHaveBeenCalled();
        expect(mockClient.repos.repoDeleteBranch).toHaveBeenCalledTimes(1);
      });

      it("still refuses an unsafe path before creating a branch", async () => {
        mockSuccessfulCreate();

        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [{ path: "../x.bean", content: "x" }],
          }),
        ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
        expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
      });
    });

    it("refuses empty changes before creating a branch", async () => {
      mockSuccessfulCreate();

      await expect(
        service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [],
        }),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      expect(mockClient.repos.repoGetBranch).not.toHaveBeenCalled();
      expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
    });

    it("deletes the branch it created when the diff turns out empty", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoCompareDiff.mockResolvedValue({
        data: { total_commits: 0 },
      });

      await expect(
        service.createPRFromPatch(identity, owner, repo, input),
      ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      const created =
        mockClient.repos.repoCreateBranch.mock.calls[0][2].new_branch_name;
      expect(mockClient.repos.repoDeleteBranch).toHaveBeenCalledTimes(1);
      expect(mockClient.repos.repoDeleteBranch).toHaveBeenCalledWith(
        owner,
        repo,
        created,
      );
    });

    it("deletes the branch when a later step fails, and reports that failure", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoCreatePullRequest.mockRejectedValue({
        status: 422,
        error: { message: "pull request already exists" },
      });
      // A cleanup that itself fails must not replace the original failure.
      mockClient.repos.repoDeleteBranch.mockRejectedValue({ status: 500 });

      await expect(
        service.createPRFromPatch(identity, owner, repo, input),
      ).rejects.toThrow(/pull request already exists/);
      expect(mockClient.repos.repoDeleteBranch).toHaveBeenCalledTimes(1);
    });

    it("keeps the branch of a pull request that was opened", async () => {
      mockSuccessfulCreate();

      await service.createPRFromPatch(identity, owner, repo, input);
      expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
    });

    it("does not try to delete a branch that was never created", async () => {
      mockClient.repos.repoGetBranch.mockResolvedValue({
        data: { name: "main", commit: { id: "base-sha" } },
      });
      mockClient.repos.repoCreateBranch.mockRejectedValue({ status: 500 });

      await expect(
        service.createPRFromPatch(identity, owner, repo, input),
      ).rejects.toThrow();
      expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
    });

    describe("a Gitea failure names its step (w3/645)", () => {
      // The generated client throws the response; with a text body its JSON
      // parse fails, and the body is still readable from the response.
      const textFailure = (status: number, body: string) => ({
        status,
        error: new SyntaxError("Unexpected token < in JSON"),
        text: async () => body,
      });
      // Gitea in production mode hides an internal error's cause.
      const hiddenFailure = { status: 500, error: { message: "", url: "x" } };

      it.each([
        ["repoCreateBranch", /while creating branch pr-patch-/],
        ["repoCreateFile", /while writing test\.txt/],
        ["repoCompareDiff", /while comparing pr-patch-\S+ with main/],
        ["repoCreatePullRequest", /while opening the pull request/],
      ] as const)(
        "reports a 500 from %s as SERVICE_UNAVAILABLE naming the step",
        async (method, step) => {
          mockSuccessfulCreate();
          mockClient.repos[method].mockRejectedValue(hiddenFailure);

          const failure = await service
            .createPRFromPatch(identity, owner, repo, input)
            .catch((error: unknown) => error);
          expect(failure).toMatchObject({
            category: "SERVICE_UNAVAILABLE",
            metadata: { upstreamStatus: 500 },
          });
          expect((failure as Error).message).toMatch(step);
          expect((failure as Error).message).toMatch(
            /Gitea 500 .*Gitea gave no reason; its server log has the cause/,
          );
          expect(logger.error).toHaveBeenCalledWith(
            "Gitea call failed while creating a pull request",
            expect.objectContaining({ status: 500, owner, repo }),
          );
          // No pull request, so no branch is left behind either.
          expect(mockClient.repos.repoDeleteBranch.mock.calls.length).toBe(
            method === "repoCreateBranch" ? 0 : 1,
          );
        },
      );

      it("keeps a text body Gitea sent instead of JSON", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoCreateBranch.mockRejectedValue(
          textFailure(500, "runtime error: invalid memory address"),
        );

        await expect(
          service.createPRFromPatch(identity, owner, repo, input),
        ).rejects.toThrow(
          /Gitea 500 while creating branch \S+: runtime error: invalid memory address/,
        );
      });

      it("tells a transient gateway failure to retry with backoff", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoCreatePullRequest.mockRejectedValue(
          textFailure(502, "<html>Bad Gateway</html>"),
        );

        const failure = await service
          .createPRFromPatch(identity, owner, repo, input)
          .catch((error: unknown) => error);
        expect(failure).toMatchObject({
          category: "SERVICE_UNAVAILABLE",
          metadata: { hint: expect.stringMatching(/Retry with backoff/) },
        });
      });

      it("fails reading an existing file instead of creating it over", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockRejectedValue(hiddenFailure);

        await expect(
          service.createPRFromPatch(identity, owner, repo, input),
        ).rejects.toThrow(/while reading test\.txt/);
        expect(mockClient.repos.repoCreateFile).not.toHaveBeenCalled();
        expect(mockClient.repos.repoUpdateFile).not.toHaveBeenCalled();
      });

      it("keeps a repository refusal a plain failure naming the step", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoCreateFile.mockRejectedValue({
          status: 422,
          error: { message: "repository file already exists" },
        });

        const failure = await service
          .createPRFromPatch(identity, owner, repo, input)
          .catch((error: unknown) => error);
        expect(failure).not.toHaveProperty("category");
        expect((failure as Error).message).toBe(
          "Gitea 422 while writing test.txt: repository file already exists",
        );
      });
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
      ).rejects.toMatchObject({ category: "NOT_FOUND" });
    });

    it("maps the client's thrown 404 response to NOT_FOUND", async () => {
      // The generated client throws the response itself, not an Error.
      mockClient.repos.repoGetPullRequest.mockRejectedValue({
        status: 404,
        error: { message: "pull request does not exist [id: 0]" },
      });

      const failure = await service
        .getPRDetails(identity, owner, repo, prNumber)
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({ category: "NOT_FOUND" });
      expect((failure as Error).message).toContain("42");
      expect((failure as Error).message).not.toContain("Unknown error");
    });

    it("keeps any other upstream failure internal, without its detail", async () => {
      mockClient.repos.repoGetPullRequest.mockRejectedValue({
        status: 502,
        error: { message: "upstream detail" },
      });

      const failure = await service
        .getPRDetails(identity, owner, repo, prNumber)
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({ category: "INTERNAL_SERVER_ERROR" });
      expect((failure as Error).message).not.toContain("upstream detail");
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

  describe.each([
    ["mergePR", "repoMergePullRequest"],
    ["closePR", "repoEditPullRequest"],
  ] as const)("%s failures", (method, clientCall) => {
    it("throws NOT_FOUND for a pull request number Gitea does not know", async () => {
      // The generated client throws the response itself, not an Error.
      mockClient.repos[clientCall].mockRejectedValue({ status: 404 });

      const failure = await service[method](identity, "o", "r", 999999).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({ category: "NOT_FOUND" });
      expect((failure as Error).message).toContain("999999");
    });

    it("keeps any other refusal as a described success:false result", async () => {
      mockClient.repos[clientCall].mockRejectedValue({
        status: 405,
        error: { message: "pull request is not mergeable" },
      });

      const result = await service[method](identity, "o", "r", 42);
      expect(result).toEqual({
        success: false,
        message: "Gitea 405: pull request is not mergeable",
      });
    });

    it("keeps an Error's own message", async () => {
      mockClient.repos[clientCall].mockRejectedValue(
        new Error("PR is no longer open"),
      );

      expect(await service[method](identity, "o", "r", 42)).toEqual({
        success: false,
        message: "PR is no longer open",
      });
    });
  });
});
