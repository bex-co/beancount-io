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

type FixtureFiles = Map<
  string,
  { content: string; sha: string; encoding?: string }
>;

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
      encoding: entry.encoding ?? null,
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
  it("answers a source that does not exist as NOT_FOUND and writes nothing", async () => {
    const f = await fixture();
    try {
      const outcome = await f.call(surface, "ghost.bean", "new.bean");
      expect(outcome.success).toBe(false);
      // The category is the shared workflow's; REST is where this helper
      // exposes it. It was BAD_USER_INPUT here alone (w5/051).
      if (surface === "rest") {
        expect(outcome.result).toMatchObject({
          ok: false,
          error: { code: "NOT_FOUND" },
        });
      }
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  // A clone on macOS or Windows keeps one of two paths that differ only by
  // letter case, a folder's included (w23/068).
  it.each([
    ["OCCUPIED.bean", "occupied.bean"],
    ["Txns/old.bean", "txns"],
  ])(
    "refuses target %s, a twin of %s on case-insensitive checkouts",
    async (target, twin) => {
      const f = await fixture(identity, {
        "old.bean": "; Café\n",
        "occupied.bean": "; existing\n",
        "txns/2026.bean": "; txns\n",
      });
      try {
        const outcome = await f.call(surface, "old.bean", target);
        expect(outcome.success).toBe(false);
        if (surface === "rest") {
          expect(outcome.result).toMatchObject({
            ok: false,
            error: {
              code: "CONFLICT",
              message: expect.stringContaining(`as ${twin}`),
            },
          });
        }
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it.each([
    ["old.bean", "Old.bean"],
    ["txns/only.bean", "Txns/only.bean"],
  ])(
    "renames %s to %s, which only the moved file shares a name with",
    async (oldPath, newPath) => {
      const f = await fixture(identity, {
        [oldPath]: "; Café\n",
        "occupied.bean": "; existing\n",
      });
      try {
        expect((await f.call(surface, oldPath, newPath)).success).toBe(true);
        expect([...f.files.keys()].sort()).toEqual(
          [newPath, "occupied.bean"].sort(),
        );
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

/**
 * w23/029. Includes resolve against the directory of the file that declares
 * them, but the rename matched their text against repo-root paths: it missed
 * `d/inc.bean`'s `include "x.bean"`, refused over `d/inc2.bean`'s unrelated
 * `include "b.bean"`, and with `updateIncludes` rewrote that one to a file
 * that does not exist while leaving `include "./b.bean"` dangling.
 */
describe.each(["rest", "gql", "mcp"])(
  "rename with relative includes via %s",
  (surface) => {
    const tree = {
      "d/x.bean": "; x\n",
      "d/inc.bean": 'include "x.bean"\n',
      "d/b.bean": "; d/b\n",
      "d/inc2.bean": 'include "b.bean"\n',
      "d/up.bean": 'include "../b.bean" ; parent\n',
      "b.bean": "; b\n",
      "inc3.bean": 'include "./b.bean"\n',
    };
    const message = (result: unknown) => JSON.stringify(result ?? "");
    const updated = (result: unknown) =>
      (result as { updatedIncludes?: string[] } | undefined)?.updatedIncludes;

    it("refuses a rename an include in a subdirectory still names", async () => {
      const f = await fixture(identity, tree);
      try {
        const outcome = await f.call(surface, "d/x.bean", "d/y.bean");
        expect(outcome.success).toBe(false);
        expect(f.change).not.toHaveBeenCalled();
        const done = await f.call(surface, "d/x.bean", "d/y.bean", {
          updateIncludes: true,
        });
        expect(updated(done.result)).toEqual(["d/inc.bean"]);
        expect(f.files.get("d/inc.bean")?.content).toBe('include "y.bean"\n');
      } finally {
        await f.close();
      }
    });

    it("names only the includes that resolve to the file", async () => {
      const f = await fixture(identity, tree);
      try {
        const outcome = await f.call(surface, "b.bean", "c.bean");
        expect(outcome.success).toBe(false);
        if (surface === "rest") {
          const text = message(outcome.result);
          expect(text).toContain("inc3.bean");
          expect(text).toContain("d/up.bean");
          expect(text).not.toContain("d/inc2.bean");
        }
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("rewrites each include relative to its own file and leaves others alone", async () => {
      const f = await fixture(identity, tree);
      try {
        const done = await f.call(surface, "b.bean", "e/c.bean", {
          updateIncludes: true,
        });
        expect(done.success).toBe(true);
        expect(updated(done.result)).toEqual(
          expect.arrayContaining(["inc3.bean", "d/up.bean"]),
        );
        expect(updated(done.result)).toHaveLength(2);
        expect(f.files.get("inc3.bean")?.content).toBe(
          'include "./e/c.bean"\n',
        );
        expect(f.files.get("d/up.bean")?.content).toBe(
          'include "../e/c.bean" ; parent\n',
        );
        expect(f.files.get("d/inc2.bean")?.content).toBe('include "b.bean"\n');
      } finally {
        await f.close();
      }
    });

    // A quote is no longer a name a new file can take (w23/054); a space is.
    it.each(["my file.bean"])(
      "writes a new name %p that reads back as the same path",
      async (newPath) => {
        const f = await fixture(identity, {
          "main.bean": 'include "b.bean"\n',
          "b.bean": "; b\n",
        });
        try {
          const done = await f.call(surface, "b.bean", newPath, {
            updateIncludes: true,
          });
          expect(done.success).toBe(true);
          // Renaming it back finds the include it wrote, so that include names it.
          const back = await f.call(surface, newPath, "b.bean", {
            updateIncludes: true,
          });
          expect(updated(back.result)).toEqual(["main.bean"]);
          expect(f.files.get("main.bean")?.content).toBe('include "b.bean"\n');
        } finally {
          await f.close();
        }
      },
    );

    it("refuses a new name a Windows checkout or an include cannot hold", async () => {
      const f = await fixture(identity, {
        "main.bean": 'include "b.bean"\n',
        "b.bean": "; b\n",
      });
      try {
        for (const newPath of ['c"x.bean', "aux.bean", "qa\nx.bean", "notes.\u202ebean"]) {
          const outcome = await f.call(surface, "b.bean", newPath, {
            updateIncludes: true,
          });
          expect(outcome.success).toBe(false);
        }
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("keeps a glob that still matches and refuses one the file would leave", async () => {
      const f = await fixture(identity, {
        "main.bean": 'include "d/*.bean"\n',
        "d/x.bean": "; x\n",
      });
      try {
        const kept = await f.call(surface, "d/x.bean", "d/y.bean");
        expect(kept.success).toBe(true);
        expect(updated(kept.result)).toEqual([]);
        const left = await f.call(surface, "d/y.bean", "e/y.bean", {
          updateIncludes: true,
        });
        expect(left.success).toBe(false);
        if (surface === "rest")
          expect(message(left.result)).toContain('include \\"d/*.bean\\"');
        expect(f.files.has("d/y.bean")).toBe(true);
        expect(f.files.get("main.bean")?.content).toBe('include "d/*.bean"\n');
      } finally {
        await f.close();
      }
    });
  },
);

/**
 * w23/030. Rewriting an include re-encoded the whole including file from its
 * lenient decode, so a Latin-1 includer lost every non-ASCII byte. Moving a
 * Latin-1 file itself never decodes it and must keep its bytes.
 */
describe.each(["rest", "gql", "mcp"])("rename around a non-UTF-8 file via %s", (surface) => {
  const latin1 = Buffer.concat([
    Buffer.from('; Caf'),
    Buffer.from([0xe9]),
    Buffer.from('\ninclude "b.bean"\n'),
  ]).toString("base64");

  it("refuses to rewrite an include in a file that is not valid UTF-8", async () => {
    const f = await fixture(identity, { "b.bean": "; b\n" });
    f.files.set("main.bean", { content: latin1, sha: "sha-l", encoding: "base64" });
    try {
      const outcome = await f.call(surface, "b.bean", "c.bean", { updateIncludes: true });
      expect(outcome.success).toBe(false);
      if (surface === "rest")
        expect(outcome.result).toMatchObject({
          error: { code: "BAD_USER_INPUT", message: expect.stringContaining("main.bean is not valid UTF-8") },
        });
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("moves a file that is not valid UTF-8 byte for byte", async () => {
    const f = await fixture(identity, {});
    f.files.set("old.bean", { content: latin1, sha: "sha-l", encoding: "base64" });
    try {
      expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(true);
      const created = f.change.mock.calls[0][2].files.find(
        (op: { operation: string }) => op.operation === "create",
      );
      expect(created.content).toBe(latin1);
    } finally {
      await f.close();
    }
  });
});


/** w23/031: renaming or deleting the entry point leaves a ledger that cannot load. */
describe.each(["rest", "gql", "mcp"])("the entry point via %s", (surface) => {
  it("cannot be renamed", async () => {
    const f = await fixture(identity, { "main.bean": "; main\n" });
    try {
      const outcome = await f.call(surface, "main.bean", "ledger.bean", { updateIncludes: true });
      expect(outcome.success).toBe(false);
      if (surface === "rest")
        expect(outcome.result).toMatchObject({
          error: { code: "BAD_USER_INPUT", message: "main.bean is the ledger's entry point and can't be renamed" },
        });
      expect(f.change).not.toHaveBeenCalled();
      expect(f.files.has("main.bean")).toBe(true);
    } finally {
      await f.close();
    }
  });

  if (surface === "gql")
    it("cannot be deleted through deleteLedgerFile", async () => {
      const f = await fixture(identity, { "main.bean": "; main\n" });
      try {
        const result = await graphql({
          schema,
          source: 'mutation { deleteLedgerFile(ledgerId: "alice/main", path: "main.bean", sha: "sha-0-main.bean") { path } }',
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(result.errors?.[0]?.originalError).toMatchObject({
          category: "BAD_USER_INPUT",
        });
        expect(result.errors?.[0]?.message).toBe("main.bean is the ledger's entry point and can't be deleted");
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
});

/**
 * w23/056. A moved file's bytes moved as they were, so its own relative
 * includes resolved from the new folder: `include "x.bean"` in `d/inc.bean`
 * pointed at `e/x.bean` after a move to `e/`.
 */
describe.each(["rest", "gql", "mcp"])("moving a file that includes others via %s", (surface) => {
  const tree = {
    "d/x.bean": "; x\n",
    "d/inc.bean": '; mine\ninclude "x.bean" ; sibling\ninclude "/d/x.bean"\n',
  };
  const updated = (result: unknown) =>
    (result as { updatedIncludes?: string[] } | undefined)?.updatedIncludes;

  it("moves the bytes unchanged within its folder", async () => {
    const f = await fixture(identity, tree);
    try {
      expect((await f.call(surface, "d/inc.bean", "d/inc2.bean")).success).toBe(true);
      expect(f.files.get("d/inc2.bean")?.content).toBe(tree["d/inc.bean"]);
    } finally {
      await f.close();
    }
  });

  it("refuses a move to another folder that would break its include, then rewrites it", async () => {
    const f = await fixture(identity, tree);
    try {
      const refused = await f.call(surface, "d/inc.bean", "e/inc.bean");
      expect(refused.success).toBe(false);
      if (surface === "rest")
        expect(JSON.stringify(refused.result)).toContain('d/inc.bean includes \\"x.bean\\"');
      expect(f.change).not.toHaveBeenCalled();

      const moved = await f.call(surface, "d/inc.bean", "e/inc.bean", { updateIncludes: true });
      expect(moved.success).toBe(true);
      expect(updated(moved.result)).toEqual(["e/inc.bean"]);
      // Relative to its new folder; the root-anchored include needs nothing.
      expect(f.files.get("e/inc.bean")?.content).toBe(
        '; mine\ninclude "../d/x.bean" ; sibling\ninclude "/d/x.bean"\n',
      );
    } finally {
      await f.close();
    }
  });

  it("refuses to move a glob include to another folder", async () => {
    const f = await fixture(identity, { "d/x.bean": "; x\n", "d/all.bean": 'include "*.bean"\n' });
    try {
      const outcome = await f.call(surface, "d/all.bean", "e/all.bean", { updateIncludes: true });
      expect(outcome.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
