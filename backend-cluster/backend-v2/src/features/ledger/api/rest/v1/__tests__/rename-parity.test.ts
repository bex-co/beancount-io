import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
let resolver: LedgerMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

type FixtureFiles = Map<string, { content: string; sha: string }>;

async function fixture(
  caller = identity,
  initial: Record<string, string> = {
    "old.bean": "; Café\n",
    "occupied.bean": "; existing\n",
  },
  errorBatches: { message: string; source?: { filename: string; lineno: number } }[][] = [
    [],
    [],
  ],
) {
  const errorCalls = { count: 0 };
  const files: FixtureFiles = new Map(
    Object.entries(initial).map(([path, content], index) => [
      path,
      { content, sha: `sha-${index}-${path}` },
    ]),
  );
  const state = { writable: true };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const toPublic = (path: string) => {
    const entry = files.get(path);
    if (!entry) return null;
    return {
      name: path.split("/").pop(),
      path,
      type: "file",
      sha: entry.sha,
      size: entry.content.length,
      content: entry.content,
      encoding: null,
    };
  };
  const change = jest.fn(async (_owner, _name, options) => {
    for (const op of options.files) {
      if (op.operation === "create" && files.has(op.path)) {
        throw new Error("Fixture repository conflict");
      }
      if ((op.operation === "update" || op.operation === "delete") && !files.has(op.path)) {
        throw new Error("Fixture missing file");
      }
    }
    for (const op of options.files) {
      if (op.operation === "create") {
        const content = op.content
          ? Buffer.from(op.content.replace(/\s/g, ""), "base64").toString("utf-8")
          : "";
        files.set(op.path, { content, sha: `sha-new-${op.path}` });
      } else if (op.operation === "update") {
        const content = op.content
          ? Buffer.from(op.content.replace(/\s/g, ""), "base64").toString("utf-8")
          : "";
        files.set(op.path, { content, sha: `sha-upd-${op.path}` });
      } else if (op.operation === "delete") {
        files.delete(op.path);
      }
    }
    return envelope({});
  });
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
    getPublicApiClient: async () => ({
      ledgers: {
        changeLedgerFiles: change,
        getLedgerFile: async (
          _o: string,
          _n: string,
          query: { path: string },
        ) => envelope(toPublic(query.path)),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) => envelope(body.files.map(toPublic).filter(Boolean)),
        getLedgerDirContent: async (
          _o: string,
          _n: string,
          query?: { dir_path?: string | null },
        ) => {
          const prefix = query?.dir_path ? `${query.dir_path}/` : "";
          const seen = new Map<
            string,
            { type: string; path: string; name: string }
          >();
          for (const path of files.keys()) {
            if (!path.startsWith(prefix)) continue;
            const rest = path.slice(prefix.length);
            const slash = rest.indexOf("/");
            if (slash === -1) {
              seen.set(path, { type: "file", path, name: rest });
            } else {
              const sub = prefix + rest.slice(0, slash);
              seen.set(sub, {
                type: "dir",
                path: sub,
                name: rest.slice(0, slash),
              });
            }
          }
          return envelope([...seen.values()]);
        },
      },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      models as never,
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
  resolver = new LedgerMutationResolver(workflow);
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const ledgerData = {
    getErrors: jest.fn(async () => {
      const batch =
        errorBatches[Math.min(errorCalls.count, errorBatches.length - 1)] ??
        [];
      errorCalls.count += 1;
      return batch;
    }),
  };
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
      services: { ledgerData },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "rename-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    files,
    state,
    change,
    call: async (
      surface: string,
      oldPath: string,
      newPath: string,
      extra: Record<string, unknown> = {},
    ) => {
      const args = { oldPath, newPath, message: "Move café file", ...extra };
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/rename-file`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(args),
          },
        );
        return {
          success: response.status === 200,
          result: await response.json(),
        };
      }
      if (surface === "gql") {
        const result = await graphql({
          schema,
          source:
            'mutation($oldPath:String!,$newPath:String!,$message:String,$updateIncludes:Boolean) { renameLedgerFile(ledgerId:"alice/main",oldPath:$oldPath,newPath:$newPath,message:$message,updateIncludes:$updateIncludes) { oldPath newPath updatedIncludes } }',
          variableValues: args,
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return {
          success: !result.errors,
          result: result.data?.renameLedgerFile,
        };
      }
      const result = await client.callTool({
        name: "renameLedgerFile",
        arguments: {
          ...args,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      return {
        success: !result.isError,
        result: (result.structuredContent as { result?: unknown })?.result,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["rest", "gql", "mcp"])("rename via %s", (surface) => {
  // MCP write results carry the write outcome (summary first, then wrote,
  // entryHashes, validation); REST and GraphQL keep the plain paths contract.
  const withOutcome = (base: Record<string, unknown>, summary: string) =>
    surface === "mcp"
      ? {
          ...base,
          summary,
          wrote: [{ path: base["newPath"] }],
          entryHashes: [],
          validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
        }
      : base;
  it.each([identity, { ...identity, ledgerScope: undefined }])(
    "moves the contents with the supplied message for %j",
    async (caller) => {
      const f = await fixture(caller);
      try {
        expect(await f.call(surface, "old.bean", "folder/new.bean")).toEqual({
          success: true,
          result: withOutcome(
            {
              oldPath: "old.bean",
              newPath: "folder/new.bean",
              updatedIncludes: [],
            },
            "Renamed old.bean → folder/new.bean. No new bean-check errors.",
          ),
        });
        expect(
          [...f.files].map(([path, entry]) => [path, entry.content]),
        ).toEqual([
          ["occupied.bean", "; existing\n"],
          ["folder/new.bean", "; Café\n"],
        ]);
        expect(f.change).toHaveBeenCalledWith(
          "alice",
          "main",
          expect.objectContaining({
            files: expect.arrayContaining([
              expect.objectContaining({
                operation: "create",
                path: "folder/new.bean",
              }),
              expect.objectContaining({
                operation: "delete",
                path: "old.bean",
              }),
            ]),
            message: "Move café file",
          }),
        );
        const created = f.change.mock.calls[0][2].files.find(
          (op: { operation: string }) => op.operation === "create",
        );
        expect(
          Buffer.from(created.content.replace(/\s/g, ""), "base64").toString(
            "utf-8",
          ),
        ).toBe("; Café\n");
      } finally {
        await f.close();
      }
    },
  );
  it.each(["occupied.bean", "../escape.bean", "/absolute.bean"])(
    "refuses target %s without losing source contents",
    async (target) => {
      const f = await fixture();
      const before = [...f.files].map(([path, entry]) => [
        path,
        entry.content,
      ]);
      try {
        expect((await f.call(surface, "old.bean", target)).success).toBe(false);
        expect([...f.files].map(([path, entry]) => [path, entry.content])).toEqual(
          before,
        );
        if (target !== "occupied.bean") expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("defaults the commit message to Rename a → b", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, "old.bean", "new.bean", {
        message: undefined,
      });
      expect(result).toEqual({
        success: true,
        result: withOutcome(
          {
            oldPath: "old.bean",
            newPath: "new.bean",
            updatedIncludes: [],
          },
          "Renamed old.bean → new.bean. No new bean-check errors.",
        ),
      });
      expect(f.change).toHaveBeenCalledWith(
        "alice",
        "main",
        expect.objectContaining({ message: "Rename old.bean → new.bean" }),
      );
    } finally {
      await f.close();
    }
  });
  it("refuses a rename whose old path is still included", async () => {
    const f = await fixture(identity, {
      "main.bean": 'include "old.bean"\n',
      "old.bean": "; Café\n",
    });
    try {
      const result = await f.call(surface, "old.bean", "new.bean");
      expect(result.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
      expect(f.files.has("old.bean")).toBe(true);
    } finally {
      await f.close();
    }
  });
  it("rewrites includes with updateIncludes in the same commit", async () => {
    const f = await fixture(identity, {
      "main.bean": 'include "old.bean"\n',
      "old.bean": "; Café\n",
    });
    try {
      const result = await f.call(surface, "old.bean", "new.bean", {
        updateIncludes: true,
      });
      expect(result).toEqual({
        success: true,
        result: withOutcome(
          {
            oldPath: "old.bean",
            newPath: "new.bean",
            updatedIncludes: ["main.bean"],
          },
          "Renamed old.bean → new.bean (updated includes: main.bean). No new bean-check errors.",
        ),
      });
      expect(f.files.get("new.bean")?.content).toBe("; Café\n");
      expect(f.files.get("main.bean")?.content).toBe('include "new.bean"\n');
    } finally {
      await f.close();
    }
  });
  it("refuses a stale include in a file the entry point does not reach", async () => {
    const f = await fixture(identity, {
      "main.bean": "; no includes here\n",
      "orphan.bean": 'include "old.bean"\n',
      "old.bean": "; Café\n",
    });
    try {
      const result = await f.call(surface, "old.bean", "new.bean");
      expect(result.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
      expect(f.files.has("old.bean")).toBe(true);
    } finally {
      await f.close();
    }
  });
  it("reports bean-check's verdict around the write", async () => {
    const f = await fixture(
      identity,
      undefined,
      [
        [],
        [
          {
            message: "Failed to read file folder/new.bean",
            source: { filename: "main.bean", lineno: 1 },
          },
        ],
      ],
    );
    try {
      const result = await f.call(surface, "old.bean", "folder/new.bean");
      if (surface === "mcp") {
        expect(result).toEqual({
          success: true,
          result: {
            summary:
              "Renamed old.bean → folder/new.bean. 1 new bean-check error: Failed to read file folder/new.bean (main.bean:1)",
            oldPath: "old.bean",
            newPath: "folder/new.bean",
            updatedIncludes: [],
            wrote: [{ path: "folder/new.bean" }],
            entryHashes: [],
            validation: {
              errorsBefore: 0,
              errorsAfter: 1,
              newErrors: [
                {
                  message: "Failed to read file folder/new.bean",
                  source: "main.bean:1",
                },
              ],
            },
          },
        });
      } else {
        expect(result.success).toBe(true);
      }
    } finally {
      await f.close();
    }
  });
  it("refuses revoked write access before a repository mutation", async () => {
    const f = await fixture();
    f.state.writable = false;
    try {
      expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(
        false,
      );
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  it("refuses read-only credentials before a repository mutation", async () => {
    const f = await fixture({ ...identity, scopes: new Set(["ledger.read"]) });
    try {
      expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(
        false,
      );
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
