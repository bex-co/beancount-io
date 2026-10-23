import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { PullRequestService } from "@/features/gitea/pull-request/service/pull-request-service";
import { PullRequestWorkflow } from "@/features/gitea/pull-request/workflow/pull-request-workflow";
import { PullRequestResolver } from "@/features/gitea/pull-request/api/pull-request-resolver";
import {
  AuthorizationService,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * The MCP tool for one managePullRequests operation (ADR 019, 2026-10-18; w1/m38):
 * each operation is its own tool, so the call names it and drops `operation`.
 * An unknown operation names a tool that does not exist.
 */
const MCP_TOOL_FOR: Readonly<Record<string, string>> = {
  create: "createPullRequest",
  approve: "mergePullRequest",
  reject: "rejectPullRequest",
};
function perOperation(args: Record<string, unknown>) {
  const { operation, ...rest } = args;
  return {
    name:
      MCP_TOOL_FOR[String(operation)] ?? `no-such-tool-${String(operation)}`,
    arguments: rest,
  };
}

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
// MCP masks an uncoded failure's message in production; REST and GraphQL
// keep a DomainError's.
const prodConfig = { ...config, env: "production" } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
  tokenId: "tok_pr",
};
const resultFields = "success message prNumber prUrl baseBranch headBranch";
const detailsFields =
  "number title description state author headBranch baseBranch files{filename additions deletions changes} diff";
