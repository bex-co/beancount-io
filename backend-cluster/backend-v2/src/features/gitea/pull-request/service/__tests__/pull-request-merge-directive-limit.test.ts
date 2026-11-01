import { PullRequestService } from "../pull-request-service";
import { evaluateMergeDirectiveLimit } from "@/features/gitea/policy/directive-limit-gate";
import { ResourceLimitReachedError } from "@/shared/errors";

// Merging a pull request is held to the ledger's directive limit (w0/m6). The
// verdict itself is tested in policy/__tests__/merge-directive-limit.test.ts;
// these pin what the merge does with it on every surface, since GraphQL, REST
// and MCP all merge through PullRequestService.mergePR.

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

jest.mock("@/features/gitea/policy/directive-limit-gate", () => ({
  ...jest.requireActual("@/features/gitea/policy/directive-limit-gate"),
  evaluateMergeDirectiveLimit: jest.fn(),
}));

const verdictMock = evaluateMergeDirectiveLimit as jest.Mock;
const identity = {
  userId: "user-1",
  method: "session",
  scopes: new Set<string>(),
} as const;
const ledgerClient = { request: jest.fn() };

function setup() {
  const repos = {
    repoGetPullRequest: jest.fn(async () => ({
      data: { head: { sha: "head000" }, merge_base: "base000" },
    })),
    repoMergePullRequest: jest.fn(async () => ({ data: null })),
  };
  const getPublicApiClient = jest.fn(async () => ledgerClient);
  const service = new PullRequestService(
    { getUserApiClient: jest.fn(async () => ({ repos })) } as never,
    { authorizeOrThrow: jest.fn(async () => ({ allowed: true })) } as never,
    {
      models: {},
      db: {},
      stripe: {},
      cacheHelper: {},
      favaClientFactory: { getPublicApiClient },
    } as never,
  );
  return { service, repos, getPublicApiClient };
}

beforeEach(() => verdictMock.mockReset());

describe("mergePR and the directive limit", () => {
  it("refuses an over-limit merge without merging", async () => {
    verdictMock.mockResolvedValue({ decision: "over", count: 110, limit: 100 });
    const { service, repos } = setup();

    const refusal = service.mergePR(identity, "alice", "books", 7);

    await expect(refusal).rejects.toBeInstanceOf(ResourceLimitReachedError);
    await expect(refusal).rejects.toMatchObject({
      metadata: {
        resource: "directives",
        limit: 100,
        current: 110,
        limitOwner: "LEDGER_OWNER",
      },
      message: expect.stringContaining("over the 100 the free plan allows"),
    });
    expect(repos.repoMergePullRequest).not.toHaveBeenCalled();
  });

  it("checks the pull request's head and merge base as the merging user", async () => {
    verdictMock.mockResolvedValue({ decision: "under", count: 90, limit: 100 });
    const { service, getPublicApiClient } = setup();

    await service.mergePR(identity, "alice", "books", 7);

    expect(getPublicApiClient).toHaveBeenCalledWith("alice/books", "user-1");
    expect(verdictMock).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerClient }),
      "alice",
      "books",
      { head: "head000", mergeBase: "base000" },
    );
  });

  it.each([
    { decision: "under", count: 90, limit: 100 },
    { decision: "unlimited" },
    { decision: "unknown", reason: "count: ECONNREFUSED" },
  ])("merges on a $decision verdict", async (verdict) => {
    verdictMock.mockResolvedValue(verdict);
    const { service, repos } = setup();

    await expect(
      service.mergePR(identity, "alice", "books", 7),
    ).resolves.toEqual({ success: true, message: "PR merged successfully" });
    expect(repos.repoMergePullRequest).toHaveBeenCalledTimes(1);
  });

  it("merges, and lets the merge report its own failure, when the pull request cannot be read", async () => {
    const { service, repos } = setup();
    repos.repoGetPullRequest.mockRejectedValueOnce(
      Object.assign(new Error("not found"), { status: 404 }),
    );

    await service.mergePR(identity, "alice", "books", 7);

    expect(verdictMock).not.toHaveBeenCalled();
    expect(repos.repoMergePullRequest).toHaveBeenCalledTimes(1);
  });
});
