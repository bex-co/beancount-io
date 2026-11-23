import "reflect-metadata";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { FavaApiError } from "@/foundation/fava";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

/**
 * w31/066: explicit blob `sha` values on file writes and deletes must be
 * validated upfront as 40- or 64-character lowercase hex Git blob SHAs
 * across MCP, REST, and GraphQL — never dropping an optimistic lock on REST
 * DELETE with `sha: ""`, never flipping REST PUT with `sha: ""` into create,
 * and never hitting Gitea to return a misleading CONFLICT.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const writerIdentity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const readOnlyIdentity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: "alice/main",
};

const sha1Of = (text: string) => createHash("sha1").update(text).digest("hex");
const sha256Of = (text: string) =>
  createHash("sha256").update(text).digest("hex");

const MALFORMED_SHAS = [
  ["empty string", ""],
  ["blank spaces", "   "],
  ["non-hex string", "not-a-sha"],
  ["uppercase 40-hex", "A".repeat(40)],
  ["uppercase 64-hex", "F".repeat(64)],
  ["32-hex entry hash", "a".repeat(32)],
] as const;

let mutationResolver: LedgerMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;

beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver
          ? mutationResolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

type Surface = "rest" | "gql" | "mcp";

async function fixture(opts?: {
  caller?: Identity;
  useSha256?: boolean;
  includeProbeFromMain?: boolean;
}) {
  const caller = opts?.caller ?? writerIdentity;
  const hashFn = opts?.useSha256 ? sha256Of : sha1Of;
  const files = new Map<string, { content: string; sha: string }>([
    [
      "main.bean",
      {
        content: opts?.includeProbeFromMain
          ? 'include "qa-probe.bean"\n'
          : "; main\n",
        sha: hashFn(
          opts?.includeProbeFromMain ? 'include "qa-probe.bean"\n' : "; main\n",
        ),
      },
    ],
    [
      "qa-probe.bean",
      {
        content: "; probe\n",
        sha: hashFn("; probe\n"),
      },
    ],
  ]);

  const giteaCalls = {
    getPublicApiClient: 0,
    reads: 0,
    commits: 0,
  };

  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const conflict = (path: string) =>
    new FavaApiError(
      `the ledger changed under a concurrent write (${path})`,
      409,
      {
        success: false,
        error: "the ledger changed under a concurrent write",
        code: null,
        details: null,
      } as never,
    );

  const toPublic = (path: string) => {
    const file = files.get(path);
    if (!file) return null;
    return {
      name: path.split("/").pop(),
      path,
      type: "file",
      sha: file.sha,
      content: Buffer.from(file.content, "utf8").toString("base64"),
      encoding: "base64",
      size: Buffer.byteLength(file.content, "utf8"),
    };
  };

  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: "write" }),
        },
      },
    }),
    getPublicApiClient: async () => {
      giteaCalls.getPublicApiClient += 1;
      return {
        reports: {
          checkProjectedErrors: async () => envelope([]),
          getProjectedSourceFiles: async () => envelope([...files.keys()]),
          getLedgerSourceFiles: async () => envelope([...files.keys()]),
        },
        ledgers: {
          getLedgerDirContent: async () => {
            giteaCalls.reads += 1;
            return envelope(
              [...files.keys()].map((path) => ({
                path,
                name: path,
                type: "file",
                sha: files.get(path)!.sha,
              })),
            );
          },
          getLedgerFilesContent: async (
            _owner: string,
            _name: string,
            body: { files: string[] },
          ) => {
            giteaCalls.reads += 1;
            return envelope(body.files.map(toPublic).filter(Boolean));
          },
          changeLedgerFiles: async (
            _owner: string,
            _name: string,
            body: {
              files: {
                operation: string;
                path: string;
                content?: string | null;
                sha?: string | null;
              }[];
            },
          ) => {
            giteaCalls.commits += 1;
            for (const op of body.files) {
              const current = files.get(op.path);
              if (op.operation === "create") {
                if (current) throw conflict(op.path);
                const text = Buffer.from(op.content ?? "", "base64").toString(
                  "utf8",
                );
                files.set(op.path, { content: text, sha: hashFn(text) });
              } else if (op.operation === "update") {
                if (!current) throw new FavaApiError("Not Found", 404);
                if (op.sha !== undefined && op.sha !== current.sha)
                  throw conflict(op.path);
                const text = Buffer.from(op.content ?? "", "base64").toString(
                  "utf8",
                );
                files.set(op.path, { content: text, sha: hashFn(text) });
              } else if (op.operation === "delete") {
                if (!current) throw new FavaApiError("Not Found", 404);
                if (op.sha !== undefined && op.sha !== current.sha)
                  throw conflict(op.path);
                files.delete(op.path);
              }
            }
            return envelope({ commit: "1".repeat(40) });
          },
          updateLedgerFile: async (
            _owner: string,
            _name: string,
            options: { path: string; content: string; sha: string },
          ) => {
            giteaCalls.commits += 1;
            const current = files.get(options.path);
            if (!current) throw new FavaApiError("Not Found", 404);
            if (options.sha !== current.sha) throw conflict(options.path);
            const text = Buffer.from(options.content, "base64").toString(
              "utf8",
            );
            files.set(options.path, { content: text, sha: hashFn(text) });
            return envelope(toPublic(options.path));
          },
          deleteLedgerFile: async (
            _owner: string,
            _name: string,
            options: { path: string; sha: string },
          ) => {
            giteaCalls.commits += 1;
            const current = files.get(options.path);
            if (!current) throw new FavaApiError("Not Found", 404);
            if (options.sha !== current.sha) throw conflict(options.path);
            files.delete(options.path);
            return envelope({ commit: "1".repeat(40) });
          },
        },
      };
    },
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
    getErrors: async () => [],
    getSourceFiles: async () => [...files.keys()],
  };
  const ledgerRepo = new LedgerRepoService(fava as never, authorization);
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  mutationResolver = new LedgerMutationResolver(workflow);

  const rest = await startV1TestServer(
    {
      services: { ledgerRepo, ledgerData },
      workflows: { ledger: workflow },
    } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(caller);

  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
      services: { ledgerRepo, ledgerData },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "file-blob-sha-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  return {
    files,
    giteaCalls,
    restPut: async (
      path: string,
      body: { content: string; sha?: string; dryRun?: boolean },
    ) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "qa", ...body }),
        },
      );
      return { status: response.status, body: (await response.json()) as any };
    },
    restDelete: async (
      path: string,
      body: { sha?: string; dryRun?: boolean; removeIncludes?: boolean } = {},
    ) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/files/${path}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "qa", ...body }),
        },
      );
      return { status: response.status, body: (await response.json()) as any };
    },
    mcpUpdate: async (
      path: string,
      opts: { content: string; sha?: string; dry_run?: boolean },
    ) => {
      const file: Record<string, unknown> = { path, content: opts.content };
      if (opts.sha !== undefined) file.sha = opts.sha;
      const result = await client.callTool({
        name: "updateLedgerFiles",
        arguments: {
          description: "qa",
          dry_run: opts.dry_run ?? false,
          files: [file],
        },
      });
      return {
        ok: !result.isError,
        structured: result.structuredContent as any,
      };
    },
    mcpDelete: async (
      path: string,
      opts: { sha?: string; dry_run?: boolean; remove_includes?: boolean } = {},
    ) => {
      const file: Record<string, unknown> = { path };
      if (opts.sha !== undefined) file.sha = opts.sha;
      const result = await client.callTool({
        name: "deleteLedgerFiles",
        arguments: {
          description: "qa",
          dry_run: opts.dry_run ?? false,
          ...(opts.remove_includes ? { remove_includes: true } : {}),
          files: [file],
        },
      });
      return {
        ok: !result.isError,
        structured: result.structuredContent as any,
      };
    },
    gqlUpdate: async (path: string, content: string, sha: string) => {
      const response = await graphql({
        schema,
        source:
          'mutation($path:String!,$content:String!,$sha:String!) { updateLedgerFile(ledgerId:"alice/main",path:$path,content:$content,sha:$sha,message:"qa") { path sha } }',
        variableValues: {
          path,
          content: Buffer.from(content, "utf8").toString("base64"),
          sha,
        },
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform: "web",
        },
      });
      const error = response.errors?.[0];
      return {
        ok: !error,
        data: response.data?.updateLedgerFile,
        error: error ? formatError(error.toJSON(), error) : undefined,
      };
    },
    gqlDelete: async (path: string, sha: string, removeIncludes = false) => {
      const response = await graphql({
        schema,
        source:
          'mutation($path:String!,$sha:String!,$removeIncludes:Boolean) { deleteLedgerFile(ledgerId:"alice/main",path:$path,sha:$sha,message:"qa",removeIncludes:$removeIncludes) { path } }',
        variableValues: { path, sha, removeIncludes },
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform: "web",
        },
      });
      const error = response.errors?.[0];
      return {
        ok: !error,
        data: response.data?.deleteLedgerFile,
        error: error ? formatError(error.toJSON(), error) : undefined,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("blob sha validation across REST, GraphQL, and MCP (w31/066)", () => {
  describe.each<Surface>(["rest", "gql", "mcp"])(
    "malformed sha via %s",
    (surface) => {
      it.each(MALFORMED_SHAS)(
        "refuses %s (%j) on update and delete with BAD_USER_INPUT without calling Gitea",
        async (_label, badSha) => {
          const f = await fixture();
          try {
            if (surface === "rest") {
              for (const dryRun of [true, false]) {
                const putRes = await f.restPut("qa-probe.bean", {
                  content: "; updated\n",
                  sha: badSha,
                  dryRun,
                });
                expect(putRes.status).toBe(400);
                expect(putRes.body).toMatchObject({
                  ok: false,
                  error: {
                    code: "BAD_USER_INPUT",
                    metadata: {
                      field: "sha",
                      hint: expect.stringContaining("readLedgerFiles"),
                    },
                  },
                });

                const delRes = await f.restDelete("qa-probe.bean", {
                  sha: badSha,
                  dryRun,
                });
                expect(delRes.status).toBe(400);
                expect(delRes.body).toMatchObject({
                  ok: false,
                  error: {
                    code: "BAD_USER_INPUT",
                    metadata: {
                      field: "sha",
                      hint: expect.stringContaining("readLedgerFiles"),
                    },
                  },
                });
              }
            } else if (surface === "mcp") {
              for (const dry_run of [true, false]) {
                const upd = await f.mcpUpdate("qa-probe.bean", {
                  content: "; updated\n",
                  sha: badSha,
                  dry_run,
                });
                expect(upd.ok).toBe(false);
                expect(upd.structured).toMatchObject({
                  error: {
                    code: "BAD_USER_INPUT",
                    message: expect.stringContaining(
                      "40- or 64-character lowercase hex",
                    ),
                    hint: expect.stringContaining("readLedgerFiles"),
                  },
                });

                const del = await f.mcpDelete("qa-probe.bean", {
                  sha: badSha,
                  dry_run,
                });
                expect(del.ok).toBe(false);
                expect(del.structured).toMatchObject({
                  error: {
                    code: "BAD_USER_INPUT",
                    message: expect.stringContaining(
                      "40- or 64-character lowercase hex",
                    ),
                    hint: expect.stringContaining("readLedgerFiles"),
                  },
                });
              }
            } else {
              const upd = await f.gqlUpdate(
                "qa-probe.bean",
                "; updated\n",
                badSha,
              );
              expect(upd.ok).toBe(false);
              expect(upd.error?.extensions).toMatchObject({
                code: "BAD_USER_INPUT",
                field: "sha",
                hint: expect.stringContaining("readLedgerFiles"),
              });

              const del = await f.gqlDelete("qa-probe.bean", badSha);
              expect(del.ok).toBe(false);
              expect(del.error?.extensions).toMatchObject({
                code: "BAD_USER_INPUT",
                field: "sha",
                hint: expect.stringContaining("readLedgerFiles"),
              });
            }

            expect(f.giteaCalls.getPublicApiClient).toBe(0);
            expect(f.giteaCalls.reads).toBe(0);
            expect(f.giteaCalls.commits).toBe(0);
            expect(f.files.get("qa-probe.bean")?.content).toBe("; probe\n");
          } finally {
            await f.close();
          }
        },
      );
    },
  );

  describe("REST empty sha regressions", () => {
    it("REST PUT with sha: '' refuses 400 BAD_USER_INPUT on both existing and nonexistent paths without creating", async () => {
      const f = await fixture();
      try {
        for (const dryRun of [true, false]) {
          for (const path of ["qa-ghost.bean", "qa-probe.bean"]) {
            const res = await f.restPut(path, {
              content: "; ghost\n",
              sha: "",
              dryRun,
            });
            expect(res.status).toBe(400);
            expect(res.body).toMatchObject({
              ok: false,
              error: {
                code: "BAD_USER_INPUT",
                metadata: { field: "sha" },
              },
            });
          }
        }
        expect(f.files.has("qa-ghost.bean")).toBe(false);
        expect(f.files.get("qa-probe.bean")?.content).toBe("; probe\n");
        expect(f.giteaCalls.getPublicApiClient).toBe(0);
        expect(f.giteaCalls.commits).toBe(0);
      } finally {
        await f.close();
      }
    });

    it("REST DELETE with sha: '' refuses 400 BAD_USER_INPUT and never drops the optimistic lock or deletes", async () => {
      for (const includeProbeFromMain of [false, true]) {
        const f = await fixture({ includeProbeFromMain });
        try {
          for (const removeIncludes of [false, true]) {
            for (const dryRun of [true, false]) {
              const res = await f.restDelete("qa-probe.bean", {
                sha: "",
                dryRun,
                removeIncludes,
              });
              expect(res.status).toBe(400);
              expect(res.body).toMatchObject({
                ok: false,
                error: {
                  code: "BAD_USER_INPUT",
                  metadata: { field: "sha" },
                },
              });
            }
          }
          expect(f.files.has("qa-probe.bean")).toBe(true);
          expect(f.giteaCalls.getPublicApiClient).toBe(0);
          expect(f.giteaCalls.commits).toBe(0);
        } finally {
          await f.close();
        }
      }
    });
  });

  describe("valid mismatched sha still answers CONFLICT across all three surfaces", () => {
    it.each([
      ["40-hex", "0".repeat(40)],
      ["64-hex", "0".repeat(64)],
    ])(
      "returns CONFLICT for mismatched %s sha on update and delete",
      async (_label, staleSha) => {
        const f = await fixture();
        try {
          for (const dryRun of [true, false]) {
            const putRes = await f.restPut("qa-probe.bean", {
              content: "; x\n",
              sha: staleSha,
              dryRun,
            });
            expect(putRes.status).toBe(409);
            expect(putRes.body.error.code).toBe("CONFLICT");

            const delRes = await f.restDelete("qa-probe.bean", {
              sha: staleSha,
              dryRun,
            });
            expect(delRes.status).toBe(409);
            expect(delRes.body.error.code).toBe("CONFLICT");

            const mcpUpd = await f.mcpUpdate("qa-probe.bean", {
              content: "; x\n",
              sha: staleSha,
              dry_run: dryRun,
            });
            expect(mcpUpd.ok).toBe(false);
            expect(mcpUpd.structured.error.code).toBe("CONFLICT");

            const mcpDel = await f.mcpDelete("qa-probe.bean", {
              sha: staleSha,
              dry_run: dryRun,
            });
            expect(mcpDel.ok).toBe(false);
            expect(mcpDel.structured.error.code).toBe("CONFLICT");
          }

          const gqlUpd = await f.gqlUpdate("qa-probe.bean", "; x\n", staleSha);
          expect(gqlUpd.ok).toBe(false);
          expect(gqlUpd.error?.extensions?.code).toBe("CONFLICT");

          const gqlDel = await f.gqlDelete("qa-probe.bean", staleSha);
          expect(gqlDel.ok).toBe(false);
          expect(gqlDel.error?.extensions?.code).toBe("CONFLICT");

          expect(f.files.get("qa-probe.bean")?.content).toBe("; probe\n");
        } finally {
          await f.close();
        }
      },
    );
  });

  describe("matching sha and omitted sha preserve documented behavior", () => {
    it.each([false, true])(
      "accepts matching blob sha (sha256=%s) across REST, GraphQL, and MCP",
      async (useSha256) => {
        const f = await fixture({ useSha256 });
        try {
          const sha1 = f.files.get("qa-probe.bean")!.sha;
          const restRes = await f.restPut("qa-probe.bean", {
            content: "; v2\n",
            sha: sha1,
          });
          expect(restRes.status).toBe(200);

          const sha2 = f.files.get("qa-probe.bean")!.sha;
          const mcpRes = await f.mcpUpdate("qa-probe.bean", {
            content: "; v3\n",
            sha: sha2,
          });
          expect(mcpRes.ok).toBe(true);

          const sha3 = f.files.get("qa-probe.bean")!.sha;
          const gqlRes = await f.gqlUpdate("qa-probe.bean", "; v4\n", sha3);
          expect(gqlRes.ok).toBe(true);

          const sha4 = f.files.get("qa-probe.bean")!.sha;
          const gqlDel = await f.gqlDelete("qa-probe.bean", sha4);
          expect(gqlDel.ok).toBe(true);
          expect(f.files.has("qa-probe.bean")).toBe(false);
        } finally {
          await f.close();
        }
      },
    );

    it("omitted sha creates on REST PUT and allows unlocked update/delete on MCP and REST DELETE", async () => {
      const f = await fixture();
      try {
        // REST PUT without sha creates new file
        const created = await f.restPut("qa-created.bean", {
          content: "; new\n",
        });
        expect(created.status).toBe(200);
        expect(f.files.get("qa-created.bean")?.content).toBe("; new\n");

        // MCP replace without sha succeeds
        const mcpUpdated = await f.mcpUpdate("qa-created.bean", {
          content: "; replaced\n",
        });
        expect(mcpUpdated.ok).toBe(true);
        expect(f.files.get("qa-created.bean")?.content).toBe("; replaced\n");

        // REST DELETE without sha succeeds
        const restDeleted = await f.restDelete("qa-created.bean");
        expect(restDeleted.status).toBe(200);
        expect(f.files.has("qa-created.bean")).toBe(false);

        // MCP delete without sha succeeds
        const mcpDeleted = await f.mcpDelete("qa-probe.bean");
        expect(mcpDeleted.ok).toBe(true);
        expect(f.files.has("qa-probe.bean")).toBe(false);
      } finally {
        await f.close();
      }
    });
  });

  describe("authorization precedence", () => {
    it("still refuses a read-only token with FORBIDDEN ahead of sha format validation on REST, GraphQL, and MCP", async () => {
      const f = await fixture({ caller: readOnlyIdentity });
      try {
        const restPut = await f.restPut("qa-probe.bean", {
          content: "; x\n",
          sha: "",
        });
        expect(restPut.status).toBe(403);
        expect(restPut.body.error.code).toBe("FORBIDDEN");

        const restDel = await f.restDelete("qa-probe.bean", {
          sha: "not-a-sha",
          removeIncludes: true,
        });
        expect(restDel.status).toBe(403);
        expect(restDel.body.error.code).toBe("FORBIDDEN");

        const mcpUpd = await f.mcpUpdate("qa-probe.bean", {
          content: "; x\n",
          sha: "",
        });
        expect(mcpUpd.ok).toBe(false);
        expect(mcpUpd.structured.error.code).toBe("FORBIDDEN");

        const mcpDel = await f.mcpDelete("qa-probe.bean", {
          sha: "not-a-sha",
        });
        expect(mcpDel.ok).toBe(false);
        expect(mcpDel.structured.error.code).toBe("FORBIDDEN");

        const gqlUpd = await f.gqlUpdate("qa-probe.bean", "; x\n", "");
        expect(gqlUpd.ok).toBe(false);
        expect(gqlUpd.error?.extensions?.code).toBe("FORBIDDEN");

        const gqlDel = await f.gqlDelete("qa-probe.bean", "not-a-sha");
        expect(gqlDel.ok).toBe(false);
        expect(gqlDel.error?.extensions?.code).toBe("FORBIDDEN");

        expect(f.giteaCalls.getPublicApiClient).toBe(0);
      } finally {
        await f.close();
      }
    });
  });
});