let resolver: PullRequestResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];
async function fixture(caller = identity, appConfig = config) {
  const branches = new Map<string, Map<string, string>>([
    ["main", new Map([["main.bean", "old"]])],
    ["feature/base", new Map([["main.bean", "old"]])],
  ]);
  const prs = new Map<
    number,
    {
      number: number;
      title: string;
      body: string;
      state: string;
      user: { login: string };
      head: { ref: string };
      base: { ref: string };
    }
  >();
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const user = { ledger_username: "alice", ledger_password: "fixture-only" };
  const models = { user: { getById: async () => user } };
  // A folder's entries on a branch, as Gitea lists them.
  const listing = (ref: string, dir?: string) => {
    const prefix = dir === undefined ? "" : `${dir}/`;
    const entries = new Map<string, { path: string; type: string }>();
    for (const file of branches.get(ref)?.keys() ?? []) {
      if (!file.startsWith(prefix)) continue;
      const [name, ...below] = file.slice(prefix.length).split("/");
      const path = prefix + name;
      entries.set(path, { path, type: below.length > 0 ? "dir" : "file" });
    }
    return [...entries.values()];
  };
  const repos = {
    repoGetContentsList: jest.fn(
      async (_o: string, _n: string, { ref }: { ref: string }) => ({
        data: listing(ref),
      }),
    ),
    repoGetBranch: jest.fn(async (_o: string, _n: string, branch: string) => {
      if (!branches.has(branch)) throw new Error("Base branch missing");
      return { data: { name: branch } };
    }),
    repoCompareDiff: jest.fn(async () => ({ data: { total_commits: 1 } })),
    repoDeleteBranch: jest.fn(
      async (_o: string, _n: string, branch: string) => {
        branches.delete(branch);
        return { data: null };
      },
    ),
    repoCreateBranch: jest.fn(
      async (
        _o: string,
        _n: string,
        input: { new_branch_name: string; old_ref_name: string },
      ) => {
        branches.set(
          input.new_branch_name,
          new Map(branches.get(input.old_ref_name)),
        );
        return { data: { name: input.new_branch_name } };
      },
    ),
    repoGetContents: jest.fn(
      async (
        _o: string,
        _n: string,
        path: string,
        { ref }: { ref: string },
      ) => {
        if (branches.get(ref)?.has(path))
          return { data: { sha: "sha-original" } };
        const folder = listing(ref, path);
        if (folder.length === 0) throw { status: 404 };
        return { data: folder };
      },
    ),
    repoUpdateFile: jest.fn(
      async (
        _o: string,
        _n: string,
        path: string,
        input: { branch: string; content: string; sha: string },
      ) => {
        if (input.sha !== "sha-original") throw new Error("Stale SHA");
        branches
          .get(input.branch)!
          .set(path, Buffer.from(input.content, "base64").toString());
        return { data: {} };
      },
    ),
    repoCreateFile: jest.fn(
      async (
        _o: string,
        _n: string,
        path: string,
        input: { branch: string; content: string },
      ) => {
        branches
          .get(input.branch)!
          .set(path, Buffer.from(input.content, "base64").toString());
        return { data: {} };
      },
    ),
    repoCreatePullRequest: jest.fn(
      async (
        _o: string,
        _n: string,
        input: { title: string; body: string; head: string; base: string },
      ) => {
        const pr = {
          number: 1,
          title: input.title,
          body: input.body,
          state: "open",
          user: { login: "alice" },
          head: { ref: input.head },
          base: { ref: input.base },
        };
        prs.set(1, pr);
        return {
          data: { ...pr, html_url: "https://example.com/alice/main/pulls/1" },
        };
      },
    ),
    repoGetPullRequest: jest.fn(async () => ({ data: prs.get(1) })),
    repoGetPullRequestFiles: jest.fn(async () => ({
      data: [
        { filename: "main.bean", additions: 1, deletions: 1, changes: 2 },
        { filename: "café.bean", additions: 1, deletions: 0, changes: 1 },
      ],
    })),
    repoDownloadPullDiffOrPatch: jest.fn(async () => ({
      data: "diff --git a/main.bean b/main.bean\n-old\n+new\n",
    })),
    repoMergePullRequest: jest.fn(async () => {
      const pr = prs.get(1);
      if (!pr || pr.state !== "open") throw new Error("PR is no longer open");
      branches.set(pr.base.ref, new Map(branches.get(pr.head.ref)));
      pr.state = "merged";
      return { data: {} };
    }),
    repoEditPullRequest: jest.fn(async () => {
      const pr = prs.get(1);
      if (!pr || pr.state !== "open") throw new Error("PR is no longer open");
      pr.state = "closed";
      return { data: {} };
    }),
  };
  const getUserApiClient = jest.fn(async () => ({ repos }));
  const service = new PullRequestService(
    { getUserApiClient } as never,
    authorization,
    NO_DIRECTIVE_LIMIT,
  );
  const workflow = new PullRequestWorkflow(
    service,
    models as never,
    {} as never,
  );
  resolver = new PullRequestResolver(workflow);
  schemaPromise ??= buildSchema({
    resolvers: [PullRequestResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { pullRequest: workflow } } as unknown as AppLayers,
    appConfig,
    { apiKeys: false },
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      pullRequestWorkflow: workflow,
    } as unknown as McpRequestContext,
    appConfig,
  );
  const client = new Client({ name: "pr-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const gql = (source: string, variableValues?: Record<string, unknown>) =>
    graphql({
      schema,
      source,
      variableValues,
      contextValue: { identity: caller, getCurrentIdentity: () => caller },
    });
  const normalize = (v: unknown) =>
    JSON.parse(JSON.stringify(v), (_k, value) =>
      value === null ? undefined : value,
    );
  return {
    repos,
    branches,
    gql,
    prs,
    check,
    authorize,
    user,
    getUserApiClient,
    client,
    call: async (
      surface: Surface,
      operation: "create" | "approve" | "reject",
      input: Record<string, unknown> = {},
    ) => {
      if (surface === "rest") {
        const suffix = operation === "create" ? "" : `/1/${operation}`;
        const r = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/pull-requests${suffix}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          },
        );
        return { failed: !r.ok, data: await r.json() };
      }
      if (surface === "mcp") {
        const r = await client.callTool(
          perOperation({
            operation,
            ledger: "alice/main",
            ...(operation !== "create" && { prNumber: 1 }),
            ...input,
          }),
        );
        return {
          failed: r.isError === true,
          data: (r.structuredContent as { result?: unknown } | undefined)
            ?.result,
        };
      }
      const r =
        operation === "create"
          ? await gql(
              `mutation($input:CreatePRFromPatchInput!){createPullRequestFromPatch(input:$input){${resultFields}}}`,
              { input: { ledgerOwner: "alice", ledgerName: "main", ...input } },
            )
          : await gql(
              `mutation{${operation}PullRequest(ledgerOwner:"alice",ledgerName:"main",prNumber:1){${resultFields}}}`,
            );
      return {
        failed: Boolean(r.errors),
        data: r.data ? normalize(Object.values(r.data)[0]) : undefined,
      };
    },
    details: async (surface: Surface) => {
      if (surface === "rest") {
        const r = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/pull-requests/1`,
        );
        if (!r.ok) throw new Error(`REST ${r.status}`);
        return r.json();
      }
      if (surface === "mcp") {
        const r = await client.readResource({
          uri: "beancount://alice/main/pull-request?prNumber=1",
        });
        const c = r.contents[0];
        if (!("text" in c)) throw new Error("Expected JSON");
        return JSON.parse(c.text);
      }
      const r = await gql(
        `{getPullRequestDetails(ledgerOwner:"alice",ledgerName:"main",prNumber:1){${detailsFields}}}`,
      );
      if (r.errors) throw r.errors[0];
      return r.data?.getPullRequestDetails;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}
const changes = [
  { path: "main.bean", content: "new" },
  { path: "café.bean", content: "Unicode café" },
];
// Create inputs require a description and a commit message on every surface.
const validCreate = {
  description: "Patch description",
  clearCommitMessage: "Patch commit",
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

describe("PR creation, inspection, and review through real adapters/workflow/service", () => {
  it.each(surfaces)(
    "creates patches, reads details, and merges via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const created = await f.call(surface, "create", {
          title: "Café patch",
          ...validCreate,
          description: "Review",
          baseBranch: "feature/base",
          changes,
        });
        expect(created.failed).toBe(false);
        // headBranch carries a timestamped random suffix; assert its shape.
        expect(created.data).toMatchObject({
          success: true,
          prNumber: 1,
          prUrl: "https://example.com/alice/main/pulls/1",
          message: "Pull request created successfully",
          baseBranch: "feature/base",
        });
        expect((created.data as { headBranch?: unknown }).headBranch).toMatch(
          /^pr-patch-/,
        );
        const pr = f.prs.get(1)!;
        expect([...f.branches.get(pr.head.ref)!]).toEqual([
          ["main.bean", "new"],
          ["café.bean", "Unicode café"],
        ]);
        expect(f.branches.get("feature/base")?.get("main.bean")).toBe("old");
        expect(await f.details(surface)).toEqual({
          number: 1,
          title: "Café patch",
          description: "Review",
          state: "open",
          author: "alice",
          headBranch: pr.head.ref,
          baseBranch: "feature/base",
          files: [
            { filename: "main.bean", additions: 1, deletions: 1, changes: 2 },
            { filename: "café.bean", additions: 1, deletions: 0, changes: 1 },
          ],
          diff: "diff --git a/main.bean b/main.bean\n-old\n+new\n",
        });
        expect((await f.call(surface, "approve")).data).toEqual({
          success: true,
          message: "PR merged successfully",
        });
        expect(f.branches.get("feature/base")?.get("main.bean")).toBe("new");
        expect(pr.state).toBe("merged");
        expect((await f.call(surface, "approve")).data).toEqual({
          success: false,
          message: "PR is no longer open",
        });
        expect(f.authorize.mock.calls.map(([v]) => v.action)).toEqual([
          AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_CREATE,
          AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_READ,
          AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_APPROVE,
          AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_APPROVE,
        ]);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "defaults creation inputs and closes without merging via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const createData = (
          await f.call(surface, "create", {
            title: "Patch",
            ...validCreate,
            changes,
          })
        ).data;
        expect(createData).toMatchObject({ success: true });
        expect(f.prs.get(1)?.base.ref).toBe("main");
        expect(f.prs.get(1)?.body).toBe(validCreate.description);
        expect((await f.call(surface, "reject")).data).toEqual({
          success: true,
          message: "PR closed successfully",
        });
        expect(f.prs.get(1)?.state).toBe("closed");
        expect(f.branches.get("main")?.get("main.bean")).toBe("old");
        expect((await f.call(surface, "approve")).data).toMatchObject({
          success: false,
        });
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "preserves missing-credential failures via %s",
    async (surface) => {
      const f = await fixture();
      f.user.ledger_password = "";
      try {
        for (const op of ["create", "approve", "reject"] as const)
          expect(
            (
              await f.call(
                surface,
                op,
                op === "create"
                  ? { title: "Patch", ...validCreate, changes }
                  : {},
              )
            ).data,
          ).toEqual({
            success: false,
            message: "Ledger credentials not configured",
          });
        await expect(f.details(surface)).rejects.toThrow();
        expect(f.getUserApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "rejects malformed paths before branch creation via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const r = await f.call(surface, "create", {
          title: "Bad patch",
          ...validCreate,
          changes: [changes[0], { path: "../escape.bean", content: "bad" }],
        });
        expect(r.failed).toBe(true);
        expect(f.repos.repoCreateBranch).not.toHaveBeenCalled();
        expect(f.branches.size).toBe(2);
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses revoked access before repository calls via %s",
    async (surface) => {
      const f = await fixture();
      f.check.mockResolvedValue(false);
      try {
        for (const op of ["create", "approve", "reject"] as const)
          expect(
            (
              await f.call(
                surface,
                op,
                op === "create"
                  ? { title: "Patch", ...validCreate, changes }
                  : {},
              )
            ).failed,
          ).toBe(true);
        await expect(f.details(surface)).rejects.toThrow();
        expect(f.getUserApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)(
    "refuses write operations with read scope via %s",
    async (surface) => {
      const f = await fixture({
        ...identity,
        scopes: new Set(["ledger.read"]),
      });
      try {
        for (const op of ["create", "approve", "reject"] as const)
          expect(
            (
              await f.call(
                surface,
                op,
                op === "create"
                  ? { title: "Patch", ...validCreate, changes }
                  : {},
              )
            ).failed,
          ).toBe(true);
        expect(f.getUserApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each(surfaces)("refuses different-ledger pins via %s", async (surface) => {
    const f = await fixture({ ...identity, ledgerScope: "other/books" });
    try {
      for (const op of ["create", "approve", "reject"] as const)
        expect(
          (
            await f.call(
              surface,
              op,
              op === "create"
                ? { title: "Patch", ...validCreate, changes }
                : {},
            )
          ).failed,
        ).toBe(true);
      await expect(f.details(surface)).rejects.toThrow();
      expect(f.getUserApiClient).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it.each(surfaces)(
    "leaves no branch behind when a create is refused via %s",
    async (surface) => {
      const f = await fixture();
      try {
        // Nothing to apply: refused before any branch is minted.
        const empty = await f.call(surface, "create", {
          title: "Patch",
          ...validCreate,
          changes: [],
        });
        expect(empty.failed).toBe(true);
        expect(f.repos.repoCreateBranch).not.toHaveBeenCalled();
        // Changes that turn out identical to the base: the branch exists by
        // the time the empty diff is seen, and is removed again.
        f.repos.repoCompareDiff.mockResolvedValue({
          data: { total_commits: 0 },
        });
        const same = await f.call(surface, "create", {
          title: "Patch",
          ...validCreate,
          changes,
        });
        expect(same.failed).toBe(true);
        expect(f.repos.repoCreateBranch).toHaveBeenCalledTimes(1);
        expect([...f.branches.keys()]).toEqual(["main", "feature/base"]);
        expect(f.prs.size).toBe(0);
      } finally {
        await f.close();
      }
    },
  );
  it("answers creating against an unknown base branch as NOT_FOUND on every surface", async () => {
    const f = await fixture();
    f.repos.repoGetBranch.mockRejectedValue({ status: 404 });
    const input = {
      title: "Patch",
      ...validCreate,
      baseBranch: "qa-no-such-branch",
      changes,
    };
    try {
      const rest = await f.call("rest", "create", input);
      expect(rest.failed).toBe(true);
      expect(rest.data).toMatchObject({ error: { code: "NOT_FOUND" } });
      const mcp = await f.client.callTool(
        perOperation({ operation: "create", ledger: "alice/main", ...input }),
      );
      expect(mcp.isError).toBe(true);
      expect(mcp.structuredContent).toMatchObject({
        error: {
          code: "NOT_FOUND",
          hint: expect.stringContaining("baseBranch"),
        },
      });
      expect((await f.call("gql", "create", input)).failed).toBe(true);
      expect(f.repos.repoCreateBranch).not.toHaveBeenCalled();
      expect(f.branches.size).toBe(2);
    } finally {
      await f.close();
    }
  });
  // A clone on macOS or Windows keeps one of two paths that differ only by
  // letter case (w23/068): one the branch has, or one this request creates.
  it.each([
    [
      [{ path: "MAIN.bean", content: "x" }],
      "MAIN.bean already exists as main.bean",
    ],
    [
      [
        { path: "notes.bean", content: "x" },
        { path: "Notes.bean", content: "y" },
      ],
      "Notes.bean already exists as notes.bean",
    ],
    [
      [{ path: "Main.bean/x.bean", content: "x" }],
      "already exists as main.bean",
    ],
  ])(
    "refuses creating %j, a case twin, on every surface and deletes its branch",
    async (twinChanges, message) => {
      const f = await fixture();
      const input = { title: "Patch", ...validCreate, changes: twinChanges };
      try {
        const rest = await f.call("rest", "create", input);
        expect(rest).toMatchObject({
          failed: true,
          data: {
            error: {
              code: "CONFLICT",
              message: expect.stringContaining(message),
            },
          },
        });
        const mcp = await f.client.callTool(
          perOperation({ operation: "create", ledger: "alice/main", ...input }),
        );
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          error: {
            code: "CONFLICT",
            message: expect.stringContaining(message),
          },
        });
        expect((await f.call("gql", "create", input)).failed).toBe(true);
        expect(f.repos.repoCreatePullRequest).not.toHaveBeenCalled();
        expect([...f.branches.keys()]).toEqual(["main", "feature/base"]);
      } finally {
        await f.close();
      }
    },
  );
  it("answers reading an unknown pull request as NOT_FOUND on every surface", async () => {
    const f = await fixture();
    // What the generated client throws for a number Gitea does not know.
    f.repos.repoGetPullRequest.mockRejectedValue({ status: 404 });
    try {
      await expect(f.details("rest")).rejects.toThrow("REST 404");
      await expect(f.details("mcp")).rejects.toMatchObject({
        code: -32002,
        data: { code: "NOT_FOUND" },
      });
      await expect(f.details("gql")).rejects.toMatchObject({
        originalError: { category: "NOT_FOUND" },
      });
    } finally {
      await f.close();
    }
  });
  it.each(["approve", "reject"] as const)(
    "answers %s of an unknown pull request as NOT_FOUND on every surface",
    async (operation) => {
      const f = await fixture();
      // What the generated client throws for a number Gitea does not know.
      f.repos.repoMergePullRequest.mockRejectedValue({ status: 404 });
      f.repos.repoEditPullRequest.mockRejectedValue({ status: 404 });
      try {
        const rest = await f.call("rest", operation);
        expect(rest.failed).toBe(true);
        expect(rest.data).toMatchObject({ error: { code: "NOT_FOUND" } });
        const mcp = await f.client.callTool(
          perOperation({ operation, ledger: "alice/main", prNumber: 1 }),
        );
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          error: { code: "NOT_FOUND" },
        });
        expect(JSON.stringify(mcp.structuredContent)).not.toContain(
          "Unknown error",
        );
        expect((await f.call("gql", operation)).failed).toBe(true);
      } finally {
        await f.close();
      }
    },
  );
  describe("a Gitea failure while creating names its step on every surface (w3/645)", () => {
    const input = { title: "Patch", ...validCreate, changes };
    const createMutation = `mutation($input:CreatePRFromPatchInput!){createPullRequestFromPatch(input:$input){${resultFields}}}`;
    const mcpCreate = (f: Awaited<ReturnType<typeof fixture>>) =>
      f.client.callTool(
        perOperation({ operation: "create", ledger: "alice/main", ...input }),
      );

    it.each([
      ["repoCreateBranch", "creating branch pr-patch-"],
      ["repoUpdateFile", "writing main.bean"],
      ["repoCreateFile", "writing café.bean"],
      ["repoCreatePullRequest", "opening the pull request"],
    ] as const)(
      "reports a 500 in %s as SERVICE_UNAVAILABLE",
      async (method, step) => {
        const f = await fixture(identity, prodConfig);
        // A text body, as a panic or proxy page arrives through the client.
        f.repos[method].mockRejectedValue({
          status: 500,
          error: new SyntaxError("Unexpected token"),
          text: async () => "gitea panic",
        });
        const expected = expect.stringContaining(`Gitea 500 while ${step}`);
        try {
          const rest = await f.call("rest", "create", input);
          expect(rest.failed).toBe(true);
          expect(rest.data).toMatchObject({
            error: { code: "SERVICE_UNAVAILABLE", message: expected },
          });
          expect(rest.data.error.message).toContain("gitea panic");
          const mcp = await mcpCreate(f);
          expect(mcp.isError).toBe(true);
          expect(mcp.structuredContent).toMatchObject({
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: expected,
              hint: expect.stringContaining("changing the request will not"),
            },
          });
          const gql = await f.gql(createMutation, {
            input: { ledgerOwner: "alice", ledgerName: "main", ...input },
          });
          expect(gql.errors?.[0]).toMatchObject({
            message: expected,
            originalError: { category: "SERVICE_UNAVAILABLE" },
          });
          // Nothing was opened, so every minted branch was removed again.
          expect([...f.branches.keys()]).toEqual(["main", "feature/base"]);
        } finally {
          await f.close();
        }
      },
    );

    it("keeps a repository refusal's step and reason on MCP in production", async () => {
      const f = await fixture(identity, prodConfig);
      f.repos.repoUpdateFile.mockRejectedValue({
        status: 409,
        error: { message: "sha does not match" },
      });
      const refused = {
        success: false,
        message:
          "Failed to create PR: Gitea 409 while writing main.bean: sha does not match",
      };
      try {
        expect((await f.call("rest", "create", input)).data).toEqual(refused);
        expect((await f.call("gql", "create", input)).data).toEqual(refused);
        const mcp = await mcpCreate(f);
        expect(mcp.isError).toBe(true);
        expect(mcp.structuredContent).toMatchObject({
          error: { code: "OPERATION_NOT_ALLOWED", message: refused.message },
          result: refused,
        });
      } finally {
        await f.close();
      }
    });
  });
  it("marks failed MCP reviews as errors while retaining their domain result", async () => {
    const f = await fixture();
    try {
      const r = await f.call("mcp", "approve");
      expect(r.failed).toBe(true);
      expect(r.data).toEqual({
        success: false,
        message: "PR is no longer open",
      });
      for (const args of [
        { operation: "create", ledger: "alice/main" },
        { operation: "approve", ledger: "alice/main" },
        { operation: "approve", ledger: "alice/main", prNumber: 1, changes },
        {
          operation: "reject",
          ledger: "alice/main",
          prNumber: 1,
          dry_run: true,
        },
      ])
        expect((await f.client.callTool(perOperation(args))).isError).toBe(
          true,
        );
    } finally {
      await f.close();
    }
  });
});
