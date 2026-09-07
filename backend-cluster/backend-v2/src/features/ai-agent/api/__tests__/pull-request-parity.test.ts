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
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
  tokenId: "tok_pr",
};
const resultFields = "success message prNumber prUrl";
const detailsFields =
  "number title description state author headBranch baseBranch files{filename additions deletions changes} diff";
let resolver: PullRequestResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
type Surface = "rest" | "mcp" | "gql";
const surfaces: Surface[] = ["rest", "mcp", "gql"];
async function fixture(caller = identity) {
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
  const repos = {
    repoGetBranch: jest.fn(async (_o: string, _n: string, branch: string) => {
      if (!branches.has(branch)) throw new Error("Base branch missing");
      return { data: { name: branch } };
    }),
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
        if (!branches.get(ref)?.has(path)) throw { status: 404 };
        return { data: { sha: "sha-original" } };
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
    config,
    { apiKeys: false },
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      pullRequestWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
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
        const r = await client.callTool({
          name: "managePullRequests",
          arguments: {
            operation,
            ledger: "alice/main",
            ...(operation !== "create" && { prNumber: 1 }),
            ...input,
          },
        });
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
describe("PR creation, inspection, and review through real adapters/workflow/service", () => {
  it.each(surfaces)(
    "creates patches, reads details, and merges via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const created = await f.call(surface, "create", {
          title: "Café patch",
          description: "Review",
          baseBranch: "feature/base",
          changes,
        });
        expect(created.failed).toBe(false);
        expect(created.data).toEqual({
          success: true,
          prNumber: 1,
          prUrl: "https://example.com/alice/main/pulls/1",
          message: "Pull request created successfully",
        });
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
        expect(
          (await f.call(surface, "create", { title: "Patch", changes })).data,
        ).toMatchObject({ success: true });
        expect(f.prs.get(1)?.base.ref).toBe("main");
        expect(f.prs.get(1)?.body).toBe("");
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
                op === "create" ? { title: "Patch", changes } : {},
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
                op === "create" ? { title: "Patch", changes } : {},
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
                op === "create" ? { title: "Patch", changes } : {},
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
              op === "create" ? { title: "Patch", changes } : {},
            )
          ).failed,
        ).toBe(true);
      await expect(f.details(surface)).rejects.toThrow();
      expect(f.getUserApiClient).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
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
        expect(
          (
            await f.client.callTool({
              name: "managePullRequests",
              arguments: args,
            })
          ).isError,
        ).toBe(true);
    } finally {
      await f.close();
    }
  });
});
