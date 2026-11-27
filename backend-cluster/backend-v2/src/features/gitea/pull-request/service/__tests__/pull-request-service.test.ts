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
    repoChangeFiles: jest.Mock;
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
        repoChangeFiles: jest.fn(),
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
      // What the generated client throws for a path the branch lacks.
      mockClient.repos.repoGetContents.mockRejectedValue({ status: 404 });
      mockClient.repos.repoChangeFiles.mockResolvedValue({
        data: { files: [] },
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
      // One request makes the branch and the commit; the standalone
      // branch-create and per-file calls (w23/082) are never made.
      expect(mockClient.repos.repoChangeFiles).toHaveBeenCalledTimes(1);
      expect(mockClient.repos.repoChangeFiles).toHaveBeenCalledWith(
        owner,
        repo,
        {
          branch: "main",
          new_branch: expect.stringMatching(/^pr-patch-\d+-/),
          message: "Add test file",
          files: [
            {
              operation: "create",
              path: "test.txt",
              content: Buffer.from("Hello World").toString("base64"),
            },
          ],
        },
        { format: "json" },
      );
      expect(mockClient.repos.repoCreateBranch).not.toHaveBeenCalled();
      expect(mockClient.repos.repoCreateFile).not.toHaveBeenCalled();
      expect(mockClient.repos.repoUpdateFile).not.toHaveBeenCalled();
    });

    it("commits creates and updates together, reading each path on the base branch", async () => {
      mockSuccessfulCreate();
      mockClient.repos.repoGetContents.mockImplementation(
        async (_o: string, _r: string, path: string) => {
          if (path === "old.bean") return { data: { sha: "old-sha" } };
          throw { status: 404 };
        },
      );

      await service.createPRFromPatch(identity, owner, repo, {
        ...input,
        changes: [
          { path: "old.bean", content: "a" },
          { path: "new.bean", content: "b" },
        ],
      });

      expect(mockClient.repos.repoChangeFiles).toHaveBeenCalledTimes(1);
      const body = mockClient.repos.repoChangeFiles.mock.calls[0][2];
      expect(body.files).toEqual([
        {
          operation: "update",
          path: "old.bean",
          content: Buffer.from("a").toString("base64"),
          sha: "old-sha",
        },
        {
          operation: "create",
          path: "new.bean",
          content: Buffer.from("b").toString("base64"),
        },
      ]);
      for (const call of mockClient.repos.repoGetContents.mock.calls) {
        if (call[2] === "old.bean" || call[2] === "new.bean") {
          expect(call[3]).toEqual({ ref: "main" });
        }
      }
    });

    it("sends a path named twice once, with the last content", async () => {
      mockSuccessfulCreate();

      await service.createPRFromPatch(identity, owner, repo, {
        ...input,
        changes: [
          { path: "a.bean", content: "first" },
          { path: "a.bean", content: "second" },
        ],
      });

      const body = mockClient.repos.repoChangeFiles.mock.calls[0][2];
      expect(body.files).toEqual([
        {
          operation: "create",
          path: "a.bean",
          content: Buffer.from("second").toString("base64"),
        },
      ]);
    });

    it("refuses two new files that differ only by letter case, before writing", async () => {
      mockSuccessfulCreate();

      await expect(
        service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [
            { path: "Main.bean", content: "a" },
            { path: "main.bean", content: "b" },
          ],
        }),
      ).rejects.toMatchObject({ category: "CONFLICT" });
      expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
      expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
    });

    describe("file-vs-folder and in-batch prefix collisions (w31/084)", () => {
      it.each([
        ["file", "main.bean"],
        ["symlink", "link.bean"],
        ["submodule", "submod"],
      ] as const)(
        "refuses creating a path beneath an existing %s (%s) before committing",
        async (type, existingPath) => {
          mockSuccessfulCreate();
          mockClient.repos.repoGetContentsList.mockResolvedValue({
            data: [{ path: existingPath, type }],
          });

          const failure = await service
            .createPRFromPatch(identity, owner, repo, {
              ...input,
              changes: [
                { path: `${existingPath}/sub.bean`, content: "; test\n" },
              ],
            })
            .catch((error: unknown) => error);

          expect(failure).toMatchObject({
            category: "CONFLICT",
            message: expect.stringContaining(
              `${existingPath} is a file, not a folder`,
            ),
            metadata: {
              hint: "Choose another path, or delete the file first.",
            },
          });
          expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
          expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
          // Must fail at depth 1 without a wasted repoGetContents(existingPath) listing call.
          expect(mockClient.repos.repoGetContents).toHaveBeenCalledTimes(1);
          expect(mockClient.repos.repoGetContents).toHaveBeenCalledWith(
            owner,
            repo,
            `${existingPath}/sub.bean`,
            { ref: "main" },
            { format: "json" },
          );
        },
      );

      it("refuses creating a file at an existing folder path before committing", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockImplementation(
          async (_o: string, _r: string, path: string) => {
            if (path === "txns") {
              return { data: [{ path: "txns/2026.bean", type: "file" }] };
            }
            throw { status: 404 };
          },
        );
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [
            { path: "main.bean", type: "file" },
            { path: "txns", type: "dir" },
          ],
        });

        const failure = await service
          .createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [{ path: "txns", content: "; collide with folder\n" }],
          })
          .catch((error: unknown) => error);

        expect(failure).toMatchObject({
          category: "CONFLICT",
          message: expect.stringContaining("existing folder"),
          metadata: {
            hint: "Choose another path, or delete the folder's files first.",
          },
        });
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
        expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
      });

      it("refuses creating a file at a nested existing folder path before committing", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockImplementation(
          async (_o: string, _r: string, path: string) => {
            if (path === "txns") {
              return { data: [{ path: "txns/sub", type: "dir" }] };
            }
            if (path === "txns/sub") {
              return { data: [{ path: "txns/sub/2026.bean", type: "file" }] };
            }
            throw { status: 404 };
          },
        );
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [{ path: "txns", type: "dir" }],
        });

        const failure = await service
          .createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [
              { path: "txns/sub", content: "; collide with nested folder\n" },
            ],
          })
          .catch((error: unknown) => error);

        expect(failure).toMatchObject({
          category: "CONFLICT",
          message: expect.stringContaining("existing folder"),
        });
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
      });

      it.each([
        [
          { path: "qa-dir", content: "; a\n" },
          { path: "qa-dir/sub.bean", content: "; b\n" },
        ],
        [
          { path: "qa-dir/sub.bean", content: "; b\n" },
          { path: "qa-dir", content: "; a\n" },
        ],
        [
          { path: "qa-dir", content: "; a\n" },
          { path: "QA-DIR/sub.bean", content: "; b\n" },
        ],
      ])(
        "refuses a single PR batch creating both %j and %j before committing",
        async (first, second) => {
          mockSuccessfulCreate();

          const failure = await service
            .createPRFromPatch(identity, owner, repo, {
              ...input,
              changes: [first, second],
            })
            .catch((error: unknown) => error);

          expect(failure).toMatchObject({
            category: "CONFLICT",
            message: expect.stringContaining(
              "would be both a file and a folder",
            ),
          });
          expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
          expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
          expect(mockClient.repos.repoGetContentsList).not.toHaveBeenCalled();
        },
      );

      it("memoizes directory listings across multiple new files sharing a folder", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockImplementation(
          async (_o: string, _r: string, path: string) => {
            if (path === "txns") {
              return { data: [{ path: "txns/2026.bean", type: "file" }] };
            }
            throw { status: 404 };
          },
        );
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [{ path: "txns", type: "dir" }],
        });

        await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [
            { path: "txns/a.bean", content: "; a\n" },
            { path: "txns/b.bean", content: "; b\n" },
          ],
        });

        expect(mockClient.repos.repoGetContentsList).toHaveBeenCalledTimes(1);
        const dirListCalls = mockClient.repos.repoGetContents.mock.calls.filter(
          (call) => call[2] === "txns",
        );
        expect(dirListCalls).toHaveLength(1);
        expect(mockClient.repos.repoChangeFiles).toHaveBeenCalledTimes(1);
      });

      it("still allows creating a file inside a brand-new folder", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [{ path: "main.bean", type: "file" }],
        });

        const result = await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [{ path: "newdir/sub.bean", content: "; ok\n" }],
        });

        expect(result.prNumber).toBe(42);
        expect(mockClient.repos.repoChangeFiles).toHaveBeenCalledTimes(1);
      });
    });

    describe("percent-encoded repoGetContents paths (w31/090)", () => {
      // Model gitea-api.ts URL interpolation (`/contents/${filepath}?ref=...`):
      // unencoded `#` or `?` truncates the path and drops `ref`, and a bare `%`
      // triggers Gitea's 400 Bad Request before any repository lookup.
      function mockUrlAwareGetContents(
        files: ReadonlyMap<string, string>,
        dirs: ReadonlyMap<
          string,
          Array<{ path: string; type: "file" | "dir" }>
        > = new Map(),
      ) {
        mockClient.repos.repoGetContents.mockImplementation(
          async (
            _o: string,
            _r: string,
            filepath: string,
            query?: { ref?: string },
          ) => {
            const url = new URL(
              `/api/v1/repos/o/r/contents/${filepath}?ref=${encodeURIComponent(query?.ref ?? "")}`,
              "https://git.test",
            );
            const rawPath = url.pathname.replace(
              /^\/api\/v1\/repos\/o\/r\/contents\//,
              "",
            );
            let decoded: string;
            try {
              decoded = rawPath.split("/").map(decodeURIComponent).join("/");
            } catch {
              throw { status: 400, error: { message: "400 Bad Request" } };
            }
            const sha = files.get(decoded);
            if (sha !== undefined) return { data: { sha, path: decoded } };
            const entries = dirs.get(decoded);
            if (entries) return { data: entries };
            throw { status: 404 };
          },
        );
      }

      it("encodes each path segment for repoGetContents while sending raw paths to repoChangeFiles", async () => {
        mockSuccessfulCreate();
        mockUrlAwareGetContents(new Map([["main.bean", "main-sha"]]));
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [{ path: "main.bean", type: "file" }],
        });

        const result = await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [
            { path: "100%.bean", content: "; pct\n" },
            { path: "main.bean#note", content: "; hash\n" },
            { path: "dir%1/sub#2.bean", content: "; nested\n" },
          ],
        });

        expect(result.prNumber).toBe(42);
        expect(
          mockClient.repos.repoGetContents.mock.calls.map((call) => call[2]),
        ).toEqual(["100%25.bean", "main.bean%23note", "dir%251/sub%232.bean"]);
        const body = mockClient.repos.repoChangeFiles.mock.calls[0][2];
        expect(body.files).toEqual([
          {
            operation: "create",
            path: "100%.bean",
            content: Buffer.from("; pct\n").toString("base64"),
          },
          {
            operation: "create",
            path: "main.bean#note",
            content: Buffer.from("; hash\n").toString("base64"),
          },
          {
            operation: "create",
            path: "dir%1/sub#2.bean",
            content: Buffer.from("; nested\n").toString("base64"),
          },
        ]);
      });

      it("looks up and updates existing files whose paths contain % or #", async () => {
        mockSuccessfulCreate();
        mockUrlAwareGetContents(
          new Map([
            ["100%.bean", "pct-sha"],
            ["dir%1/main.bean#note", "hash-sha"],
          ]),
        );

        const result = await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [
            { path: "100%.bean", content: "; updated pct\n" },
            { path: "dir%1/main.bean#note", content: "; updated hash\n" },
          ],
        });

        expect(result.prNumber).toBe(42);
        expect(
          mockClient.repos.repoGetContents.mock.calls.map((call) => call[2]),
        ).toEqual(["100%25.bean", "dir%251/main.bean%23note"]);
        const body = mockClient.repos.repoChangeFiles.mock.calls[0][2];
        expect(body.files).toEqual([
          {
            operation: "update",
            path: "100%.bean",
            content: Buffer.from("; updated pct\n").toString("base64"),
            sha: "pct-sha",
          },
          {
            operation: "update",
            path: "dir%1/main.bean#note",
            content: Buffer.from("; updated hash\n").toString("base64"),
            sha: "hash-sha",
          },
        ]);
      });

      it("encodes nested dir segments when listFolder walks existing %/# directories", async () => {
        mockSuccessfulCreate();
        mockUrlAwareGetContents(
          new Map([["dir%1/sub#2/existing.bean", "existing-sha"]]),
          new Map([
            ["dir%1", [{ path: "dir%1/sub#2", type: "dir" }]],
            [
              "dir%1/sub#2",
              [{ path: "dir%1/sub#2/existing.bean", type: "file" }],
            ],
          ]),
        );
        mockClient.repos.repoGetContentsList.mockResolvedValue({
          data: [{ path: "dir%1", type: "dir" }],
        });

        const result = await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          changes: [{ path: "dir%1/sub#2/new.bean", content: "; ok\n" }],
        });

        expect(result.prNumber).toBe(42);
        expect(
          mockClient.repos.repoGetContents.mock.calls.map((call) => call[2]),
        ).toEqual(["dir%251/sub%232/new.bean", "dir%251", "dir%251/sub%232"]);

        // Portable-twin detection still catches case collisions inside %/# dirs.
        mockClient.repos.repoChangeFiles.mockClear();
        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [
              { path: "dir%1/sub#2/Existing.bean", content: "; twin\n" },
            ],
          }),
        ).rejects.toMatchObject({ category: "CONFLICT" });
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
      });

      it("does not let main.bean#aux?bad bypass assertPortableRepoPath via fragment truncation", async () => {
        mockSuccessfulCreate();
        mockUrlAwareGetContents(new Map([["main.bean", "main-sha"]]));

        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [{ path: "main.bean#aux?bad", content: "; probe\n" }],
          }),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          message: expect.stringContaining('<>:"|?*'),
        });
        expect(mockClient.repos.repoGetContents).toHaveBeenCalledWith(
          owner,
          repo,
          "main.bean%23aux%3Fbad",
          { ref: "main" },
          { format: "json" },
        );
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
        expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
      });
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
      expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
    });

    it("does not relabel another base-branch failure as not found", async () => {
      mockClient.repos.repoGetBranch.mockRejectedValue({ status: 502 });

      const failure = await service
        .createPRFromPatch(identity, owner, repo, input)
        .catch((error: unknown) => error);
      expect(failure).not.toMatchObject({ category: "NOT_FOUND" });
      expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
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
      expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
    });

    // The base branch is the tail of a git-host URL path: a name outside
    // git's ref rules, or holding a URL delimiter or leading/trailing
    // whitespace (w31/056), never reaches the host.
    it.each([
      "../../other/repo",
      "main?x=1",
      "main#x",
      "a//b",
      "main..x",
      "/main",
      "feat.lock",
      " main ",
      "main ",
      " main",
      "\tmain\n",
      " no-such-branch-qa ",
      "main\u0000x",
      "main\u001fx",
      "main x",
      "main\u007fx",
      "main~1",
      "main^",
      "a:b",
      "a*b",
      "a[b",
      "a\\b",
      "a%2fb",
    ])(
      "refuses the base branch %j as bad input before reading it",
      async (baseBranch) => {
        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            baseBranch,
          }),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "baseBranch" },
        });
        expect(mockGiteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
        expect(mockClient.repos.repoGetBranch).not.toHaveBeenCalled();
      },
    );

    it.each(["", "   "])(
      "refuses empty or blank baseBranch %j as bad input before reading it",
      async (baseBranch) => {
        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            baseBranch,
          }),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          message: "baseBranch must not be empty",
          metadata: { field: "baseBranch" },
        });
        expect(mockGiteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
        expect(mockClient.repos.repoGetBranch).not.toHaveBeenCalled();
      },
    );

    // The control-character class ends at DEL: git allows non-ASCII in a ref
    // name, including the C1 range just past it.
    it.each(["feature/café", "功能/分支", "main\u0080x", "main\u00a0x"])(
      "accepts the non-ASCII base branch %j, as git allows",
      async (baseBranch) => {
        mockSuccessfulCreate();
        await service.createPRFromPatch(identity, owner, repo, {
          ...input,
          baseBranch,
        });
        expect(mockClient.repos.repoGetBranch).toHaveBeenCalledWith(
          owner,
          repo,
          baseBranch,
          { format: "json" },
        );
      },
    );

    it("accepts a base branch with a slash, as git allows", async () => {
      mockSuccessfulCreate();
      await service.createPRFromPatch(identity, owner, repo, {
        ...input,
        baseBranch: "release/2026-11",
      });
      expect(mockClient.repos.repoGetBranch).toHaveBeenCalledWith(
        owner,
        repo,
        "release/2026-11",
        { format: "json" },
      );
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
      const legacy = {
        ...input,
        changes: [{ path: "aux.bean", content: "x" }],
      };

      it("opens a pull request that updates an existing aux.bean", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoGetContents.mockResolvedValue({
          data: { sha: "old-sha", path: "aux.bean" },
        });
        const result = await service.createPRFromPatch(
          identity,
          owner,
          repo,
          legacy,
        );

        expect(result.prNumber).toBe(42);
        expect(
          mockClient.repos.repoChangeFiles.mock.calls[0][2].files[0],
        ).toMatchObject({ operation: "update", sha: "old-sha" });
      });

      it("refuses one that would create aux.bean, before any branch exists", async () => {
        mockSuccessfulCreate();

        await expect(
          service.createPRFromPatch(identity, owner, repo, legacy),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          message: expect.stringContaining("Windows device name"),
        });
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
        expect(mockClient.repos.repoDeleteBranch).not.toHaveBeenCalled();
      });

      it("still refuses an unsafe path before creating a branch", async () => {
        mockSuccessfulCreate();

        await expect(
          service.createPRFromPatch(identity, owner, repo, {
            ...input,
            changes: [{ path: "../x.bean", content: "x" }],
          }),
        ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
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
      expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
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
        mockClient.repos.repoChangeFiles.mock.calls[0][2].new_branch;
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
      mockClient.repos.repoGetContents.mockRejectedValue({ status: 404 });
      mockClient.repos.repoChangeFiles.mockRejectedValue({ status: 500 });

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
        [
          "repoChangeFiles",
          /while committing the changes to new branch pr-patch-/,
        ],
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
            method === "repoChangeFiles" ? 0 : 1,
          );
        },
      );

      it("keeps a text body Gitea sent instead of JSON", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoChangeFiles.mockRejectedValue(
          textFailure(500, "runtime error: invalid memory address"),
        );

        await expect(
          service.createPRFromPatch(identity, owner, repo, input),
        ).rejects.toThrow(
          /Gitea 500 while committing the changes to new branch \S+: runtime error: invalid memory address/,
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
        expect(mockClient.repos.repoChangeFiles).not.toHaveBeenCalled();
      });

      it("keeps a repository refusal a plain failure naming the step", async () => {
        mockSuccessfulCreate();
        mockClient.repos.repoChangeFiles.mockRejectedValue({
          status: 422,
          error: { message: "repository file already exists" },
        });

        const failure = await service
          .createPRFromPatch(identity, owner, repo, input)
          .catch((error: unknown) => error);
        expect(failure).not.toHaveProperty("category");
        expect((failure as Error).message).toMatch(
          /^Gitea 422 while committing the changes to new branch pr-patch-\S+: repository file already exists$/,
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
        mockClient.repos.repoChangeFiles.mock.calls,
        mockClient.repos.repoGetContents.mock.calls,
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

    it("requests a parsed PR body when checking the merge directive limit", async () => {
      mockClient.repos.repoGetPullRequest.mockImplementation(
        async (
          _owner: string,
          _repo: string,
          _prNumber: number,
          params?: { format?: string },
        ) => ({
          data:
            params?.format === "json"
              ? { head: { sha: "head000" }, merge_base: "base000" }
              : null,
        }),
      );
      mockClient.repos.repoMergePullRequest.mockResolvedValue({
        data: { merged: true },
      });

      await service.mergePR(identity, owner, repo, prNumber);

      expect(mockClient.repos.repoGetPullRequest).toHaveBeenCalledWith(
        owner,
        repo,
        prNumber,
        { format: "json" },
      );
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

  describe.each(["getPRDetails", "mergePR", "closePR"] as const)(
    "%s prNumber validation (w31/035)",
    (method) => {
      it.each([0, -1, 1.5, Number.NaN])(
        "refuses prNumber=%p as BAD_USER_INPUT before contacting Gitea",
        async (invalidPrNumber) => {
          const failure = await service[method](
            identity,
            "testowner",
            "testrepo",
            invalidPrNumber,
          ).catch((error: unknown) => error);
          expect(failure).toMatchObject({
            category: "BAD_USER_INPUT",
            message: "prNumber must be a positive integer",
            metadata: { field: "prNumber" },
          });
          expect(
            mockGiteaClientFactory.getUserApiClient,
          ).not.toHaveBeenCalled();
          expect(mockClient.repos.repoGetPullRequest).not.toHaveBeenCalled();
          expect(mockClient.repos.repoMergePullRequest).not.toHaveBeenCalled();
          expect(mockClient.repos.repoEditPullRequest).not.toHaveBeenCalled();
        },
      );
    },
  );

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
