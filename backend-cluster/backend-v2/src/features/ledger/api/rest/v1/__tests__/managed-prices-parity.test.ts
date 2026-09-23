import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { ForbiddenError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

/**
 * w2/m32 — managed price status (ADR 015 §8) on REST, GraphQL and MCP.
 *
 * One real `LedgerDataService` behind all three adapters; only the ledger
 * service's HTTP client and the PDP are fakes, so the comparison covers each
 * adapter's own mapping rather than three mocks agreeing with each other.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";
const reader: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  ledgerScope: LEDGER,
};
const STATUS = [
  {
    url: "https://beancount.io/prices/BTC-USD",
    alias: "BTC-USD",
    includedFrom: [
      {
        file: "main.bean",
        line: 3,
        target: "https://beancount.io/prices/BTC-USD",
      },
    ],
    commodity: "BTC",
    quote: "USD",
    source: "coinbase",
    revision: "e1",
    etag: '"e1"',
    observedAt: "2026-09-15T08:25:00.000Z",
    fetchedAt: "2026-09-15T08:26:00.000Z",
    nextRefreshAt: "2026-09-15T08:31:00.000Z",
    freshness: "stale",
    error: null,
    shadowedCount: 1,
  },
];
const FIELDS =
  "url alias includedFrom { file line target } commodity quote source revision etag observedAt fetchedAt nextRefreshAt freshness error shadowedCount";

let currentResolver: LedgerDataQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerDataQueryResolver],
    container: { get: () => currentResolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(options: { deny?: boolean; caller?: Identity } = {}) {
  const caller = options.caller ?? reader;
  const reports = {
    getLedgerManagedPrices: jest.fn(async () => ({
      data: { success: true, data: STATUS },
    })),
  };
  const authorizeOrThrow = jest.fn(async () => {
    if (options.deny)
      throw new ForbiddenError("You do not have access to this ledger");
  });
  const service = new LedgerDataService(
    { getPublicApiClient: async () => ({ reports }) } as never,
    { authorizeOrThrow } as never,
  );
  currentResolver = new LedgerDataQueryResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerData: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      services: { ledgerData: service },
      identity: caller,
      ledgerId: LEDGER,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "managed-prices-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    reports,
    authorizeOrThrow,
    rest: () =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/managed-prices`),
    gql: () =>
      graphql({
        schema,
        source: `{ getLedgerManagedPrices(ledgerId: "${LEDGER}") { ${FIELDS} } }`,
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
      }),
    mcp: () =>
      client.readResource({ uri: "beancount://alice/main/managed-prices" }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("managed price status parity", () => {
  it("returns the same records on REST, GraphQL and MCP", async () => {
    const f = await fixture();
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.mcp();
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      const content = m.contents[0];
      if (!content || !("text" in content)) throw new Error("expected text");
      for (const result of [
        await r.json(),
        g.data!.getLedgerManagedPrices,
        JSON.parse(content.text),
      ])
        expect(result).toEqual(STATUS);
      expect(f.reports.getLedgerManagedPrices).toHaveBeenCalledTimes(3);
      expect(f.reports.getLedgerManagedPrices).toHaveBeenCalledWith(
        "alice",
        "main",
      );
      for (const [request] of f.authorizeOrThrow.mock.calls as unknown as [
        { action: string },
      ][])
        expect(request.action).toBe("ledger.reports.read");
    } finally {
      await f.close();
    }
  });

  it("refuses a caller the PDP denies on every surface, before any ledger call", async () => {
    const f = await fixture({ deny: true });
    try {
      const r = await f.rest();
      const g = await f.gql();
      expect(r.status).toBe(403);
      expect(g.errors?.[0]?.message).toMatch(/do not have access/i);
      await expect(f.mcp()).rejects.toThrow(/do not have access/i);
      expect(f.reports.getLedgerManagedPrices).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("is discoverable as a resource template, not a tool", async () => {
    const server = assembleMcpRegistry(
      {
        services: {},
        identity: reader,
        ledgerId: LEDGER,
      } as unknown as McpRequestContext,
      config,
    );
    const client = new Client({ name: "list", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    try {
      await Promise.all([client.connect(a), server.connect(b)]);
      const { resourceTemplates } = await client.listResourceTemplates();
      const template = resourceTemplates.find(
        (t) => t.name === "ledgerManagedPrices",
      );
      expect(template?.uriTemplate).toBe(
        "beancount://{owner}/{name}/managed-prices",
      );
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).not.toContain("ledgerManagedPrices");
    } finally {
      await client.close();
      await server.close();
    }
  });
});
