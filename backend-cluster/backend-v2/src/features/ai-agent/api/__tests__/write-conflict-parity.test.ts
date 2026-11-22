import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { FavaApiError, FILE_EXISTS_HINT } from "@/foundation/fava";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/032. The ledger service now answers a stale sha and a create over an
 * existing file with 409, as it already did for a lost ref race; every
 * surface must carry that as CONFLICT rather than the caller's bad input.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const STALE =
  "the ledger changed under a concurrent write; re-read it and retry";
const TAKEN =
  "qa.bean already exists; update it with its sha, or choose another path";
const conflict = (message: string) =>
  new FavaApiError(message, 409, {
    success: false,
    error: message,
    code: null,
    details: null,
  } as never);

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

/**
 * `present` puts qa.bean in the ledger before the call, so a create meets
 * the pre-check; otherwise it lands only as the commit is sent, the way a
 * concurrent create of the same path wins the race (w31/008).
 */
async function fixture(answer: string, { present = false } = {}) {
  const changeLedgerFiles = jest.fn(async () => {
    throw conflict(answer);
  });
  const createLedgerFile = jest.fn(async () => {
    throw conflict(answer);
  });
  const updateLedgerFile = jest.fn(async () => {
    throw conflict(answer);
  });
  const deleteLedgerFile = jest.fn(async () => {
    throw conflict(answer);
  });
  const factory = {
    getPublicApiClient: async () => ({
      // The file-write gate projects bean-check over the new contents.
      reports: {
        checkProjectedErrors: async () => ({
          data: { success: true, data: [] },
        }),
      },
      ledgers: {
        changeLedgerFiles,
        createLedgerFile,
        updateLedgerFile,
        deleteLedgerFile,
        // The stale case loses the race after the preview's own sha check
        // (w1/219) passed: the file was still at `old` when it was read.
        getLedgerFilesContent: async () => ({
          data: {
            success: true,
            data:
              answer === STALE || present
                ? [{ path: "qa.bean", type: "file", sha: "old", content: "" }]
                : [],
          },
        }),
        getLedgerDirContent: async () => ({
          data: { success: true, data: [] },
        }),
      },
    }),
  };
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const services = {
    ledgerRepo: new LedgerRepoService(factory as never, authorization),
  };
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
  mutationResolver = new LedgerMutationResolver(workflow);
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "write-conflict", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    changeLedgerFiles,
    workflow,
    put: (body: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/files/qa.bean`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    /** A create of qa.bean, refused, as each surface reports the refusal. */
    refusedCreate: async (surface: Surface): Promise<Refusal> => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/files/qa.bean`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content: "; qa\n" }),
          },
        );
        expect(response.status).toBe(409);
        const { error } = await response.json();
        return {
          code: error.code,
          message: error.message,
          hint: error.metadata?.hint,
        };
      }
      if (surface === "gql") {
        const result = await graphql({
          schema,
          source:
            'mutation { createLedgerFile(ledgerId:"alice/main",path:"qa.bean",content:"OyBxYQo=") { path } }',
          contextValue: {
            identity,
            getCurrentIdentity: () => identity,
            platform: "web",
          },
        });
        const [error] = result.errors ?? [];
        const wire = formatError(error.toJSON(), error);
        return {
          code: wire.extensions?.code as string,
          message: wire.message,
          hint: wire.extensions?.hint as string | undefined,
        };
      }
      const result = await client.callTool({
        name: "createLedgerFiles",
        arguments: {
          description: "add qa",
          files: [{ path: "qa.bean", content: "; qa\n" }],
        },
      });
      expect(result.isError).toBe(true);
      const { error } = result.structuredContent as { error: Refusal };
      return { code: error.code, message: error.message, hint: error.hint };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("a write the ledger answers with 409", () => {
  it("is 409 CONFLICT on a REST PUT with a stale sha", async () => {
    const f = await fixture(STALE);
    try {
      const response = await f.put({ content: "; qa\n", sha: "old" });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { code: "CONFLICT", message: expect.stringContaining(STALE) },
      });
    } finally {
      await f.close();
    }
  });

  it("is a ConflictError on GraphQL's updateLedgerFile", async () => {
    const f = await fixture(STALE);
    try {
      await expect(
        f.workflow.updateLedgerFile({
          identity,
          ledgerId: "alice/main",
          input: { path: "qa.bean", content: "OyBxYQo=", sha: "old" },
          platform: "web",
        }),
      ).rejects.toMatchObject({ category: "CONFLICT" });
    } finally {
      await f.close();
    }
  });

  // w21/550: the ledger service's single-file delete answered a stale sha with
  // 400 (Gitea 1.24), which GraphQL read as BAD_USER_INPUT while REST and MCP,
  // through /change-files, said CONFLICT. The service now answers 409 for it
  // (its own error-middleware test pins that); GraphQL carries it as CONFLICT.
  it("is a ConflictError on GraphQL's deleteLedgerFile", async () => {
    const f = await fixture(STALE);
    try {
      await expect(
        f.workflow.deleteLedgerFile({
          identity,
          ledgerId: "alice/main",
          input: { path: "qa.bean", sha: "old", message: "delete qa" },
        }),
      ).rejects.toMatchObject({ category: "CONFLICT" });
    } finally {
      await f.close();
    }
  });
});

type Surface = "rest" | "gql" | "mcp";
type Refusal = { code: string; message: string; hint?: string };
const SURFACES: Surface[] = ["mcp", "rest", "gql"];

// w31/008: the race's loser passes the pre-check, and the ledger refuses its
// commit with TAKEN. That carried the CONFLICT fallback about an entry's
// `sha256sum` on MCP and no hint on REST or GraphQL.
describe("a create that loses a race to a create of the same path", () => {
  it.each(SURFACES)(
    "is CONFLICT with the file-exists hint via %s",
    async (surface) => {
      const f = await fixture(TAKEN);
      try {
        const refusal = await f.refusedCreate(surface);
        expect(refusal).toEqual({
          code: "CONFLICT",
          message: expect.stringMatching(
            /(^|: )File conflict: qa\.bean already exists$/,
          ),
          hint: FILE_EXISTS_HINT,
        });
        expect(refusal.hint).not.toMatch(/sha256sum|getEntryContext/);
      } finally {
        await f.close();
      }
    },
  );

  // GraphQL has no pre-check: every create over a file reaches the commit.
  it.each(["mcp", "rest"] as Surface[])(
    "reads exactly as a create over a file already there via %s",
    async (surface) => {
      const raced = await fixture(TAKEN);
      const sequential = await fixture(TAKEN, { present: true });
      try {
        const lost = await raced.refusedCreate(surface);
        expect(await sequential.refusedCreate(surface)).toEqual(lost);
        // The sequential one never reached the commit.
        expect(sequential.changeLedgerFiles).not.toHaveBeenCalled();
        expect(raced.changeLedgerFiles).toHaveBeenCalled();
      } finally {
        await raced.close();
        await sequential.close();
      }
    },
  );
});
