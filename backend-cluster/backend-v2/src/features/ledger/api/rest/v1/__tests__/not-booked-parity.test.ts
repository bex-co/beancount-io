import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerJournalQueryResolver } from "../../../resolvers/ledger-journal-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
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
 * w21/678: a transaction the engine could not book is listed so it can be
 * opened and fixed, and says so with `not_booked: true` on its entry, on every
 * surface, so no client counts it in a balance. A booked transaction carries no
 * such field.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: "alice/main",
};

const entries: Record<string, Record<string, unknown>> = {
  broken: {
    directive_type: "Transaction",
    narration: "QA Sell",
    not_booked: true,
  },
  fine: { directive_type: "Transaction", narration: "QA Buy" },
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
    getContext: jest.fn(async (_owner: string, _name: string, hash: string) =>
      envelope({
        entry: entries[hash],
        sha256sum: "sha",
        slice: "",
        managed_source: null,
      }),
    ),
    getJournal: jest.fn(async () =>
      envelope({
        items: Object.values(entries),
        total: 2,
        is_empty: false,
      }),
    ),
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
  const client = new Client({ name: "not-booked-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    /** The `not_booked` of the entry an entry-context read returns. */
    notBooked: async (surface: string, entryHash: string) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-context?entryHash=${entryHash}`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        return (body.data ?? body).entry.not_booked;
      }
      if (surface === "gql") {
        const response = await graphql({
          schema,
          source: `query { getLedgerEntryContext(ledgerId:"alice/main",entryHash:"${entryHash}") { entry } }`,
          contextValue: { identity, getCurrentIdentity: () => identity },
        });
        expect(response.errors).toBeUndefined();
        return (
          response.data as {
            getLedgerEntryContext: { entry: { not_booked?: boolean } };
          }
        ).getLedgerEntryContext.entry.not_booked;
      }
      const response = await client.callTool({
        name: "getEntryContext",
        arguments: { entryHash },
      });
      expect(response.isError).toBeFalsy();
      const content = response.structuredContent as {
        result?: { entry?: { not_booked?: boolean } };
      };
      return content.result?.entry?.not_booked;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["rest", "gql", "mcp"])("entry context via %s", (surface) => {
  it("flags a transaction that failed booking, and only that one", async () => {
    const f = await fixture();
    try {
      expect(await f.notBooked(surface, "broken")).toBe(true);
      expect(await f.notBooked(surface, "fine")).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});
