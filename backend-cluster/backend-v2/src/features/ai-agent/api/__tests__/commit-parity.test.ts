import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerRepoQueryResolver } from "@/features/ledger/api/resolvers/ledger-repo-resolver.query";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { CommitsResolver } from "@/features/gitea/commits/api/commits-resolver";
import { CommitsService } from "@/features/gitea/commits/service/commits-service";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

const author = {
  name: "Café",
  email: "author@example.com",
  date: "2026-09-01T00:00:00Z",
};
const user = { login: "alice", full_name: "Café", email: author.email };
const commit = {
  sha: "abcdef123456",
  commit: { message: "Balance café", author, committer: author },
  author: user,
  committer: user,
  created: author.date,
  files: [{ filename: "main.bean" }],
  stats: { additions: 1, deletions: 1, total: 2 },
  parents: [{ sha: "parent123" }],
};
const diff =
  "diff --git a/main.bean b/main.bean\n--- a/main.bean\n+++ b/main.bean\n@@ -1 +1 @@\n-old\n+new\n";
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
async function fixture() {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const latest = jest
    .fn()
    .mockResolvedValue({ data: { success: true, data: [commit] } });
  const history = jest.fn().mockResolvedValue({ data: [commit] });
  const download = jest.fn().mockResolvedValue({ data: diff });
  const repos = {
    repoGetAllCommits: history,
    repoDownloadCommitDiffOrPatch: download,
  };
  const services = {
    ledgerRepo: new LedgerRepoService(
      {
        getPublicApiClient: async () => ({
          repo: { repoGetAllCommits: latest },
        }),
      } as never,
      authorization,
    ),
    commits: new CommitsService(
      { getUserApiClient: async () => ({ repos }) } as never,
      authorization,
    ),
  };
  resolvers = new Map<unknown, object>([
    [LedgerRepoQueryResolver, new LedgerRepoQueryResolver(services.ledgerRepo)],
    [CommitsResolver, new CommitsResolver(services.commits)],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerRepoQueryResolver, CommitsResolver],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    {
      identity: pinnedReadToken,
      services,
      commitsService: services.commits,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "commit-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    check,
    latest,
    history,
    download,
    rest: (path: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/${path}`),
    mcp: async (path: string) => {
      const result = await client.readResource({
        uri: `beancount://alice/main/${path}`,
      });
      const content = result.contents[0];
      if (!("text" in content)) throw new Error("Expected JSON");
      return JSON.parse(content.text);
    },
    gql: (source: string) =>
      graphql({
        schema,
        source: `{ ${source} }`,
        contextValue: {
          identity: pinnedReadToken,
          getCurrentIdentity: () => pinnedReadToken,
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}
const userFields = "login fullName email";
const authorFields = "name email date";
const latestFields = `sha message author { ${userFields} } committer { ${userFields} } created`;
const listFields = `sha message author { ${authorFields} } committer { ${authorFields} } shortSha`;
const detailFields = `sha message author { ${authorFields} } committer { ${authorFields} } files { filename additions deletions } stats { additions deletions total } diff parents`;
const listItem = {
  sha: commit.sha,
  message: commit.commit.message,
  author,
  committer: author,
  shortSha: "abcdef1",
};
const latestItem = {
  sha: commit.sha,
  message: commit.commit.message,
  author: { login: "alice", fullName: "Café", email: author.email },
  committer: { login: "alice", fullName: "Café", email: author.email },
  created: author.date,
};
const cases = [
  {
    path: "latest-commit",
    field: "getLatestLedgerCommit",
    args: "",
    selection: latestFields,
    expected: latestItem,
  },
  {
    path: "latest-commit?branchName=feature%2Fcaf%C3%A9",
    field: "getLatestLedgerCommit",
    args: ', branchName: "feature/café"',
    selection: latestFields,
    expected: latestItem,
  },
  {
    path: "commits",
    field: "listCommits",
    args: "",
    selection: listFields,
    expected: [listItem],
  },
  {
    path: "commits?branch=feature%2Fcaf%C3%A9&page=2&limit=7",
    field: "listCommits",
    args: ', branch: "feature/café", page: 2, limit: 7',
    selection: listFields,
    expected: [listItem],
  },
  {
    path: `commit-details?sha=${commit.sha}`,
    field: "getCommitDetails",
    args: `, sha: "${commit.sha}"`,
    selection: detailFields,
    expected: {
      sha: commit.sha,
      message: commit.commit.message,
      author,
      committer: author,
      files: [{ filename: "main.bean", additions: 1, deletions: 1 }],
      stats: commit.stats,
      diff,
      parents: ["parent123"],
    },
  },
];
describe("commit reads through actual REST, GraphQL, and MCP adapters", () => {
  it.each(cases)("preserves results and arguments: $path", async (row) => {
    const f = await fixture();
    try {
      const response = await f.rest(row.path);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(row.expected);
      expect(await f.mcp(row.path)).toEqual(row.expected);
      const result = await f.gql(
        `${row.field}(ledgerId: "alice/main"${row.args}) { ${row.selection} }`,
      );
      expect(result.errors).toBeUndefined();
      expect(result.data?.[row.field]).toEqual(row.expected);
      const custom = row.path.includes("feature");
      if (row.field === "getLatestLedgerCommit") {
        expect(f.latest).toHaveBeenCalledTimes(3);
        for (const call of f.latest.mock.calls)
          expect(call).toEqual([
            "alice",
            "main",
            { sha: custom ? "feature/café" : "main", limit: 1 },
          ]);
      }
      if (row.field === "listCommits") {
        expect(f.history).toHaveBeenCalledTimes(3);
        for (const call of f.history.mock.calls)
          expect(call).toEqual([
            "alice",
            "main",
            {
              sha: custom ? "feature/café" : "main",
              page: custom ? 2 : 1,
              limit: custom ? 7 : 30,
            },
            { format: "json" },
          ]);
      }
    } finally {
      await f.close();
    }
  });
  it("preserves an empty repository as JSON null and an empty history", async () => {
    const f = await fixture();
    f.latest.mockResolvedValue({ data: { success: true, data: [] } });
    f.history.mockResolvedValue({ data: [] });
    try {
      for (const row of [cases[0], cases[2]]) {
        const expected = row.field === "listCommits" ? [] : null;
        const response = await f.rest(row.path);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expected);
        expect(await f.mcp(row.path)).toEqual(expected);
        const result = await f.gql(
          `${row.field}(ledgerId: "alice/main") { ${row.selection} }`,
        );
        expect(result.errors).toBeUndefined();
        expect(result.data?.[row.field]).toEqual(expected);
      }
    } finally {
      await f.close();
    }
  });
  it("maps a missing revision to NOT_FOUND across REST, GraphQL, and MCP", async () => {
    const f = await fixture();
    f.history.mockResolvedValue({ data: [] });
    const sha = "0000000000000000000000000000000000000000";
    try {
      const response = await f.rest(`commit-details?sha=${sha}`);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
      await expect(f.mcp(`commit-details?sha=${sha}`)).rejects.toThrow();
      const result = await f.gql(
        `getCommitDetails(ledgerId: "alice/main", sha: "${sha}") { sha }`,
      );
      expect(result.data?.getCommitDetails).toBeNull();
      expect(result.errors?.[0]?.extensions?.code).toBe("NOT_FOUND");
    } finally {
      await f.close();
    }
  });
});
