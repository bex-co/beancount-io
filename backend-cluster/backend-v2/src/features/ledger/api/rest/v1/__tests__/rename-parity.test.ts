import "reflect-metadata";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { formatError } from "@/server/graphql/format-error";
import { clearRateLimitShadows } from "@/server/api/rate-limit";
import { FavaApiError } from "@/foundation/fava/api-client";
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
// Every MCP call here is charged to one identity's write budget; the file
// makes more than a minute's worth, so each test starts with a fresh one.
beforeEach(() => clearRateLimitShadows());

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
  errorBatches: {
    message: string;
    source?: { filename: string; lineno: number };
  }[][] = [[], []],
) {
  const errorCalls = { count: 0 };
  const shaOf = (seed: string) => createHash("sha1").update(seed).digest("hex");
  const files: FixtureFiles = new Map(
    Object.entries(initial).map(([path, content], index) => [
      path,
      { content, sha: shaOf(`sha-${index}-${path}`) },
    ]),
  );
  const state = {
    writable: true,
    exists: true,
    visible: true,
    commit: undefined as string | undefined,
  };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  // The include closure from main.bean, as the ledger service lists it
  // (exact includes are enough here): a non-`.bean` file in it is an
  // includer (w31/023).
  const sourceFiles = () => {
    const reached = new Set<string>();
    const pending = ["main.bean"];
    for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
      const content = files.get(path)?.content;
      if (content === undefined || reached.has(path)) continue;
      reached.add(path);
      for (const [, target = ""] of content.matchAll(/^include\s+"([^"]+)"/gm))
        pending.push(
          target.startsWith("/")
            ? target.slice(1)
            : posix.join(posix.dirname(path), target),
        );
    }
    return [...reached].sort();
  };
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
  // Matches ledger/src/api/files.ts: GET /files collapses directories to null,
  // while POST /files-content preserves `{ type: "dir" }` entries (w31/087).
  const toContentEntry = (path: string) => {
    const file = toPublic(path);
    if (file) return file;
    const prefix = `${path}/`;
    if ([...files.keys()].some((candidate) => candidate.startsWith(prefix))) {
      return {
        name: path.split("/").pop(),
        path,
        type: "dir",
        sha: shaOf(`dir-${path}`),
        size: 0,
        content: null,
        encoding: null,
      };
    }
    return null;
  };
  const change = jest.fn(async (_owner, _name, options) => {
    for (const op of options.files) {
      if (op.operation === "create" && files.has(op.path)) {
        throw new Error("Fixture repository conflict");
      }
      if (
        (op.operation === "update" || op.operation === "delete") &&
        !files.has(op.path)
      ) {
        throw new Error("Fixture missing file");
      }
    }
    for (const op of options.files) {
      if (op.operation === "create") {
        const content = op.content
          ? Buffer.from(op.content.replace(/\s/g, ""), "base64").toString(
              "utf-8",
            )
          : "";
        files.set(op.path, { content, sha: shaOf(`sha-new-${op.path}`) });
      } else if (op.operation === "update") {
        const content = op.content
          ? Buffer.from(op.content.replace(/\s/g, ""), "base64").toString(
              "utf-8",
            )
          : "";
        files.set(op.path, { content, sha: shaOf(`sha-upd-${op.path}`) });
      } else if (op.operation === "delete") {
        files.delete(op.path);
      }
    }
    return envelope(state.commit ? { commit: state.commit } : {});
  });
  const fava = {
    getAdminClient: () => ({
      ledgers: {
        getLedger: async () => {
          if (!state.exists) throw new FavaApiError("Not Found", 404);
          return envelope({ id: 42, private: true });
        },
      },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () => {
            // Not a collaborator: a private ledger the caller cannot see.
            if (!state.visible) throw new FavaApiError("Not Found", 404);
            return envelope({ permission: state.writable ? "write" : "read" });
          },
        },
      },
    }),
    getPublicApiClient: async () => ({
      // The file-write gate projects bean-check over the new contents.
      reports: {
        checkProjectedErrors: async () => envelope([]),
        getLedgerSourceFiles: async () => envelope(sourceFiles()),
      },
      ledgers: {
        changeLedgerFiles: change,
        deleteLedgerFile: async (
          _o: string,
          _n: string,
          options: { path: string },
        ) => {
          if (!files.has(options.path)) throw new Error("Fixture missing file");
          files.delete(options.path);
          return envelope(state.commit ? { commit: state.commit } : {});
        },
        getLedgerFile: async (
          _o: string,
          _n: string,
          query: { path: string },
        ) => envelope(toPublic(query.path)),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) => envelope(body.files.map(toContentEntry).filter(Boolean)),
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
  const ledgerData = {
    getSourceFiles: async () => sourceFiles(),
    getErrors: jest.fn(async () => {
      const batch =
        errorBatches[Math.min(errorCalls.count, errorBatches.length - 1)] ?? [];
      errorCalls.count += 1;
      return batch;
    }),
  };
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    // The workflow reads the ledger's errors around a rename itself (w23/233).
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  resolver = new LedgerMutationResolver(workflow);
  // The delete-guard parity below drives the real repo service through the
  // same fake repository; rename never touches it.
  const ledgerRepo = new LedgerRepoService(fava as never, authorization);
  const rest = await startV1TestServer(
    {
      workflows: { ledger: workflow },
      services: { ledgerRepo, ledgerData },
    } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
      services: { ledgerData, ledgerRepo },
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
    listTools: () => client.listTools(),
    call: async (
      surface: string,
      oldPath: string,
      newPath: string,
      extra: Record<string, unknown> = {},
      messageKey = "message",
    ) => {
      const { message: messageOverride, ...restExtra } = extra;
      const args = {
        oldPath,
        newPath,
        [messageKey]: "message" in extra ? messageOverride : "Move café file",
        ...restExtra,
      };
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/rename-file`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(args),
          },
        );
        const body = await response.json();
        return {
          success: response.status === 200,
          result: body,
          code: (body as { error?: { code?: string } }).error?.code,
          ...(response.status === 200
            ? {}
            : {
                status: response.status,
                message: (body as { error?: { message?: string } }).error
                  ?.message,
              }),
        };
      }
      if (surface === "gql") {
        // Declare whichever commit-message spellings this call carries, so
        // the conflict case actually sends both.
        const keys = ["message", "description"].filter((key) => key in args);
        const defs = [
          "$oldPath:String!",
          "$newPath:String!",
          ...keys.map((key) => `$${key}:String`),
          "$updateIncludes:Boolean",
          "$dryRun:Boolean",
          // Twin (w23/m9/t002): MCP spells the preview flag dry_run.
          "$dry_run:Boolean",
        ].join(",");
        const uses = [
          "oldPath:$oldPath",
          "newPath:$newPath",
          ...keys.map((key) => `${key}:$${key}`),
          "updateIncludes:$updateIncludes",
          "dryRun:$dryRun",
          "dry_run:$dry_run",
        ].join(",");
        const result = await graphql({
          schema,
          source: `mutation(${defs}) { renameLedgerFile(ledgerId:"alice/main",${uses}) { message dryRun oldPath newPath updatedIncludes preview { path text } errorsBefore errorsAfter newErrors { message source } valid } }`,
          variableValues: args,
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        const error = result.errors?.[0];
        const extensions = error
          ? formatError(error.toJSON(), error).extensions
          : undefined;
        return {
          success: !result.errors,
          result: result.data?.renameLedgerFile,
          code: extensions?.code,
          message: error?.message,
          ...(extensions?.field !== undefined && { field: extensions.field }),
        };
      }
      const result = await client.callTool({
        name: "renameLedgerFile",
        arguments: {
          ...args,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      const failure = (
        result.structuredContent as {
          error?: { code?: string; message?: string };
        }
      )?.error;
      return {
        success: !result.isError,
        result: (result.structuredContent as { result?: unknown })?.result,
        code: failure?.code,
        message: failure?.message,
      };
    },
    deleteFile: async (
      surface: string,
      path: string,
      removeIncludes?: boolean,
    ) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`,
          {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(removeIncludes ? { removeIncludes } : {}),
          },
        );
        const body = (await response.json()) as { commit?: string };
        return {
          success: response.status === 200,
          result: body,
          commit: body.commit,
        };
      }
      if (surface === "gql") {
        const result = await graphql({
          schema,
          source: `mutation($path:String!,$sha:String!,$remove:Boolean) { deleteLedgerFile(ledgerId:"alice/main",path:$path,sha:$sha,removeIncludes:$remove) { path commit } }`,
          variableValues: {
            path,
            sha: files.get(path)?.sha ?? "0".repeat(40),
            remove: removeIncludes,
          },
          contextValue: { identity: caller, getCurrentIdentity: () => caller },
        });
        return {
          success: !result.errors,
          result,
          commit:
            (
              result.data?.deleteLedgerFile as
                | { commit?: string | null }
                | undefined
            )?.commit ?? undefined,
        };
      }
      const result = await client.callTool({
        name: "deleteLedgerFiles",
        arguments: {
          description: "prune",
          files: [{ path }],
          ...(removeIncludes ? { remove_includes: true } : {}),
        },
      });
      return {
        success: !result.isError,
        result: result.structuredContent,
        commit: (result.structuredContent as { result?: { commit?: string } })
          ?.result?.commit,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

// MCP write results carry the write outcome (summary first, then wrote,
// entryHashes, validation); REST and GraphQL keep the plain paths contract.
// Every surface echoes the preview flag — dryRun, except MCP's dry_run —
// with an empty preview on a commit, and a preview reports nothing written
// (w23/m7/t004, shared w23/m7/t007).
const withRenameOutcome = (
  surface: string,
  base: Record<string, unknown>,
  summary: string,
  preview: boolean,
) =>
  surface === "mcp"
    ? {
        ...base,
        dry_run: preview,
        summary,
        wrote: preview
          ? []
          : [
              ...new Set([
                base["newPath"],
                base["oldPath"],
                ...(base["updatedIncludes"] as string[]),
              ]),
            ].map((path) => ({ path })),
        entryHashes: [],
        validation: {
          errorsBefore: 0,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      }
    : {
        ...base,
        dryRun: preview,
        errorsBefore: 0,
        errorsAfter: 0,
        newErrors: [],
        valid: true,
      };

describe.each(["rest", "gql", "mcp"])("rename via %s", (surface) => {
  const withOutcome = (base: Record<string, unknown>, summary: string) =>
    withRenameOutcome(surface, base, summary, false);
  it.each([identity, { ...identity, ledgerScope: undefined }])(
    "moves the contents with the supplied message for %j",
    async (caller) => {
      const f = await fixture(caller);
      try {
        expect(await f.call(surface, "old.bean", "folder/new.bean")).toEqual({
          success: true,
          result: withOutcome(
            {
              message: "Renamed old.bean → folder/new.bean",
              oldPath: "old.bean",
              newPath: "folder/new.bean",
              updatedIncludes: [],
              preview: [],
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
      const before = [...f.files].map(([path, entry]) => [path, entry.content]);
      try {
        expect((await f.call(surface, "old.bean", target)).success).toBe(false);
        expect(
          [...f.files].map(([path, entry]) => [path, entry.content]),
        ).toEqual(before);
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
      expect(outcome).toMatchObject({ success: false, code: "NOT_FOUND" });
      if (surface === "rest") {
        expect(outcome).toMatchObject({ status: 404 });
      }
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
  // w31/087: GET /files collapses directories to null; rename must still
  // distinguish an existing directory from a missing file on every surface.
  it.each([false, true])(
    "refuses renaming an existing directory as BAD_USER_INPUT (dryRun=%s)",
    async (dryRun) => {
      const f = await fixture(identity, {
        "old.bean": "; Café\n",
        "reports/q1.bean": "; q1\n",
      });
      try {
        const previewFlag = dryRun
          ? surface === "mcp"
            ? { dry_run: true }
            : { dryRun: true }
          : {};
        const outcome = await f.call(
          surface,
          "reports",
          "reports2",
          previewFlag,
        );
        expect(outcome).toMatchObject({
          success: false,
          code: "BAD_USER_INPUT",
          message: "reports is a directory, not a file",
        });
        if (surface === "rest") {
          expect(outcome).toMatchObject({ status: 400 });
        }
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("refuses renaming onto an existing directory as CONFLICT and writes nothing", async () => {
    const f = await fixture(identity, {
      "old.bean": "; Café\n",
      "reports/q1.bean": "; q1\n",
    });
    try {
      const outcome = await f.call(surface, "old.bean", "reports");
      expect(outcome).toMatchObject({
        success: false,
        code: "CONFLICT",
        message: expect.stringContaining(
          "reports cannot be created: it is an existing folder",
        ),
      });
      if (surface === "rest") {
        expect(outcome).toMatchObject({ status: 409 });
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
            message: "Renamed old.bean → new.bean",
            oldPath: "old.bean",
            newPath: "new.bean",
            updatedIncludes: [],
            preview: [],
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

  // w1/212: a blank message wrote a blank commit; it is an omitted one.
  it.each(["", "   "])(
    "defaults a blank message %j to Rename a → b",
    async (blank) => {
      const f = await fixture();
      try {
        const result = await f.call(surface, "old.bean", "new.bean", {
          message: blank,
        });
        expect(result.success).toBe(true);
        expect(f.change).toHaveBeenCalledWith(
          "alice",
          "main",
          expect.objectContaining({ message: "Rename old.bean → new.bean" }),
        );
      } finally {
        await f.close();
      }
    },
  );

  // w23/m3/t002: the MCP file tools spell the commit message `description`,
  // so rename accepts it too; two different texts refuse without renaming.
  it("accepts description as the commit message", async () => {
    const f = await fixture();
    try {
      const result = await f.call(
        surface,
        "old.bean",
        "new.bean",
        {},
        "description",
      );
      expect(result.success).toBe(true);
      expect(f.change).toHaveBeenCalledWith(
        "alice",
        "main",
        expect.objectContaining({ message: "Move café file" }),
      );
    } finally {
      await f.close();
    }
  });

  it("refuses conflicting description and message without renaming", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, "old.bean", "new.bean", {
        description: "A different text",
      });
      expect(result.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
      expect(f.files.has("new.bean")).toBe(false);
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
  // w31/093: rewriting an exact include line to a path containing `[` emits a
  // glob pattern that Beancount / rustledger cannot load literally.
  it.each([true, false])(
    "refuses renaming an included file to a bracketed newPath as BAD_USER_INPUT (dryRun=%s)",
    async (dryRun) => {
      const f = await fixture(identity, {
        "main.bean": 'include "qa-20261124-small.bean"\n',
        "qa-20261124-small.bean": "2026-01-01 open Assets:Cash USD\n",
      });
      try {
        const previewFlag = dryRun
          ? surface === "mcp"
            ? { dry_run: true }
            : { dryRun: true }
          : {};
        const refused = await f.call(
          surface,
          "qa-20261124-small.bean",
          "qa-20261124-[1].bean",
          { updateIncludes: true, ...previewFlag },
        );
        expect(refused).toMatchObject({
          success: false,
          code: "BAD_USER_INPUT",
        });
        expect(refused.message).toMatch(/newPath/);
        expect(refused.message).toMatch(/glob metacharacter/);
        if (surface === "rest") {
          expect(refused).toMatchObject({ status: 400 });
        }
        expect(f.change).not.toHaveBeenCalled();
        expect(f.files.has("qa-20261124-small.bean")).toBe(true);
        expect(f.files.has("qa-20261124-[1].bean")).toBe(false);

        // Non-bracket control succeeds.
        const control = await f.call(
          surface,
          "qa-20261124-small.bean",
          "qa-20261124-1.bean",
          { updateIncludes: true, ...previewFlag },
        );
        expect(control.success).toBe(true);
      } finally {
        await f.close();
      }
    },
  );
  it("still allows renaming a non-included attachment to a bracketed path", async () => {
    const f = await fixture(identity, {
      "main.bean": "2026-01-01 open Assets:Cash USD\n",
      "documents/receipt.pdf": "%PDF-1.4\n",
    });
    try {
      const outcome = await f.call(
        surface,
        "documents/receipt.pdf",
        "documents/receipt[1].pdf",
      );
      expect(outcome.success).toBe(true);
      expect(f.files.has("documents/receipt[1].pdf")).toBe(true);
      expect(f.files.has("documents/receipt.pdf")).toBe(false);
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
            message: "Renamed old.bean → new.bean",
            oldPath: "old.bean",
            newPath: "new.bean",
            updatedIncludes: ["main.bean"],
            preview: [],
          },
          "Renamed old.bean → new.bean (updated includes: main.bean). No new bean-check errors.",
        ),
      });
      expect(f.files.get("new.bean")?.content).toBe("; Café\n");
      expect(f.files.get("main.bean")?.content).toBe('include "new.bean"\n');
      // An agent reading wrote learns main.bean changed too (w1/186).
      if (surface === "mcp") {
        expect((result.result as { wrote: unknown }).wrote).toEqual([
          { path: "new.bean" },
          { path: "old.bean" },
          { path: "main.bean" },
        ]);
      }
    } finally {
      await f.close();
    }
  });
  it("names the moved file once when it rewrites its own includes", async () => {
    const f = await fixture(identity, {
      "d/x.bean": "; x\n",
      "d/inc.bean": 'include "x.bean"\n',
    });
    try {
      const result = await f.call(surface, "d/inc.bean", "e/inc.bean", {
        updateIncludes: true,
      });
      expect(result.success).toBe(true);
      expect(f.files.get("e/inc.bean")?.content).toBe(
        'include "../d/x.bean"\n',
      );
      if (surface === "mcp") {
        expect((result.result as { wrote: unknown }).wrote).toEqual([
          { path: "e/inc.bean" },
          { path: "d/inc.bean" },
        ]);
      }
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
    const f = await fixture(identity, undefined, [
      [],
      [
        {
          message: "Failed to read file folder/new.bean",
          source: { filename: "main.bean", lineno: 1 },
        },
      ],
    ]);
    try {
      const result = await f.call(surface, "old.bean", "folder/new.bean");
      if (surface === "mcp") {
        expect(result).toEqual({
          success: true,
          result: {
            summary:
              "Renamed old.bean → folder/new.bean. 1 new bean-check error: Failed to read file folder/new.bean (main.bean:1)",
            message: "Renamed old.bean → folder/new.bean",
            oldPath: "old.bean",
            newPath: "folder/new.bean",
            updatedIncludes: [],
            preview: [],
            dry_run: false,
            wrote: [{ path: "folder/new.bean" }, { path: "old.bean" }],
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
              valid: false,
            },
          },
        });
      } else {
        // w23/233: REST and GraphQL carry the same verdict, flat.
        expect(result).toMatchObject({
          success: true,
          result: {
            errorsBefore: 0,
            errorsAfter: 1,
            newErrors: [
              {
                message: "Failed to read file folder/new.bean",
                source: "main.bean:1",
              },
            ],
            valid: false,
          },
        });
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
  // w1/194: a write to a ledger the caller cannot see answered FORBIDDEN while
  // its reads answered NOT_FOUND, so a mistyped name read as missing authority.
  it.each(["exists", "visible"] as const)(
    "answers a rename as NOT_FOUND when the ledger fails %s",
    async (fact) => {
      const f = await fixture();
      f.state[fact] = false;
      try {
        const outcome = await f.call(surface, "old.bean", "new.bean");
        expect(outcome).toMatchObject({ success: false, code: "NOT_FOUND" });
        if (surface === "rest")
          expect(outcome.result).toMatchObject({
            error: { message: "Ledger not found" },
          });
        else expect(outcome.message).toBe("Ledger not found");
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
  it("tells a read-only collaborator the rename needs write access", async () => {
    const f = await fixture();
    f.state.writable = false;
    try {
      const outcome = await f.call(surface, "old.bean", "new.bean");
      expect(outcome).toMatchObject({ success: false, code: "FORBIDDEN" });
      const message =
        surface === "rest"
          ? (outcome.result as { error: { message: string } }).error.message
          : outcome.message;
      expect(message).toBe(
        "Changing the files of alice/main requires write access to it",
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

// A preview (w23/m7/t004) runs every check the commit runs, names the move
// plus the include rewrites, and commits nothing: no files changed, no
// commit recorded, nothing reported as written.
describe.each(["rest", "gql", "mcp"])("rename preview via %s", (surface) => {
  const previewFlag = surface === "mcp" ? { dry_run: true } : { dryRun: true };
  const withPreviewOutcome = (base: Record<string, unknown>, summary: string) =>
    withRenameOutcome(surface, base, summary, true);
  const contents = (f: { files: FixtureFiles }) =>
    [...f.files].map(([path, entry]) => [path, entry.content]);

  it("previews a move without committing it", async () => {
    const f = await fixture();
    const before = contents(f);
    try {
      expect(
        await f.call(surface, "old.bean", "folder/new.bean", previewFlag),
      ).toEqual({
        success: true,
        result: withPreviewOutcome(
          {
            message: "Would rename old.bean → folder/new.bean",
            oldPath: "old.bean",
            newPath: "folder/new.bean",
            updatedIncludes: [],
            preview: [],
          },
          "Would rename old.bean → folder/new.bean. No new bean-check errors.",
        ),
      });
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("previews include rewrites without committing them", async () => {
    const f = await fixture(identity, {
      "main.bean": 'include "old.bean"\n',
      "old.bean": "; Café\n",
    });
    const before = contents(f);
    try {
      expect(
        await f.call(surface, "old.bean", "new.bean", {
          ...previewFlag,
          updateIncludes: true,
        }),
      ).toEqual({
        success: true,
        result: withPreviewOutcome(
          {
            message: "Would rename old.bean → new.bean",
            oldPath: "old.bean",
            newPath: "new.bean",
            updatedIncludes: ["main.bean"],
            preview: [{ path: "main.bean", text: 'include "new.bean"' }],
          },
          "Would rename old.bean → new.bean (would update includes: main.bean). No new bean-check errors.",
        ),
      });
      expect(contents(f)).toEqual(before);
      expect(f.files.get("main.bean")?.content).toBe('include "old.bean"\n');
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("previews the moved file's own rewritten includes", async () => {
    const f = await fixture(identity, {
      "d/x.bean": "; x\n",
      "d/inc.bean": '; mine\ninclude "x.bean" ; sibling\ninclude "/d/x.bean"\n',
    });
    const before = contents(f);
    try {
      expect(
        await f.call(surface, "d/inc.bean", "e/inc.bean", {
          ...previewFlag,
          updateIncludes: true,
        }),
      ).toEqual({
        success: true,
        result: withPreviewOutcome(
          {
            message: "Would rename d/inc.bean → e/inc.bean",
            oldPath: "d/inc.bean",
            newPath: "e/inc.bean",
            updatedIncludes: ["e/inc.bean"],
            preview: [
              {
                path: "e/inc.bean",
                text: 'include "../d/x.bean" ; sibling',
              },
            ],
          },
          "Would rename d/inc.bean → e/inc.bean (would update includes: e/inc.bean). No new bean-check errors.",
        ),
      });
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses a still-included rename on a preview", async () => {
    const f = await fixture(identity, {
      "main.bean": 'include "old.bean"\n',
      "old.bean": "; Café\n",
    });
    const before = contents(f);
    try {
      const result = await f.call(surface, "old.bean", "new.bean", previewFlag);
      expect(result.success).toBe(false);
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses a missing source on a preview", async () => {
    const f = await fixture();
    try {
      const result = await f.call(
        surface,
        "ghost.bean",
        "new.bean",
        previewFlag,
      );
      expect(result.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses an occupied target on a preview", async () => {
    const f = await fixture();
    const before = contents(f);
    try {
      const result = await f.call(
        surface,
        "old.bean",
        "occupied.bean",
        previewFlag,
      );
      expect(result.success).toBe(false);
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  // The rewrite loop runs on a preview too (w23/m7/t008): refusing to
  // re-encode a non-UTF-8 includer is a check, not a commit step (w23/030).
  it("refuses to rewrite a non-UTF-8 includer on a preview", async () => {
    const f = await fixture(identity, { "b.bean": "; b\n" });
    const latin1 = Buffer.concat([
      Buffer.from("; Caf"),
      Buffer.from([0xe9]),
      Buffer.from('\ninclude "b.bean"\n'),
    ]).toString("base64");
    f.files.set("main.bean", {
      content: latin1,
      sha: "sha-l",
      encoding: "base64",
    });
    const before = contents(f);
    try {
      const result = await f.call(surface, "b.bean", "c.bean", {
        ...previewFlag,
        updateIncludes: true,
      });
      expect(result.success).toBe(false);
      if (surface === "rest")
        expect(result.result).toMatchObject({
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining("main.bean is not valid UTF-8"),
          },
        });
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  // w23/m9/t002: the twin spelling previews exactly like the native one.
  it("accepts the other surface's preview spelling", async () => {
    const f = await fixture();
    const before = contents(f);
    try {
      const twinFlag = surface === "mcp" ? { dryRun: true } : { dry_run: true };
      expect(
        await f.call(surface, "old.bean", "folder/new.bean", twinFlag),
      ).toEqual({
        success: true,
        result: withPreviewOutcome(
          {
            message: "Would rename old.bean → folder/new.bean",
            oldPath: "old.bean",
            newPath: "folder/new.bean",
            updatedIncludes: [],
            preview: [],
          },
          "Would rename old.bean → folder/new.bean. No new bean-check errors.",
        ),
      });
      expect(contents(f)).toEqual(before);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses one true and one false preview flag", async () => {
    const f = await fixture();
    const before = contents(f);
    try {
      const result = await f.call(surface, "old.bean", "folder/new.bean", {
        dry_run: true,
        dryRun: false,
      });
      expect(result.success).toBe(false);
      expect(contents(f)).toEqual(before);
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
        for (const newPath of [
          'c"x.bean',
          "aux.bean",
          "qa\nx.bean",
          "notes.\u202ebean",
        ]) {
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
describe.each(["rest", "gql", "mcp"])(
  "rename around a non-UTF-8 file via %s",
  (surface) => {
    const latin1 = Buffer.concat([
      Buffer.from("; Caf"),
      Buffer.from([0xe9]),
      Buffer.from('\ninclude "b.bean"\n'),
    ]).toString("base64");

    it("refuses to rewrite an include in a file that is not valid UTF-8", async () => {
      const f = await fixture(identity, { "b.bean": "; b\n" });
      f.files.set("main.bean", {
        content: latin1,
        sha: "sha-l",
        encoding: "base64",
      });
      try {
        const outcome = await f.call(surface, "b.bean", "c.bean", {
          updateIncludes: true,
        });
        expect(outcome.success).toBe(false);
        if (surface === "rest")
          expect(outcome.result).toMatchObject({
            error: {
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("main.bean is not valid UTF-8"),
            },
          });
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("moves a file that is not valid UTF-8 byte for byte", async () => {
      const f = await fixture(identity, {});
      f.files.set("old.bean", {
        content: latin1,
        sha: "sha-l",
        encoding: "base64",
      });
      try {
        expect((await f.call(surface, "old.bean", "new.bean")).success).toBe(
          true,
        );
        const created = f.change.mock.calls[0][2].files.find(
          (op: { operation: string }) => op.operation === "create",
        );
        expect(created.content).toBe(latin1);
      } finally {
        await f.close();
      }
    });
  },
);

/** w23/031: renaming or deleting the entry point leaves a ledger that cannot load. */
describe.each(["rest", "gql", "mcp"])("the entry point via %s", (surface) => {
  it("cannot be renamed", async () => {
    const f = await fixture(identity, { "main.bean": "; main\n" });
    try {
      const outcome = await f.call(surface, "main.bean", "ledger.bean", {
        updateIncludes: true,
      });
      expect(outcome.success).toBe(false);
      if (surface === "rest")
        expect(outcome.result).toMatchObject({
          error: {
            code: "BAD_USER_INPUT",
            message:
              "main.bean is the ledger's entry point and can't be renamed",
          },
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
          source:
            'mutation { deleteLedgerFile(ledgerId: "alice/main", path: "main.bean", sha: "sha-0-main.bean") { path } }',
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(result.errors?.[0]?.originalError).toMatchObject({
          category: "BAD_USER_INPUT",
        });
        expect(result.errors?.[0]?.message).toBe(
          "main.bean is the ledger's entry point and can't be deleted",
        );
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
describe.each(["rest", "gql", "mcp"])(
  "moving a file that includes others via %s",
  (surface) => {
    const tree = {
      "d/x.bean": "; x\n",
      "d/inc.bean": '; mine\ninclude "x.bean" ; sibling\ninclude "/d/x.bean"\n',
    };
    const updated = (result: unknown) =>
      (result as { updatedIncludes?: string[] } | undefined)?.updatedIncludes;

    it("moves the bytes unchanged within its folder", async () => {
      const f = await fixture(identity, tree);
      try {
        expect(
          (await f.call(surface, "d/inc.bean", "d/inc2.bean")).success,
        ).toBe(true);
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
          expect(JSON.stringify(refused.result)).toContain(
            'd/inc.bean includes \\"x.bean\\"',
          );
        expect(f.change).not.toHaveBeenCalled();

        const moved = await f.call(surface, "d/inc.bean", "e/inc.bean", {
          updateIncludes: true,
        });
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
      const f = await fixture(identity, {
        "d/x.bean": "; x\n",
        "d/all.bean": 'include "*.bean"\n',
      });
      try {
        const outcome = await f.call(surface, "d/all.bean", "e/all.bean", {
          updateIncludes: true,
        });
        expect(outcome.success).toBe(false);
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

/**
 * w31/133. Beancount resolves a relative `document` filename against the
 * directory of the file that declares it, as it does an include, so moving
 * `qa-books/docs.bean` to the root left `document … "receipt.txt"` naming a
 * root `receipt.txt` that is not there, and the commit was red.
 */
describe.each(["rest", "gql", "mcp"])(
  "moving a file whose documents name files beside it via %s",
  (surface) => {
    const previewFlag =
      surface === "mcp" ? { dry_run: true } : { dryRun: true };
    const DOC = '2026-08-30 document Assets:Cash "receipt.txt"';
    const tree = {
      "main.bean": 'include "qa-books/docs.bean"\n',
      "qa-books/docs.bean": `${DOC}\n`,
      "qa-books/receipt.txt": "receipt\n",
    };

    it("refuses the move without updateIncludes, naming the document", async () => {
      // Nothing includes the file, so the document is all the refusal names.
      const f = await fixture(identity, {
        "qa-books/docs.bean": `${DOC}\n`,
        "qa-books/receipt.txt": "receipt\n",
      });
      try {
        for (const extra of [{}, previewFlag]) {
          const refused = await f.call(
            surface,
            "qa-books/docs.bean",
            "docs.bean",
            extra,
          );
          expect(refused).toMatchObject({
            success: false,
            code: "BAD_USER_INPUT",
          });
          expect(refused.message).toContain(
            'qa-books/docs.bean names the document "receipt.txt" relative to its folder; pass updateIncludes: true to rewrite it for docs.bean',
          );
        }
        expect(f.change).not.toHaveBeenCalled();
        expect(f.files.get("qa-books/docs.bean")?.content).toBe(`${DOC}\n`);
      } finally {
        await f.close();
      }
    });

    it("previews the document line rewritten to name the same file", async () => {
      const f = await fixture(identity, tree);
      try {
        const preview = await f.call(
          surface,
          "qa-books/docs.bean",
          "docs.bean",
          {
            ...previewFlag,
            updateIncludes: true,
          },
        );
        expect(preview.success).toBe(true);
        expect(preview.result).toMatchObject({
          updatedIncludes: ["docs.bean", "main.bean"],
          preview: [
            {
              path: "docs.bean",
              text: '2026-08-30 document Assets:Cash "qa-books/receipt.txt"',
            },
            { path: "main.bean", text: 'include "docs.bean"' },
          ],
        });
        expect(f.change).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it.each([
      ["docs.bean", '"qa-books/receipt.txt"'],
      ["qa-books/sub/docs.bean", '"../receipt.txt"'],
      ["other/docs.bean", '"../qa-books/receipt.txt"'],
    ])(
      "commits a move to %s with the filename %s",
      async (newPath, written) => {
        const f = await fixture(identity, tree);
        try {
          const moved = await f.call(surface, "qa-books/docs.bean", newPath, {
            updateIncludes: true,
          });
          expect(moved.success).toBe(true);
          expect(f.files.get(newPath)?.content).toBe(
            `2026-08-30 document Assets:Cash ${written}\n`,
          );
          expect(f.files.has("qa-books/docs.bean")).toBe(false);
        } finally {
          await f.close();
        }
      },
    );

    it("moves the bytes unchanged within the folder", async () => {
      const f = await fixture(identity, tree);
      try {
        const moved = await f.call(
          surface,
          "qa-books/docs.bean",
          "qa-books/docs2.bean",
          { updateIncludes: true },
        );
        expect(moved.success).toBe(true);
        expect(f.files.get("qa-books/docs2.bean")?.content).toBe(`${DOC}\n`);
      } finally {
        await f.close();
      }
    });

    it("rewrites only the relative filenames that name a file, keeping each line's other bytes", async () => {
      const content = [
        '\uFEFF2026-08-30 document Assets:Cash "receipt.txt" #trip ^r1 ; kept',
        '2026/8/31\tdocument  Assets:Cash   "./receipt.txt"\r',
        '2026-09-01 document Assets:Cash "/qa-books/receipt.txt"',
        '2026-09-02 document Assets:Cash "https://example.com/r.txt"',
        '2026-09-03 document Assets:Cash "missing.txt"',
        '2026-09-04 note Assets:Cash "document Assets:Cash \\"receipt.txt\\""',
        '2026-09-05 * "multi',
        '2026-09-05 document Assets:Cash "receipt.txt"',
        'line"',
        "  Assets:Cash  0 USD",
        '; 2026-09-06 document Assets:Cash "receipt.txt"',
        '2026-09-07 document Assets:Cash "we\\"ird.txt"',
        "",
      ].join("\n");
      const f = await fixture(identity, {
        "qa-books/docs.bean": content,
        "qa-books/receipt.txt": "receipt\n",
        'qa-books/we"ird.txt': "odd\n",
      });
      try {
        const moved = await f.call(surface, "qa-books/docs.bean", "docs.bean", {
          updateIncludes: true,
        });
        expect(moved.success).toBe(true);
        expect(f.files.get("docs.bean")?.content).toBe(
          content
            .replace('"receipt.txt" #trip', '"qa-books/receipt.txt" #trip')
            .replace('"./receipt.txt"\r', '"./qa-books/receipt.txt"\r')
            .replace('"we\\"ird.txt"', '"qa-books/we\\"ird.txt"'),
        );
      } finally {
        await f.close();
      }
    });
  },
);

// w31/023: a non-`.bean` file the ledger loads (`include "qa/list.txt"`) is
// an includer like any `.bean` file, for rename, its own moved includes and
// delete, on every surface. A text file the ledger never loads is not, even
// when it quotes an include line.
describe.each(["rest", "gql", "mcp"])(
  "includes in a loaded non-.bean file via %s",
  (surface) => {
    const tree = {
      "main.bean": '; main\ninclude "qa/list.txt"\n',
      "qa/list.txt": 'include "y.bean"\n',
      "qa/y.bean": "; y\n",
      "notes/README.txt": 'include "y.bean"\n',
      "notes/y.bean": "; quoted by a file the ledger never loads\n",
    };
    const updated = (result: unknown) =>
      (result as { updatedIncludes?: string[] } | undefined)?.updatedIncludes;

    it("refuses renaming a file a loaded .txt includes, then rewrites the .txt", async () => {
      const f = await fixture(identity, tree);
      try {
        const refused = await f.call(surface, "qa/y.bean", "qa/z.bean");
        expect(refused.success).toBe(false);
        expect(JSON.stringify(refused)).toContain(
          "qa/y.bean is still included by qa/list.txt",
        );
        expect(f.change).not.toHaveBeenCalled();

        const done = await f.call(surface, "qa/y.bean", "qa/z.bean", {
          updateIncludes: true,
        });
        expect(done.success).toBe(true);
        expect(updated(done.result)).toEqual(["qa/list.txt"]);
        expect(f.files.get("qa/list.txt")?.content).toBe('include "z.bean"\n');
        expect(f.files.get("notes/README.txt")?.content).toBe(
          tree["notes/README.txt"],
        );
      } finally {
        await f.close();
      }
    });

    it("rewrites a moved .txt's own includes for its new folder", async () => {
      const f = await fixture(identity, tree);
      try {
        const done = await f.call(surface, "qa/list.txt", "qa/sub/list.txt", {
          updateIncludes: true,
        });
        expect(done.success).toBe(true);
        expect(updated(done.result)).toEqual(["qa/sub/list.txt", "main.bean"]);
        expect(f.files.get("qa/sub/list.txt")?.content).toBe(
          'include "../y.bean"\n',
        );
        expect(f.files.get("main.bean")?.content).toBe(
          '; main\ninclude "qa/sub/list.txt"\n',
        );
      } finally {
        await f.close();
      }
    });

    it("leaves the include lines of a file the ledger never loads alone", async () => {
      const f = await fixture(identity, tree);
      try {
        const renamed = await f.call(surface, "notes/y.bean", "notes/w.bean");
        expect(renamed.success).toBe(true);
        expect(updated(renamed.result)).toEqual([]);
        const moved = await f.call(
          surface,
          "notes/README.txt",
          "docs/README.txt",
        );
        expect(moved.success).toBe(true);
        expect(updated(moved.result)).toEqual([]);
        expect(f.files.get("docs/README.txt")?.content).toBe(
          tree["notes/README.txt"],
        );
      } finally {
        await f.close();
      }
    });

    it("refuses deleting a file a loaded .txt includes, then drops the line", async () => {
      const f = await fixture(identity, tree);
      try {
        const refused = await f.deleteFile(surface, "qa/y.bean");
        expect(refused.success).toBe(false);
        expect(JSON.stringify(refused.result)).toContain(
          "qa/y.bean is still included by qa/list.txt",
        );
        expect(f.files.has("qa/y.bean")).toBe(true);
        expect(f.change).not.toHaveBeenCalled();

        const done = await f.deleteFile(surface, "qa/y.bean", true);
        expect(done.success).toBe(true);
        expect(f.files.has("qa/y.bean")).toBe(false);
        expect(f.files.get("qa/list.txt")?.content).toBe("");
        expect(f.change).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });
  },
);

// w23/084: models spell shell-style `./old.bean`; every file tool except
// rename already normalizes that at the MCP layer. REST and GraphQL stay
// strict behind the shared validator — pinned here, not an oversight.
describe("dot-prefix normalization", () => {
  const tree = { "main.bean": "; root\n", "old.bean": "; old\n" };

  it("renames ./old to new on MCP and reports canonical paths", async () => {
    const f = await fixture(identity, tree);
    try {
      const outcome = await f.call("mcp", "./old.bean", "./new.bean");
      expect(outcome.success).toBe(true);
      expect(outcome.result).toEqual(
        expect.objectContaining({
          oldPath: "old.bean",
          newPath: "new.bean",
          wrote: [{ path: "new.bean" }, { path: "old.bean" }],
        }),
      );
      expect(f.files.get("new.bean")?.content).toBe("; old\n");
    } finally {
      await f.close();
    }
  });

  it.each(["rest", "gql"])("still refuses ./old on %s", async (surface) => {
    const f = await fixture(identity, tree);
    try {
      const outcome = await f.call(surface, "./old.bean", "new.bean");
      expect(outcome.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("still refuses ../x on MCP", async () => {
    const f = await fixture(identity, tree);
    try {
      const outcome = await f.call("mcp", "../old.bean", "new.bean");
      expect(outcome.success).toBe(false);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/**
 * w31/137. Both paths were refused with the bare "Invalid file path", and MCP
 * drops the `field` REST and GraphQL carry, so an agent could not tell whether
 * `oldPath` or `newPath` was wrong. The message now quotes the wrong one and
 * names the rule, on every surface, and REST and GraphQL keep the field.
 */
describe.each(["rest", "gql", "mcp"])("a malformed path via %s", (surface) => {
  const previewFlag = surface === "mcp" ? { dry_run: true } : { dryRun: true };

  it.each([
    [
      "old.bean",
      "x//y.bean",
      "newPath",
      'File path "x//y.bean" has an empty part: remove the doubled "/"',
    ],
    [
      "old.bean/",
      "y.bean",
      "oldPath",
      'File path "old.bean/" ends with "/": remove the trailing "/"',
    ],
    [
      "old.bean",
      "qa/../y.bean",
      "newPath",
      'File path "qa/../y.bean" has a "." or ".." part: write it relative to the ledger root',
    ],
  ])("refuses %j → %j naming %s", async (oldPath, newPath, field, message) => {
    const f = await fixture();
    try {
      const outcome = await f.call(surface, oldPath, newPath, previewFlag);
      expect(outcome).toMatchObject({
        success: false,
        code: "BAD_USER_INPUT",
        message,
      });
      if (surface === "rest")
        expect(outcome.result).toMatchObject({
          error: { metadata: { field } },
        });
      if (surface === "gql") expect(outcome).toMatchObject({ field });
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

// w23/m4/t001–t002: deleting a still-included file refuses naming the
// includers, like rename — on every surface.
describe.each(["rest", "mcp", "gql"])("delete guard via %s", (surface) => {
  const included = {
    "main.bean": '; main\ninclude "second.bean"\n',
    "second.bean": "; doomed\n",
  };
  it("refuses deleting a still-included file naming the includers", async () => {
    const f = await fixture(identity, included);
    try {
      const outcome = await f.deleteFile(surface, "second.bean");
      expect(outcome.success).toBe(false);
      expect(JSON.stringify(outcome.result)).toContain(
        "second.bean is still included by main.bean",
      );
      expect(f.files.has("second.bean")).toBe(true);
      expect(f.change).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("removeIncludes drops the exact include line in the same commit", async () => {
    const f = await fixture(identity, {
      "main.bean":
        '; main\ninclude "second.bean"\ninclude "books/*.bean"\ninclude "keep.bean"\n',
      "second.bean": "; doomed\n",
      "keep.bean": "; keep\n",
    });
    const commitSha = "deadbeef".repeat(5);
    f.state.commit = commitSha;
    try {
      const outcome = await f.deleteFile(surface, "second.bean", true);
      expect(outcome.success).toBe(true);
      expect(outcome.commit).toBe(commitSha);
      expect(f.files.has("second.bean")).toBe(false);
      // The glob and the other exact include stay; only the deleted file's goes.
      expect(f.files.get("main.bean")?.content).toBe(
        '; main\ninclude "books/*.bean"\ninclude "keep.bean"\n',
      );
      expect(f.change).toHaveBeenCalledTimes(1);
    } finally {
      await f.close();
    }
  });

  it("removeIncludes still deletes a file nothing includes", async () => {
    const f = await fixture(identity, {
      "main.bean": "; main\n",
      "lone.bean": "; lone\n",
    });
    const commitSha = "cafebabe".repeat(5);
    f.state.commit = commitSha;
    try {
      const outcome = await f.deleteFile(surface, "lone.bean", true);
      expect(outcome.success).toBe(true);
      expect(outcome.commit).toBe(commitSha);
      expect(f.files.has("lone.bean")).toBe(false);
      expect(f.files.get("main.bean")?.content).toBe("; main\n");
    } finally {
      await f.close();
    }
  });

  it("deletes a file nothing includes", async () => {
    const f = await fixture(identity, {
      "main.bean": "; main\n",
      "lone.bean": "; lone\n",
    });
    const commitSha = "feedface".repeat(5);
    f.state.commit = commitSha;
    try {
      const outcome = await f.deleteFile(surface, "lone.bean");
      expect(outcome.success).toBe(true);
      expect(outcome.commit).toBe(commitSha);
      expect(f.files.has("lone.bean")).toBe(false);
    } finally {
      await f.close();
    }
  });
});

// w31/097: lines inside multiline Beancount strings must never be treated as
// `include` directives by delete, rename, or cross-folder file moves.
describe.each(["rest", "gql", "mcp"])(
  "multiline strings containing include lines via %s (w31/097)",
  (surface) => {
    const MAIN_WITH_MULTILINE = [
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      "include 'qa-sub.bean'",
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Bank:Checking",
      "",
    ].join("\n");
    const updated = (result: unknown) =>
      (result as { updatedIncludes?: string[] } | undefined)?.updatedIncludes;

    it.each([false, true])(
      "deletes an unincluded file without touching a multiline string (removeIncludes=%s)",
      async (removeIncludes) => {
        const f = await fixture(identity, {
          "main.bean": MAIN_WITH_MULTILINE,
          "qa-sub.bean": "; disposable\n",
        });
        try {
          const outcome = await f.deleteFile(
            surface,
            "qa-sub.bean",
            removeIncludes,
          );
          expect(outcome.success).toBe(true);
          expect(f.files.has("qa-sub.bean")).toBe(false);
          expect(f.files.get("main.bean")?.content).toBe(MAIN_WITH_MULTILINE);
        } finally {
          await f.close();
        }
      },
    );

    it("removeIncludes strips only a real include and leaves a matching line inside a multiline string intact", async () => {
      const mainWithBoth = `${MAIN_WITH_MULTILINE}include "qa-sub.bean"\n`;
      const f = await fixture(identity, {
        "main.bean": mainWithBoth,
        "qa-sub.bean": "; disposable\n",
      });
      try {
        const outcome = await f.deleteFile(surface, "qa-sub.bean", true);
        expect(outcome.success).toBe(true);
        expect(f.files.has("qa-sub.bean")).toBe(false);
        expect(f.files.get("main.bean")?.content).toBe(MAIN_WITH_MULTILINE);
      } finally {
        await f.close();
      }
    });

    it.each([false, true])(
      "renames an unincluded file without refusing or rewriting a multiline string (updateIncludes=%s)",
      async (updateIncludes) => {
        const f = await fixture(identity, {
          "main.bean": MAIN_WITH_MULTILINE,
          "qa-sub.bean": "; disposable\n",
        });
        try {
          const outcome = await f.call(
            surface,
            "qa-sub.bean",
            "qa-moved.bean",
            updateIncludes ? { updateIncludes: true } : {},
          );
          expect(outcome.success).toBe(true);
          expect(updated(outcome.result)).toEqual([]);
          expect(f.files.has("qa-moved.bean")).toBe(true);
          expect(f.files.get("main.bean")?.content).toBe(MAIN_WITH_MULTILINE);
        } finally {
          await f.close();
        }
      },
    );

    it("moves a file across folders without rewriting include-like lines inside its multiline strings", async () => {
      const movedText = [
        '2026-08-30 * "Landlord" "Monthly rent',
        "include x.bean",
        "include *.bean",
        'end of memo"',
        "  Expenses:Food:Groceries  1.00 USD",
        "  Assets:Bank:Checking",
        "",
      ].join("\n");
      const f = await fixture(identity, {
        "main.bean": "; main\n",
        "d/doc.bean": movedText,
      });
      try {
        const outcome = await f.call(surface, "d/doc.bean", "e/doc.bean");
        expect(outcome.success).toBe(true);
        expect(updated(outcome.result)).toEqual([]);
        expect(f.files.get("e/doc.bean")?.content).toBe(movedText);
      } finally {
        await f.close();
      }
    });
  },
);

// w6/m11/t008: the advertised hint must cover the committed branch even
// though the same tool also accepts a non-mutating dry_run.
describe("rename annotation follows its real effects", () => {
  it("declares the source deletion and include overwrite as destructive", async () => {
    const f = await fixture(identity, {
      "main.bean": 'include "old.bean"\n',
      "old.bean": "; preserved contents\n",
    });
    try {
      const { tools } = await f.listTools();
      const advertised = tools.find((tool) => tool.name === "renameLedgerFile");
      expect(
        (
          await f.call("mcp", "old.bean", "new.bean", {
            updateIncludes: true,
          })
        ).success,
      ).toBe(true);
      expect(f.files.has("old.bean")).toBe(false);
      expect(f.files.get("new.bean")?.content).toBe("; preserved contents\n");
      expect(f.files.get("main.bean")?.content).toBe('include "new.bean"\n');
      expect(advertised?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
      });
    } finally {
      await f.close();
    }
  });
});
