import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerDataMutationResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.mutation";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { ForbiddenError } from "@/shared/errors";
import { AuthorizationService } from "@/server/api/authorization";
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

let currentResolvers: Map<unknown, unknown>;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerDataQueryResolver, LedgerDataMutationResolver],
    container: { get: (cls) => currentResolvers.get(cls) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

const REFRESHED = [{ ...STATUS[0], revision: "e2", freshness: "recent" }];

async function fixture(
  options: {
    deny?: boolean | string;
    caller?: Identity;
    /** Use the real PDP (relationships always hold) instead of the fake. */
    realPdp?: boolean;
  } = {},
) {
  const caller = options.caller ?? reader;
  const reports = {
    getLedgerManagedPrices: jest.fn(async () => ({
      data: { success: true, data: STATUS },
    })),
    refreshLedgerManagedPrices: jest.fn(async () => ({
      data: { success: true, data: REFRESHED },
    })),
  };
  // `deny: true` refuses everything; a string refuses only that action.
  const authorizeOrThrow = jest.fn(async ({ action }: { action: string }) => {
    if (options.deny === true || options.deny === action)
      throw new ForbiddenError("You do not have access to this ledger");
  });
  const authorization = options.realPdp
    ? new AuthorizationService({ check: async () => true })
    : { authorizeOrThrow };
  const service = new LedgerDataService(
    { getPublicApiClient: async () => ({ reports }) } as never,
    authorization as never,
  );
  currentResolvers = new Map<unknown, unknown>([
    [LedgerDataQueryResolver, new LedgerDataQueryResolver(service)],
    [LedgerDataMutationResolver, new LedgerDataMutationResolver(service)],
  ]);
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
    setAnonymous: () => rest.setIdentity(undefined),
    restUrl: (segment: string) =>
      `${rest.url}/api-gateway/v1/ledgers/alice/main/${segment}`,
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
    refreshRest: () =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/managed-prices/refresh`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      ),
    refreshGql: () =>
      graphql({
        schema,
        source: `mutation { refreshLedgerManagedPrices(ledgerId: "${LEDGER}") { ${FIELDS} } }`,
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
      }),
    refreshMcp: () =>
      client.callTool({ name: "refreshManagedPrices", arguments: {} }),
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

describe("managed price refresh parity", () => {
  const writer: Identity = { ...reader, scopes: new Set(["ledger.write"]) };

  it("refreshes through the same service call on REST, GraphQL and MCP", async () => {
    const f = await fixture({ caller: writer });
    try {
      const r = await f.refreshRest();
      const g = await f.refreshGql();
      const m = (await f.refreshMcp()) as {
        isError?: boolean;
        structuredContent?: { ok: boolean; result: { sources: unknown } };
      };
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      expect(m.isError).toBeFalsy();
      for (const result of [
        await r.json(),
        g.data!.refreshLedgerManagedPrices,
        m.structuredContent!.result.sources,
      ])
        expect(result).toEqual(REFRESHED);
      expect(f.reports.refreshLedgerManagedPrices).toHaveBeenCalledTimes(3);
      expect(f.reports.refreshLedgerManagedPrices).toHaveBeenCalledWith(
        "alice",
        "main",
      );
      const actions = (
        f.authorizeOrThrow.mock.calls as unknown as [{ action: string }][]
      ).map(([request]) => request.action);
      expect(actions).toEqual([
        "ledger.entries.write",
        "ledger.entries.write",
        "ledger.entries.write",
      ]);
    } finally {
      await f.close();
    }
  });

  it("refuses a caller who can read but not write, before any ledger call", async () => {
    const f = await fixture({ caller: writer, deny: "ledger.entries.write" });
    try {
      // The same caller can still read the status…
      expect((await f.rest()).status).toBe(200);
      // …but every surface refuses the refresh.
      expect((await f.refreshRest()).status).toBe(403);
      const g = await f.refreshGql();
      expect(g.errors?.[0]?.message).toMatch(/do not have access/i);
      const m = (await f.refreshMcp()) as { isError?: boolean };
      expect(m.isError).toBe(true);
      expect(f.reports.refreshLedgerManagedPrices).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each([
    ["an OAuth token without ledger.write", reader],
    [
      "an API key granted only ledger.read",
      { ...reader, method: "apikey" as const },
    ],
  ])(
    "the real PDP refuses %s on every surface, before any ledger call",
    async (_label, caller) => {
      const f = await fixture({ caller: caller as Identity, realPdp: true });
      try {
        expect((await f.refreshRest()).status).toBe(403);
        expect((await f.refreshGql()).errors).toBeDefined();
        const m = (await f.refreshMcp()) as { isError?: boolean };
        expect(m.isError).toBe(true);
        expect(f.reports.refreshLedgerManagedPrices).not.toHaveBeenCalled();
        // The same credential still reads the status.
        expect((await f.rest()).status).toBe(200);
      } finally {
        await f.close();
      }
    },
  );

  it("the real PDP admits a credential that carries ledger.write", async () => {
    const f = await fixture({ caller: writer, realPdp: true });
    try {
      expect((await f.refreshRest()).status).toBe(200);
      expect(f.reports.refreshLedgerManagedPrices).toHaveBeenCalledTimes(1);
    } finally {
      await f.close();
    }
  });
});

describe("managed prices for an anonymous caller", () => {
  it("treats the status read like other vocabulary reads and refuses the refresh", async () => {
    // The real PDP, so the anonymous principal is judged by the catalog.
    const f = await fixture({ realPdp: true });
    try {
      f.setAnonymous();
      // v1 REST requires an identity for every vocabulary read; the status
      // read answers an anonymous caller exactly as `errors` does.
      expect((await f.rest()).status).toBe(
        (await fetch(f.restUrl("errors"))).status,
      );
      expect([401, 403]).toContain((await f.refreshRest()).status);
      const g = await graphql({
        schema,
        source: `mutation { refreshLedgerManagedPrices(ledgerId: "${LEDGER}") { url } }`,
        contextValue: {
          identity: undefined,
          getCurrentIdentity: () => {
            throw new Error("Authentication required");
          },
        },
      });
      expect(g.errors).toBeDefined();
      expect(f.reports.refreshLedgerManagedPrices).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
