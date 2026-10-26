import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerJournalQueryResolver } from "../../../resolvers/ledger-journal-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { FavaApiError } from "@/foundation/fava";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
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

/**
 * w21/443: an entry a plugin generated shares its source's text and checksum,
 * so its context names the source on every surface. A client that edits or
 * deletes "the copy" changes the source and every other copy.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: "alice/main",
};

const SLICE = '2026-06-01 * "QA Insurer" "car insurance"\n';
const contexts: Record<string, { generated_from?: string | null }> = {
  copy: { generated_from: "template-hash" },
  own: { generated_from: null },
  older: {},
};

let resolver: LedgerJournalQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerJournalQueryResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerJournalQueryResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const journal = {
    getContext: jest.fn(async (_owner: string, _name: string, hash: string) => {
      // The ledger service's own answer for a hash it cannot resolve.
      if (!(hash in contexts)) {
        const error = `Entry with ID '${hash}' not found`;
        throw new FavaApiError(error, 404, { success: false, error } as never);
      }
      return envelope({
        entry: {},
        sha256sum: "sha",
        slice: SLICE,
        managed_source: null,
        ...contexts[hash],
      });
    }),
  };
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: "read" }),
        },
        journal,
      },
    }),
    getPublicApiClient: async () => ({ journal }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: identity.userId, ledger_username: "alice" }),
    },
  };
  const service = new LedgerJournalService(
    fava as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerJournalQueryResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerJournal: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { ledgerJournal: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "entry-context-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    generatedFrom: async (surface: string, entryHash: string) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-context?entryHash=${entryHash}`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        return (body.data ?? body).generated_from;
      }
      if (surface === "gql") {
        const response = await graphql({
          schema,
          source: `query { getLedgerEntryContext(ledgerId:"alice/main",entryHash:"${entryHash}") { generated_from slice } }`,
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(response.errors).toBeUndefined();
        return (
          response.data as {
            getLedgerEntryContext: { generated_from: string | null };
          }
        ).getLedgerEntryContext.generated_from;
      }
      const response = await client.callTool({
        name: "getEntryContext",
        arguments: { entryHash },
      });
      expect(response.isError).toBeFalsy();
      const content = response.structuredContent as {
        result?: { generated_from?: string | null };
      };
      return content.result?.generated_from;
    },
    /** The snake spelling of `generatedFrom`, one key renamed per surface. */
    generatedFromSnake: async (surface: string, entryHash: string) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-context?entry_hash=${entryHash}`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        return (body.data ?? body).generated_from;
      }
      if (surface === "gql") {
        const response = await graphql({
          schema,
          source: `query { getLedgerEntryContext(ledgerId:"alice/main",entry_hash:"${entryHash}") { generated_from slice } }`,
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(response.errors).toBeUndefined();
        return (
          response.data as {
            getLedgerEntryContext: { generated_from: string | null };
          }
        ).getLedgerEntryContext.generated_from;
      }
      const response = await client.callTool({
        name: "getEntryContext",
        arguments: { entry_hash: entryHash },
      });
      expect(response.isError).toBeFalsy();
      const content = response.structuredContent as {
        result?: { generated_from?: string | null };
      };
      return content.result?.generated_from;
    },
    /** Each surface's refusal message for an entry hash. */
    refusal: async (surface: string, entryHash: string) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-context?entryHash=${entryHash}`,
        );
        expect(response.status).toBe(404);
        return ((await response.json()) as { error: { message: string } }).error
          .message;
      }
      if (surface === "gql") {
        const response = await graphql({
          schema,
          source: `query { getLedgerEntryContext(ledgerId:"alice/main",entryHash:"${entryHash}") { slice } }`,
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        return response.errors?.[0]?.message;
      }
      const response = await client.callTool({
        name: "getEntryContext",
        arguments: { entryHash },
      });
      expect(response.isError).toBe(true);
      const { error } = response.structuredContent as {
        error: { code: string; message: string; hint: string };
      };
      expect(error.code).toBe("NOT_FOUND");
      expect(error.hint).toContain("listLedgerEntries");
      return error.message;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["rest", "gql", "mcp"])("entry context via %s", (surface) => {
  it("names the entry a copy was generated from, null otherwise", async () => {
    const f = await fixture();
    try {
      expect(await f.generatedFrom(surface, "copy")).toBe("template-hash");
      expect(await f.generatedFrom(surface, "own")).toBeNull();
      // An older ledger service omits the field: read as "not a copy".
      expect(await f.generatedFrom(surface, "older")).toBeNull();
    } finally {
      await f.close();
    }
  });

  // w23/047: a stale hash read "Ledger resource not found", as if the ledger
  // itself were gone.
  it("names the entry a stale hash no longer resolves to", async () => {
    const f = await fixture();
    try {
      expect(await f.refusal(surface, "stale")).toBe(
        "Entry with ID 'stale' not found",
      );
    } finally {
      await f.close();
    }
  });

  // w23/m3/t001: the note's repro — the `entry_hash` spelling list output
  // uses works where `entryHash` did. (The MCP resource twin shares the
  // REST query schema and fetch, so it inherits the alias.)
  it("accepts the entry_hash spelling list output uses", async () => {
    const f = await fixture();
    try {
      expect(await f.generatedFromSnake(surface, "copy")).toBe(
        "template-hash",
      );
    } finally {
      await f.close();
    }
  });
});
