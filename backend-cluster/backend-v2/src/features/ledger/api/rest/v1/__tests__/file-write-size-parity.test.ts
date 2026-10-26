import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
const resolveIdentityMock = jest.fn();
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));
import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { ApolloServer } from "@apollo/server";
import { koaMiddleware } from "@as-integrations/koa";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildSchema } from "type-graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { LedgerQueryResolver } from "../../../resolvers/ledger-resolver.query";
import { FILE_ROUTES } from "../files-handler";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { setMcpRoute } from "@/features/ai-agent/api/mcp-route";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { restOpId } from "@/server/api/op-class";
import { normalizeRestPath, opMethodsForLayer } from "@/server/api/rest-op-id";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { bodyParserMiddleware } from "@/server/middleware/body-parser-middleware";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { restScopeMiddleware } from "@/server/rest/scope-middleware";
import { registerV1Routes } from "@/server/rest/v1-route";
import type { ApiGate } from "@/server/api/composition-root";
import type { Identity } from "@/server/api/identity";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

const LIMIT = 1_048_576;
const config = {
  api: { scopeEnforcement: "enforce" },
  oauth: { issuer: "https://beancount.io" },
} as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
type Surface = "rest" | "gql" | "mcp";
type File = { content: string; sha: string };
type Outcome = {
  ok: boolean;
  status?: number;
  code?: string;
  data?: Record<string, unknown>;
};
let mutationResolver: LedgerMutationResolver;
let queryResolver: LedgerQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, LedgerQueryResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver ? mutationResolver : queryResolver,
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

/**
 * All requests cross the shipped HTTP parser and their real adapters. Only
 * credential resolution and external repository/relationship data are local:
 * writes decode the real Fava payload and change an isolated repository map.
 */
