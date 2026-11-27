import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { FavaApiError } from "@/foundation/fava";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/014. A directory that does not exist listed as `[]` on every surface —
 * the same answer as an empty one, which Git cannot even store below the
 * root — so a misspelled `Imports` read as empty.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const entry = (path: string, type: "file" | "dir") => ({
  name: path.split("/").at(-1)!,
  path,
  type,
  sha: `sha-${path}`,
  size: path.length,
  // One entry has no last commit, which every surface reports as null.
  last_commit_sha: path === "imports" ? undefined : `commit-${path}`,
});
// The ledger service's answers: a listing per existing directory, `[]` for a
// missing one, and 404 when the path names a file.
const TREE: Record<string, ReturnType<typeof entry>[]> = {
  "": [entry("imports", "dir"), entry("main.bean", "file")],
  imports: [entry("imports/2026.bean", "file")],
};
let schemaPromise: ReturnType<typeof buildSchema> | undefined;
let resolver: LedgerQueryResolver;

async function fixture() {
  const getLedgerDirContent = jest.fn(
    async (_o: string, _n: string, query: { dir_path?: string }) => {
      const path = query.dir_path ?? "";
      if (path === "main.bean")
        throw new FavaApiError(
          "main.bean is a file, expected a directory",
          404,
        );
      return { data: { success: true, data: TREE[path] ?? [] } };
    },
  );
  const factory = {
    getPublicApiClient: async () => ({ ledgers: { getLedgerDirContent } }),
  };
  const authorization = new AuthorizationService(
    { check: async () => true },
    jest.fn(),
  );
  const ledgerRepo = new LedgerRepoService(factory as never, authorization);
  const workflow = new LedgerWorkflow(
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  resolver = new LedgerQueryResolver(workflow);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const services = { ledgerRepo };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { identity: pinnedReadToken, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "dir-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    /** Each surface's names, or its error code. */
    list: async (dir?: string) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/files${dir === undefined ? "" : `?dir=${encodeURIComponent(dir)}`}`,
      );
      const restBody = (await response.json()) as
        | Array<{ path: string }>
        | { error: { code: string; message: string } };
      const tool = await client.callTool({
        name: "listLedgerFiles",
        arguments: dir === undefined ? {} : { dir_path: dir },
      });
      const gql = await graphql({
        schema,
        source: `query($dir: String) { getLedgerDirContent(ledgerId: "alice/main", dirPath: $dir) { path } }`,
        variableValues: { dir },
        contextValue: { identity: pinnedReadToken },
      });
      const gqlError = gql.errors?.[0];
      return {
        rest: Array.isArray(restBody)
          ? restBody.map(({ path }) => path)
          : restBody.error,
        mcp: tool.isError
          ? (tool.structuredContent as { error: { code: string } }).error
          : (
              tool.structuredContent as { result: Array<{ path: string }> }
            ).result.map(({ path }) => path),
        gql: gqlError
          ? formatError(gqlError.toJSON(), gqlError).extensions
          : (gql.data?.getLedgerDirContent as Array<{ path: string }>).map(
              ({ path }) => path,
            ),
      };
    },
    /** Each surface's full entries, for the field-level comparison. */
    fields: async () => {
      const restBody = (await (
        await fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files`)
      ).json()) as Array<Record<string, unknown>>;
      const tool = await client.callTool({
        name: "listLedgerFiles",
        arguments: {},
      });
      const gql = await graphql({
        schema,
        source: `{ getLedgerDirContent(ledgerId: "alice/main") { path name type size sha lastCommitSha } }`,
        contextValue: { identity: pinnedReadToken },
      });
      return {
        rest: restBody,
        mcp: (
          tool.structuredContent as { result: Array<Record<string, unknown>> }
        ).result,
        gql: gql.data?.getLedgerDirContent as Array<Record<string, unknown>>,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("directory listing on REST, MCP and GraphQL", () => {
  it("lists the root and an existing directory", async () => {
    const f = await fixture();
    try {
      const root = await f.list();
      expect(root.rest).toEqual(["imports", "main.bean"]);
      expect(root.mcp).toEqual(root.rest);
      expect(root.gql).toEqual(root.rest);
      const imports = await f.list("imports");
      expect(imports.rest).toEqual(["imports/2026.bean"]);
      expect(imports.mcp).toEqual(imports.rest);
      expect(imports.gql).toEqual(imports.rest);
    } finally {
      await f.close();
    }
  });

  // w21/200: REST and MCP dropped size, sha and lastCommitSha, which GraphQL
  // returned, so a client could not do a sha-guarded delete from a listing.
  it("returns the same fields for the same directory on every surface", async () => {
    const f = await fixture();
    try {
      const { rest, mcp, gql } = await f.fields();
      expect(rest).toEqual([
        {
          path: "imports",
          name: "imports",
          type: "dir",
          size: 7,
          sha: "sha-imports",
          lastCommitSha: null,
        },
        {
          path: "main.bean",
          name: "main.bean",
          type: "file",
          size: 9,
          sha: "sha-main.bean",
          lastCommitSha: "commit-main.bean",
        },
      ]);
      expect(mcp).toEqual(rest);
      // GraphQL's enum value for `type` is the same word, and its nullable
      // fields are null when the listing does not know them.
      expect(JSON.parse(JSON.stringify(gql))).toEqual(rest);
    } finally {
      await f.close();
    }
  });

  it.each([
    ["a directory that does not exist", "Imports", "case-sensitive"],
    ["a file", "main.bean", "readLedgerFiles"],
  ])("answers %s with NOT_FOUND naming it", async (_case, dir, hint) => {
    const f = await fixture();
    try {
      const { rest, mcp, gql } = await f.list(dir);
      const named = expect.stringContaining(`'${dir}'`);
      const hinted = expect.stringContaining(hint);
      // REST carries the hint in its error metadata; MCP and GraphQL beside
      // the code.
      expect(rest).toMatchObject({
        code: "NOT_FOUND",
        message: named,
        metadata: { hint: hinted },
      });
      expect(mcp).toMatchObject({
        code: "NOT_FOUND",
        message: named,
        hint: hinted,
      });
      expect(gql).toMatchObject({ code: "NOT_FOUND", hint: hinted });
    } finally {
      await f.close();
    }
  });

  // w23/027: Gitea refuses any `.git` component, and the ledger service's
  // listing rethrew that as an outage, so every retry read SERVICE_UNAVAILABLE.
  it.each([".git", ".Git", "sub/.git", ".git/objects"])(
    "refuses %p as bad input on every surface",
    async (dir) => {
      const f = await fixture();
      try {
        const { rest, mcp, gql } = await f.list(dir);
        const refused = {
          code: "BAD_USER_INPUT",
          message: expect.stringContaining("inside .git"),
        };
        expect(rest).toMatchObject(refused);
        expect(mcp).toMatchObject(refused);
        expect(gql).toMatchObject({ code: "BAD_USER_INPUT" });
      } finally {
        await f.close();
      }
    },
  );

  it.each([".github", ".gitx"])(
    "still lists %p, whose name only starts with .git",
    async (dir) => {
      const f = await fixture();
      try {
        const { rest, mcp, gql } = await f.list(dir);
        expect(rest).toMatchObject({ code: "NOT_FOUND" });
        expect(mcp).toMatchObject({ code: "NOT_FOUND" });
        expect(gql).toMatchObject({ code: "NOT_FOUND" });
      } finally {
        await f.close();
      }
    },
  );

  // w31/064: MCP listLedgerFiles normalizes shell-style current-directory
  // spellings and leading `./` prefixes; REST and GraphQL stay strict behind
  // assertSafeRepoPath.
  describe("MCP shell-style dir_path normalization", () => {
    it.each([".", "./", "./.", "././", "././."])(
      "lists the repository root on MCP for %p while REST and GraphQL refuse it",
      async (dir) => {
        const f = await fixture();
        try {
          const { rest, mcp, gql } = await f.list(dir);
          expect(mcp).toEqual(["imports", "main.bean"]);
          expect(rest).toMatchObject({ code: "BAD_USER_INPUT" });
          expect(gql).toMatchObject({ code: "BAD_USER_INPUT" });
        } finally {
          await f.close();
        }
      },
    );

    it("lists a ./-prefixed subdirectory on MCP while REST and GraphQL refuse it", async () => {
      const f = await fixture();
      try {
        const { rest, mcp, gql } = await f.list("./imports");
        expect(mcp).toEqual(["imports/2026.bean"]);
        expect(rest).toMatchObject({ code: "BAD_USER_INPUT" });
        expect(gql).toMatchObject({ code: "BAD_USER_INPUT" });
      } finally {
        await f.close();
      }
    });

    // w31/137: `ls -F` prints a folder as `imports/`. REST and GraphQL stay
    // strict, but their refusal now quotes the value and names the rule.
    it.each(["imports/", "./imports/"])(
      "lists %p on MCP as its folder while REST and GraphQL refuse it naming the rule",
      async (dir) => {
        const f = await fixture();
        try {
          const { rest, mcp, gql } = await f.list(dir);
          expect(mcp).toEqual(["imports/2026.bean"]);
          const refused = {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(
              `File path ${JSON.stringify(dir)} `,
            ),
          };
          expect(rest).toMatchObject({
            ...refused,
            metadata: { field: "dirPath" },
          });
          expect(gql).toMatchObject({
            code: "BAD_USER_INPUT",
            field: "dirPath",
          });
        } finally {
          await f.close();
        }
      },
    );

    it("refuses a missing folder with a trailing '/' as NOT_FOUND on MCP, like the folder without it", async () => {
      const f = await fixture();
      try {
        const { mcp } = await f.list("Imports/");
        expect(mcp).toMatchObject({
          code: "NOT_FOUND",
          message: expect.stringContaining("'Imports'"),
        });
      } finally {
        await f.close();
      }
    });

    it.each(["", "/", ".//", "..", "../", "./..", ".\\", "imports//"])(
      "still refuses %p with BAD_USER_INPUT on MCP, REST and GraphQL",
      async (dir) => {
        const f = await fixture();
        try {
          const { rest, mcp, gql } = await f.list(dir);
          expect(mcp).toMatchObject({ code: "BAD_USER_INPUT" });
          expect(rest).toMatchObject({ code: "BAD_USER_INPUT" });
          expect(gql).toMatchObject({ code: "BAD_USER_INPUT" });
        } finally {
          await f.close();
        }
      },
    );
  });
});
