import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerRepoQueryResolver } from "@/features/ledger/api/resolvers/ledger-repo-resolver.query";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { CommitsResolver } from "@/features/gitea/commits/api/commits-resolver";
import { CommitsService } from "@/features/gitea/commits/service/commits-service";
import { FavaApiError } from "@/foundation/fava/api-client";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
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
const detailFields = `sha message author { ${authorFields} } committer { ${authorFields} } files { filename additions deletions status previousFilename } stats { additions deletions total } diff parents`;
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
      files: [
        {
          filename: "main.bean",
          additions: 1,
          deletions: 1,
          status: "modified",
          previousFilename: null,
        },
      ],
      stats: commit.stats,
      diff,
      parents: ["parent123"],
    },
  },
];
// Only a commit's own fields are read, so Gitea is not asked for its stats,
// verification or file lists (w21/314).
const SPEED_FLAGS = { stat: false, verification: false, files: false };

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
            {
              sha: custom ? "feature/café" : "main",
              limit: 1,
              ...SPEED_FLAGS,
            },
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
              ...SPEED_FLAGS,
            },
            { format: "json" },
          ]);
      }
    } finally {
      await f.close();
    }
  });
  it("reports a rename as one renamed file on every surface (w21/132)", async () => {
    const f = await fixture();
    f.history.mockResolvedValue({
      data: [
        {
          ...commit,
          files: [
            { filename: "old.bean", status: "removed" },
            { filename: "new.bean", status: "added" },
          ],
        },
      ],
    });
    f.download.mockResolvedValue({
      data: "diff --git a/old.bean b/new.bean\nsimilarity index 100%\nrename from old.bean\nrename to new.bean\n",
    });
    const files = [
      {
        filename: "new.bean",
        additions: 0,
        deletions: 0,
        status: "renamed",
        previousFilename: "old.bean",
      },
    ];
    try {
      const path = `commit-details?sha=${commit.sha}`;
      const response = await f.rest(path);
      expect((await response.json()).files).toEqual(files);
      expect((await f.mcp(path)).files).toEqual(files);
      const result = await f.gql(
        `getCommitDetails(ledgerId: "alice/main", sha: "${commit.sha}") { files { filename additions deletions status previousFilename } }`,
      );
      expect(result.errors).toBeUndefined();
      expect(result.data?.getCommitDetails).toEqual({ files });
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
  it.each(["limit=-1", "limit=0", "page=0"])(
    "refuses the commits list with %s as bad input across REST, GraphQL, and MCP",
    async (query) => {
      const f = await fixture();
      const [name, value] = query.split("=");
      try {
        const response = await f.rest(`commits?${query}`);
        expect(response.status).toBe(400);
        await expect(f.mcp(`commits?${query}`)).rejects.toMatchObject({
          code: -32602,
          data: { code: "BAD_USER_INPUT" },
        });
        const result = await f.gql(
          `listCommits(ledgerId: "alice/main", ${name}: ${value}) { sha }`,
        );
        const [graphqlError] = result.errors ?? [];
        expect(graphqlError).toBeDefined();
        expect(
          formatError(graphqlError.toJSON(), graphqlError).extensions?.code,
        ).toBe("BAD_USER_INPUT");
        expect(f.history).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  // w31/024: the host answers a ref with a space it cannot find with a 500,
  // which reached callers as INTERNAL_SERVER_ERROR or SERVICE_UNAVAILABLE,
  // telling them to retry when the fix was to drop the space.
  const spacedRefs = ["main ", " b6d69fd", "b6d69fd ", "a b", " "];
  const refReads = [
    { path: "commit-details", param: "sha", field: "getCommitDetails" },
    { path: "commits", param: "branch", field: "listCommits" },
    {
      path: "latest-commit",
      param: "branchName",
      field: "getLatestLedgerCommit",
    },
  ];
  it.each(
    refReads.flatMap((read) => spacedRefs.map((ref) => ({ ...read, ref }))),
  )(
    "refuses $field with $param=$ref as BAD_USER_INPUT naming $param across REST, GraphQL, and MCP",
    async ({ path, param, field, ref }) => {
      const f = await fixture();
      f.history.mockRejectedValue(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
      );
      f.latest.mockRejectedValue(
        new FavaApiError("Internal Server Error", 500),
      );
      const query = `${path}?${param}=${encodeURIComponent(ref)}`;
      try {
        const response = await f.rest(query);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringMatching(new RegExp(`^${param} `)),
            metadata: { field: param },
          },
        });
        await expect(f.mcp(query)).rejects.toMatchObject({
          code: -32602,
          message: expect.stringContaining(`${param} must not contain a space`),
          data: { code: "BAD_USER_INPUT" },
        });
        const result = await f.gql(
          `${field}(ledgerId: "alice/main", ${param}: ${JSON.stringify(ref)}) { sha }`,
        );
        const [graphqlError] = result.errors ?? [];
        expect(graphqlError).toBeDefined();
        const formatted = formatError(graphqlError.toJSON(), graphqlError);
        expect(formatted.extensions?.code).toBe("BAD_USER_INPUT");
        expect(formatted.message).toMatch(new RegExp(`^${param} `));
        expect(f.history).not.toHaveBeenCalled();
        expect(f.latest).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each([
    ["main@{1 day ago}", "main@%7B1%20day%20ago%7D"],
    [":/restore fixture", "%3A%2Frestore%20fixture"],
  ])(
    "passes %p, git revision syntax with a space, to the host on every surface",
    async (ref, encoded) => {
      const f = await fixture();
      try {
        const response = await f.rest(`commits?branch=${encoded}`);
        expect(response.status).toBe(200);
        expect(await f.mcp(`commits?branch=${encoded}`)).toEqual([listItem]);
        const result = await f.gql(
          `listCommits(ledgerId: "alice/main", branch: ${JSON.stringify(ref)}) { sha }`,
        );
        expect(result.errors).toBeUndefined();
        expect(f.history).toHaveBeenCalledTimes(3);
        for (const call of f.history.mock.calls)
          expect(call[2]).toMatchObject({ sha: ref });
      } finally {
        await f.close();
      }
    },
  );
  // w31/034: Gitea treats an empty sha query parameter as default-branch HEAD,
  // so commit-details with an empty or whitespace-only sha must fail with
  // BAD_USER_INPUT ("sha is required") on every surface without calling Gitea.
  it.each(["", "\t", "\n"])(
    "refuses commit-details with empty or whitespace-only sha=%j as BAD_USER_INPUT across REST, GraphQL, and MCP",
    async (sha) => {
      const f = await fixture();
      const query = `commit-details?sha=${encodeURIComponent(sha)}`;
      try {
        const response = await f.rest(query);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: "sha is required",
            metadata: {
              field: "sha",
              hint: expect.stringContaining("commits"),
            },
          },
        });
        await expect(f.mcp(query)).rejects.toMatchObject({
          code: -32602,
          data: {
            code: "BAD_USER_INPUT",
            message: "sha is required",
            hint: expect.stringContaining("commits"),
          },
        });
        const result = await f.gql(
          `getCommitDetails(ledgerId: "alice/main", sha: ${JSON.stringify(sha)}) { sha }`,
        );
        expect(result.data).toBeNull();
        const [graphqlError] = result.errors ?? [];
        expect(graphqlError).toBeDefined();
        const formatted = formatError(graphqlError.toJSON(), graphqlError);
        expect(formatted.extensions?.code).toBe("BAD_USER_INPUT");
        expect(formatted.message).toBe("sha is required");
        expect(f.history).not.toHaveBeenCalled();
        expect(f.download).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  // w31/047: Gitea treats an empty sha query parameter as the default branch,
  // and tab/newline-only branch strings bypass assertCommitRef, so explicit
  // empty or whitespace-only branch/branchName values must fail with
  // BAD_USER_INPUT on every surface without calling Gitea.
  const branchReads = [
    { path: "commits", param: "branch", field: "listCommits" },
    {
      path: "latest-commit",
      param: "branchName",
      field: "getLatestLedgerCommit",
    },
  ];
  const blankBranches = ["", "\t", "\n", "\r\n"];
  it.each(
    branchReads.flatMap((read) =>
      blankBranches.map((value) => ({
        ...read,
        value,
        label: JSON.stringify(value),
      })),
    ),
  )(
    "refuses $field with empty or whitespace-only $param=$label as BAD_USER_INPUT across REST, GraphQL, and MCP",
    async ({ path, param, field, value }) => {
      const f = await fixture();
      const query = `${path}?${param}=${encodeURIComponent(value)}`;
      const expectedMessage = `${param} must not be empty`;
      try {
        const response = await f.rest(query);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expectedMessage,
            metadata: {
              field: param,
              hint: expect.stringContaining("main"),
            },
          },
        });
        await expect(f.mcp(query)).rejects.toMatchObject({
          code: -32602,
          data: {
            code: "BAD_USER_INPUT",
            message: expectedMessage,
            hint: expect.stringContaining("main"),
          },
        });
        const result = await f.gql(
          `${field}(ledgerId: "alice/main", ${param}: ${JSON.stringify(value)}) { sha }`,
        );
        const [graphqlError] = result.errors ?? [];
        expect(graphqlError).toBeDefined();
        const formatted = formatError(graphqlError.toJSON(), graphqlError);
        expect(formatted.extensions?.code).toBe("BAD_USER_INPUT");
        expect(formatted.message).toBe(expectedMessage);
        expect(f.history).not.toHaveBeenCalled();
        expect(f.latest).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("maps an unknown branch on the commits list to NOT_FOUND across REST, GraphQL, and MCP", async () => {
    const f = await fixture();
    f.history.mockRejectedValue(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );
    try {
      const response = await f.rest("commits?branch=feature%2Fx");
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      expect(JSON.stringify(body)).not.toContain("[object Response]");
      await expect(f.mcp("commits?branch=feature%2Fx")).rejects.toMatchObject({
        code: -32002,
        data: { code: "NOT_FOUND" },
      });
      const result = await f.gql(
        'listCommits(ledgerId: "alice/main", branch: "feature/x") { sha }',
      );
      const [graphqlError] = result.errors ?? [];
      expect(graphqlError).toBeDefined();
      expect(
        formatError(graphqlError.toJSON(), graphqlError).extensions?.code,
      ).toBe("NOT_FOUND");
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
      // `getCommitDetails` is non-nullable, so a throw nulls `data` itself
      // rather than the field; and raw `graphql()` bypasses Apollo's
      // `formatError`, which is what puts the category in `extensions.code`.
      // Run that formatter here so the NOT_FOUND mapping is proven on the
      // GraphQL surface rather than assumed.
      expect(result.data).toBeNull();
      const [graphqlError] = result.errors ?? [];
      expect(graphqlError).toBeDefined();
      expect(
        formatError(graphqlError.toJSON(), graphqlError).extensions?.code,
      ).toBe("NOT_FOUND");
    } finally {
      await f.close();
    }
  });
});