async function fixture(initial: Record<string, string> = {}) {
  let caller = identity;
  const files = new Map<string, File>(
    Object.entries(initial).map(([path, content]) => [
      path,
      { content, sha: `initial-${path}` },
    ]),
  );
  const state = { writable: true, clients: 0, reads: 0, projected: 0 };
  const commits: { message?: string; paths: string[] }[] = [];
  const projectedFiles = new Map<string, string | null>();
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const toPublic = (path: string) => {
    const file = files.get(path);
    return file
      ? {
          name: path.split("/").pop(),
          path,
          type: "file",
          sha: file.sha,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
          size: Buffer.byteLength(file.content),
        }
      : null;
  };
  const write = (path: string, content: string, sha?: string) => {
    const previous = files.get(path);
    if (sha ? previous?.sha !== sha : previous !== undefined) {
      throw new Error("Fixture repository conflict");
    }
    files.set(path, {
      content: Buffer.from(content, "base64").toString("utf8"),
      sha: `written-${commits.length}-${path}`,
    });
  };
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.writable ? "write" : "read" }),
        },
      },
    }),
    getPublicApiClient: async () => {
      state.clients++;
      return {
        ledgers: {
          // The portable-name check lists the folder first (w21/770).
          getLedgerDirContent: async () => envelope([]),
          createLedgerFile: async (
            _owner: string,
            _name: string,
            options: { path: string; content: string; message?: string },
          ) => {
            write(options.path, options.content);
            commits.push({ message: options.message, paths: [options.path] });
            return envelope(toPublic(options.path));
          },
          updateLedgerFile: async (
            _owner: string,
            _name: string,
            options: {
              path: string;
              content: string;
              sha: string;
              message?: string;
            },
          ) => {
            write(options.path, options.content, options.sha);
            commits.push({ message: options.message, paths: [options.path] });
            return envelope(toPublic(options.path));
          },
          changeLedgerFiles: async (
            _owner: string,
            _name: string,
            options: {
              message: string;
              files: {
                operation: string;
                path: string;
                content: string;
                sha?: string;
              }[];
            },
          ) => {
            for (const operation of options.files) {
              write(operation.path, operation.content, operation.sha);
            }
            commits.push({
              message: options.message,
              paths: options.files.map((file) => file.path),
            });
            return envelope({});
          },
          getLedgerFile: async (
            _owner: string,
            _name: string,
            query: { path: string },
          ) => {
            state.reads++;
            return envelope(toPublic(query.path));
          },
          getLedgerFilesContent: async (
            _owner: string,
            _name: string,
            body: { files: string[] },
          ) => {
            state.reads++;
            return envelope(body.files.map(toPublic).filter(Boolean));
          },
        },
        reports: {
          checkProjectedErrors: async (
            _owner: string,
            _name: string,
            body: { files: { path: string; content: string | null }[] },
          ) => {
            state.projected++;
            for (const file of body.files) {
              projectedFiles.set(
                file.path,
                file.content === null
                  ? null
                  : Buffer.from(file.content, "base64").toString("utf8"),
              );
            }
            return envelope([]);
          },
        },
      };
    },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      {
        user: {
          getUserByUsername: async () => ({ id: "usr_owner" }),
          getById: async () => ({
            id: caller.userId,
            ledger_username: "alice",
          }),
        },
      } as never,
      {} as never,
      fava as never,
    ),
  );
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  const ledgerRepo = new LedgerRepoService(fava as never, authorization);
  const layers = {
    database: {},
    services: { ledgerRepo, ledgerData: { getErrors: async () => [] } },
    workflows: { ledger: workflow },
  } as unknown as AppLayers;
  mutationResolver = new LedgerMutationResolver(workflow);
  queryResolver = new LedgerQueryResolver(workflow);
  resolveIdentityMock.mockImplementation(async () => caller);
  const apollo = new ApolloServer({ schema, formatError });
  await apollo.start();
  const rest = new Router();
  const gates = new Map<string, ApiGate>();
  rest.use(restErrorMiddleware());
  rest.use(async (ctx, next) => {
    ctx.state.identity = caller;
    await next();
  });
  rest.use(restScopeMiddleware(config, gates));
  const before = rest.stack.length;
  registerV1Routes(rest, { layers, config }, FILE_ROUTES);
  for (const layer of rest.stack.slice(before)) {
    for (const method of opMethodsForLayer(layer.methods)) {
      gates.set(restOpId(method, normalizeRestPath(layer.path)), "enforced");
    }
  }
  const mcp = new Router();
  setMcpRoute(mcp, layers, config, (context) =>
    assembleMcpRegistry(context, config),
  );
  const gql = new Router();
  gql.post(
    "/api-gateway/graphql",
    koaMiddleware(apollo, {
      context: async () => ({
        identity: caller,
        getCurrentIdentity: () => caller,
        platform: "web",
      }),
    }),
  );
  const app = new Koa();
  app.silent = true;
  app.use(bodyParserMiddleware());
  app.use(gql.routes()).use(mcp.routes()).use(rest.routes());
  const server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const client = new Client({ name: "file-size-parity", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${url}/api-gateway/mcp`)),
  );
  const request = async (path: string, body?: unknown, method = "POST") => {
    const response = await fetch(`${url}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    return { status: response.status, data };
  };
  const mcpEdit = async (
    operations: Record<string, unknown>[],
    dryRun = false,
    messageKey: string | "both" = "description",
  ): Promise<Outcome> => {
    // One MCP tool per kind of change (ADR 019, 2026-10-18): every batch
    // here is a single kind, so the first operation names the tool.
    const kind = String(operations[0]?.operation);
    const texts =
      messageKey === "both"
        ? { description: "Size contract edit", message: "A different text" }
        : { [messageKey]: "Size contract edit" };
    const result = await client.callTool({
      name:
        kind === "create"
          ? "createLedgerFiles"
          : kind === "delete"
            ? "deleteLedgerFiles"
            : "updateLedgerFiles",
      arguments: {
        ledger: "alice/main",
        ...texts,
        files: operations.map(({ operation: _operation, ...file }) => file),
        dry_run: dryRun,
      },
    });
    const data = result.structuredContent as {
      result?: Record<string, unknown>;
      error?: { code: string };
    };
    return { ok: !result.isError, code: data?.error?.code, data: data?.result };
  };
  return {
    files,
    commits,
    state,
    projectedFiles,
    mcpEdit,
    setCaller: (next: Identity) => {
      caller = next;
    },
    write: async (
      surface: Surface,
      content: string,
      update = false,
      wrapBase64 = false,
      messageKey: string | "both" = surface === "mcp"
        ? "description"
        : "message",
    ): Promise<Outcome> => {
      const path = update ? "existing.bean" : "new.bean";
      const sha = update ? files.get(path)?.sha : undefined;
      if (surface === "mcp")
        return mcpEdit(
          [{ operation: update ? "replace" : "create", path, content }],
          false,
          messageKey,
        );
      const texts =
        messageKey === "both"
          ? ',message:"Size contract edit",description:"A different text"'
          : `,${messageKey}:"Size contract edit"`;
      if (surface === "rest") {
        const result = await request(
          `/api-gateway/v1/ledgers/alice/main/files/${path}`,
          {
            content,
            sha,
            ...(messageKey === "both"
              ? {
                  message: "Size contract edit",
                  description: "A different text",
                }
              : { [messageKey]: "Size contract edit" }),
          },
          "PUT",
        );
        return {
          ok: result.status === 200,
          status: result.status,
          code: result.data.error?.code,
          data: result.data,
        };
      }
      const field = update ? "updateLedgerFile" : "createLedgerFile";
      const encoded = Buffer.from(content).toString("base64");
      const result = await request("/api-gateway/graphql", {
        query: `mutation($path:String!,$content:String!${update ? ",$sha:String!" : ""}) { ${field}(ledgerId:"alice/main",path:$path,content:$content${update ? ",sha:$sha" : ""}${texts}) { path content encoding size sha } }`,
        variables: {
          path,
          content: wrapBase64
            ? encoded.match(/.{1,76}/g)!.join("\r\n")
            : encoded,
          ...(update ? { sha } : {}),
        },
      });
      return {
        ok: result.status === 200 && !result.data.errors,
        status: result.status,
        code: result.data.errors?.[0]?.extensions?.code,
        data: result.data.data?.[field],
      };
    },
    read: async (surface: Surface): Promise<string | undefined> => {
      if (surface === "rest") {
        const result = await request(
          "/api-gateway/v1/ledgers/alice/main/files/existing.bean",
          undefined,
          "GET",
        );
        expect(result.status).toBe(200);
        return result.data.content;
      }
      if (surface === "gql") {
        const result = await request("/api-gateway/graphql", {
          query:
            '{ getLedgerFile(ledgerId:"alice/main",path:"existing.bean") { content encoding } }',
        });
        expect(result.data.errors).toBeUndefined();
        const file = result.data.data.getLedgerFile;
        return file.encoding === "base64"
          ? Buffer.from(file.content, "base64").toString("utf8")
          : file.content;
      }
      const result = await client.callTool({
        name: "readLedgerFiles",
        arguments: { ledger: "alice/main", files: [{ path: "existing.bean" }] },
      });
      expect(result.isError).not.toBe(true);
      const data = result.structuredContent as {
        result: { content: string }[];
      };
      return data.result[0]?.content;
    },
    close: async () => {
      await client.close();
      await apollo.stop();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

describe.each<Surface>(["rest", "gql", "mcp"])(
  "explicit file size via %s",
  (surface) => {
    it("accepts a file at the decoded byte limit through its HTTP envelope", async () => {
      const f = await fixture();
      const content = "é".repeat(LIMIT / 2);
      try {
        const result = await f.write(surface, content);
        expect(result).toMatchObject({ ok: true });
        expect(f.files.get("new.bean")?.content === content).toBe(true);
        expect(f.commits).toEqual([
          { message: "Size contract edit", paths: ["new.bean"] },
        ]);
        if (surface === "gql") {
          expect(result.data).toMatchObject({
            path: "new.bean",
            size: LIMIT,
            encoding: "base64",
          });
          expect(
            Buffer.from(result.data!.content as string, "base64").toString(
              "utf8",
            ) === content,
          ).toBe(true);
        } else if (surface === "mcp") {
          expect(result.data).toMatchObject({
            dry_run: false,
            count: 1,
            wrote: [{ path: "new.bean" }],
            validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
          });
        } else {
          expect(result.data).toEqual({ ok: true, path: "new.bean" });
        }
      } finally {
        await f.close();
      }
    });

    it("rejects one extra UTF-8 byte before repository work", async () => {
      const f = await fixture();
      try {
        const result = await f.write(surface, "é".repeat(LIMIT / 2) + "x");
        expect(result).toMatchObject({ ok: false, code: "BAD_USER_INPUT" });
        if (surface === "rest") expect(result.status).toBe(400);
        expect(f.files.size).toBe(0);
        expect(f.commits).toHaveLength(0);
        expect(f.state.clients).toBe(0);
      } finally {
        await f.close();
      }
    });

    it("updates an existing file at the limit with its current SHA and original message", async () => {
      const f = await fixture({ "existing.bean": "; previous\n" });
      const content = "x".repeat(LIMIT);
      try {
        expect(await f.write(surface, content, true)).toMatchObject({
          ok: true,
        });
        expect(f.files.get("existing.bean")?.content === content).toBe(true);
        expect(f.commits).toEqual([
          { message: "Size contract edit", paths: ["existing.bean"] },
        ]);
      } finally {
        await f.close();
      }
    });

    it("rejects an oversized replacement without changing the existing file", async () => {
      const original = "; previous\n";
      const f = await fixture({ "existing.bean": original });
      try {
        expect(
          await f.write(surface, "x".repeat(LIMIT + 1), true),
        ).toMatchObject({ ok: false, code: "BAD_USER_INPUT" });
        expect(f.files.get("existing.bean")).toEqual({
          content: original,
          sha: "initial-existing.bean",
        });
        expect(f.commits).toHaveLength(0);
        // MCP must read the source/SHA before constructing a replacement.
        expect(f.state.clients).toBe(surface === "mcp" ? 1 : 0);
        expect(f.state.projected).toBe(0);
      } finally {
        await f.close();
      }
    });

    it.each(["scope", "pin", "relationship"])(
      "retains %s denial ahead of the size check",
      async (denial) => {
        const f = await fixture();
        if (denial === "scope")
          f.setCaller({ ...identity, scopes: new Set(["ledger.read"]) });
        if (denial === "pin")
          f.setCaller({ ...identity, ledgerScope: "alice/other" });
        if (denial === "relationship") f.state.writable = false;
        try {
          expect(await f.write(surface, "x".repeat(LIMIT + 1))).toMatchObject({
            ok: false,
            code: "FORBIDDEN",
          });
          expect(f.state.clients).toBe(0);
          expect(f.commits).toHaveLength(0);
          expect(f.files.size).toBe(0);
        } finally {
          await f.close();
        }
      },
    );

    it("continues reading existing content larger than the upload cap", async () => {
      const content = "; existing large file\n" + "é".repeat(LIMIT);
      const f = await fixture({ "existing.bean": content });
      try {
        expect((await f.read(surface)) === content).toBe(true);
        expect(f.commits).toHaveLength(0);
      } finally {
        await f.close();
      }
    });
  },
);

// w23/m3/t002: the commit message travels as `description` on MCP and
// `message` on REST/GraphQL; every surface accepts both spellings, and two
// different texts refuse before repository work.
describe.each<Surface>(["rest", "gql", "mcp"])(
  "commit message spelling via %s",
  (surface) => {
    const alias = surface === "mcp" ? "message" : "description";
    it(`accepts the ${alias} spelling`, async () => {
      const f = await fixture();
      try {
        expect(
          await f.write(surface, "; aliased\n", false, false, alias),
        ).toMatchObject({ ok: true });
        expect(f.commits).toEqual([
          { message: "Size contract edit", paths: ["new.bean"] },
        ]);
      } finally {
        await f.close();
      }
    });

    it("refuses two different texts before repository work", async () => {
      const f = await fixture();
      try {
        const result = await f.write(
          surface,
          "; conflict\n",
          false,
          false,
          "both",
        );
        expect(result.ok).toBe(false);
        expect(f.files.size).toBe(0);
        expect(f.commits).toHaveLength(0);
      } finally {
        await f.close();
      }
    });
  },
);

it("counts decoded bytes for whitespace-wrapped GraphQL base64 at the limit", async () => {
  const f = await fixture();
  const content = "x".repeat(LIMIT);
  try {
    expect(await f.write("gql", content, false, true)).toMatchObject({
      ok: true,
    });
    expect(f.files.get("new.bean")?.content === content).toBe(true);
    expect(f.commits).toHaveLength(1);
  } finally {
    await f.close();
  }
});

describe.each([false, true])(
  "MCP transformed file with dry_run=%s",
  (dryRun) => {
    // A small patch changes a large existing file; the limit applies to the
    // complete result, not to old_string/new_string or the request envelope.
    const original =
      ("x".repeat(4095) + "\n").repeat(255) + "x".repeat(4087) + "\nold-one\n";

    it("accepts a str_replace result at the limit and reports the actual write or preview", async () => {
      const f = await fixture({ "existing.bean": original });
      const expected = original.replace("old-one", "new-one");
      try {
        const result = await f.mcpEdit(
          [
            {
              operation: "update",
              path: "existing.bean",
              old_string: "old-one",
              new_string: "new-one",
            },
          ],
          dryRun,
        );
        expect(result).toMatchObject({
          ok: true,
          data: {
            dry_run: dryRun,
            count: 1,
            operations: [{ operation: "update", path: "existing.bean" }],
            wrote: dryRun ? [] : [{ path: "existing.bean" }],
            validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
          },
        });
        expect(
          f.files.get("existing.bean")?.content ===
            (dryRun ? original : expected),
        ).toBe(true);
        expect(f.commits).toHaveLength(dryRun ? 0 : 1);
        expect(f.state.projected).toBe(dryRun ? 1 : 0);
        if (dryRun) {
          expect(f.projectedFiles.get("existing.bean") === expected).toBe(true);
          expect(result.data!.diff).toEqual([
            {
              path: "existing.bean",
              diff: expect.stringContaining("-old-one\n+new-one\n"),
            },
          ]);
        }
      } finally {
        await f.close();
      }
    });

    it("refuses a str_replace result one byte over the limit before commit or projection", async () => {
      const f = await fixture({ "existing.bean": original });
      try {
        expect(
          await f.mcpEdit(
            [
              {
                operation: "update",
                path: "existing.bean",
                old_string: "old-one",
                new_string: "new-ones",
              },
            ],
            dryRun,
          ),
        ).toMatchObject({ ok: false, code: "BAD_USER_INPUT" });
        expect(f.files.get("existing.bean")?.content === original).toBe(true);
        expect(f.commits).toHaveLength(0);
        expect(f.state.reads).toBe(1);
        expect(f.state.clients).toBe(1);
        expect(f.state.projected).toBe(0);
      } finally {
        await f.close();
      }
    });

    it("refuses an oversized create before an earlier valid batch member can commit", async () => {
      const f = await fixture();
      try {
        expect(
          await f.mcpEdit(
            [
              { operation: "create", path: "small.bean", content: "; small\n" },
              {
                operation: "create",
                path: "large.bean",
                content: "x".repeat(LIMIT + 1),
              },
            ],
            dryRun,
          ),
        ).toMatchObject({ ok: false, code: "BAD_USER_INPUT" });
        expect(f.files.size).toBe(0);
        expect(f.commits).toHaveLength(0);
        expect(f.state.clients).toBe(0);
        expect(f.state.projected).toBe(0);
      } finally {
        await f.close();
      }
    });
  },
);

it("allows MCP to shrink an already oversized file to the exact byte limit", async () => {
  const original = "x".repeat(LIMIT) + "!";
  const f = await fixture({ "existing.bean": original });
  try {
    expect(
      await f.mcpEdit([
        {
          operation: "update",
          path: "existing.bean",
          old_string: "!",
          new_string: "",
        },
      ]),
    ).toMatchObject({ ok: true });
    expect(f.files.get("existing.bean")?.content === "x".repeat(LIMIT)).toBe(
      true,
    );
    expect(f.commits).toHaveLength(1);
  } finally {
    await f.close();
  }
});

/**
 * w23/081. An amount past the engine's 28 digits reads back rounded with no
 * check failing, so every file-write surface refuses it in the new text —
 * while 28-digit and ordinary amounts still commit.
 */
describe.each<Surface>(["rest", "gql", "mcp"])(
  "amounts past 28 digits via %s",
  (surface) => {
    const LONG_TXN = [
      '2021-01-02 * "raw"',
      "  Assets:Cash  999999999999999999999999999.99 USD",
      "  Equity:Initial",
      "",
    ].join("\n");
    const FINE_TXN = [
      '2021-01-02 * "ok"',
      "  Assets:Cash  99999999999999999999999999.99 USD",
      "  Equity:Initial",
      "",
    ].join("\n");

    it("refuses a create holding one, committing nothing", async () => {
      const f = await fixture();
      try {
        expect(await f.write(surface, LONG_TXN)).toMatchObject({
          ok: false,
          code: "BAD_USER_INPUT",
        });
        expect(f.state.clients).toBe(0);
        expect(f.files.size).toBe(0);
        expect(f.commits).toHaveLength(0);
      } finally {
        await f.close();
      }
    });

    it("refuses a replacement holding one, leaving the file", async () => {
      const original = "; previous\n";
      const f = await fixture({ "existing.bean": original });
      try {
        expect(await f.write(surface, LONG_TXN, true)).toMatchObject({
          ok: false,
          code: "BAD_USER_INPUT",
        });
        expect(f.files.get("existing.bean")).toEqual({
          content: original,
          sha: "initial-existing.bean",
        });
        expect(f.commits).toHaveLength(0);
      } finally {
        await f.close();
      }
    });

    it("still creates a file with 28-digit and ordinary amounts", async () => {
      const f = await fixture();
      try {
        expect(await f.write(surface, FINE_TXN)).toMatchObject({ ok: true });
        expect(f.files.get("new.bean")?.content === FINE_TXN).toBe(true);
        expect(f.commits).toHaveLength(1);
      } finally {
        await f.close();
      }
    });
  },
);
