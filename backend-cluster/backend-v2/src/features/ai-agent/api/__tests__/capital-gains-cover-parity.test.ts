import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn().mockResolvedValue({}),
}));

/**
 * w1/307. The hosted capital-gains report read only negative postings, so
 * a short opening was listed as a two-unit sale at zero gain and the cover
 * that realized 20 USD was never read. `bea report capital-gains` reports
 * the cover alone (w5/1035); every hosted surface now does too. The stub
 * answers the journal with the rows the ledger produced for the repro: a
 * NONE-booked account opens `-2 HOOL {100 USD} @ 100 USD`, then covers one
 * unit at 80 USD. Its `time` read keeps only the cover, as `2026-01-05`'s
 * window does, so the lot it closes opened before the window.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const envelope = (data: unknown) => ({ data: { success: true, data } });
const lot = { number: "100", currency: "USD", date: "2026-01-02", label: null };
const leg = (account: string, number: string, currency: string) => ({
  account,
  units: { number, currency },
  cost: null,
  price: null,
  meta: null,
  flag: null,
});
const transaction = (
  entry_hash: string,
  date: string,
  narration: string,
  postings: unknown[],
) => ({
  entry_hash,
  directive_type: "Transaction",
  date,
  meta: null,
  flag: "*",
  payee: null,
  narration,
  postings,
  tags: [],
  links: [],
});
const cover = transaction("864bbced", "2026-01-05", "Cover one", [
  {
    ...leg("Assets:Broker", "1", "HOOL"),
    cost: lot,
    price: { number: "80", currency: "USD" },
  },
  leg("Assets:Cash", "-80", "USD"),
  leg("Income:Gains", "-20", "USD"),
]);
const openShort = transaction("44ff72a9", "2026-01-02", "Open short", [
  {
    ...leg("Assets:Broker", "-2", "HOOL"),
    cost: lot,
    price: { number: "100", currency: "USD" },
  },
  leg("Assets:Cash", "200", "USD"),
]);

async function fixture() {
  const getJournal = jest.fn(
    async (_owner: string, _name: string, query: { time?: string }) => {
      // Newest first, as the ledger's journal answers.
      const items =
        query.time === undefined
          ? [cover, openShort]
          : query.time === "2026-01-05"
            ? [cover]
            : [];
      return envelope({ items, total: items.length, is_empty: !items.length });
    },
  );
  const reports = {
    getLedgerOptions: async () =>
      envelope({
        operating_currency: ["USD"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
  };
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports,
      journal: { getJournal },
    }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, {} as never),
  };
  const resolver = new LedgerFinanceQueryResolver(services.ledgerFinance);
  const schema = await buildSchema({
    resolvers: [LedgerFinanceQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { identity: pinnedReadToken, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "capital-gains-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** Each surface's rows and totals for one query, GraphQL's renamed back. */
  const gains = async (query: Record<string, string>) => {
    const search = new URLSearchParams(query);
    const suffix = search.size ? `?${search}` : "";
    const response = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/alice/main/capital-gains${suffix}`,
    );
    expect(response.status).toBe(200);
    const viaRest = await response.json();
    const resource = await client.readResource({
      uri: `beancount://alice/main/capital-gains${suffix}`,
    });
    const content = resource.contents[0]!;
    if (!("text" in content)) throw new Error("Expected JSON");
    const viaMcp = JSON.parse(content.text);
    const args = Object.entries(query)
      .map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
      .join("");
    const gql = await graphql({
      schema,
      source: `{ getLedgerCapitalGains(ledgerId: "alice/main"${args}) { rows { account commodity acquired sold heldDays longHeld quantity { number currency } proceeds { number currency } basis { number currency } gain { number currency } } totals } }`,
      contextValue: { identity: pinnedReadToken },
    });
    expect(gql.errors).toBeUndefined();
    const { rows, totals } = (
      gql.data as {
        getLedgerCapitalGains: {
          rows: (Record<string, unknown> & {
            heldDays: unknown;
            longHeld: unknown;
          })[];
          totals: unknown;
        };
      }
    ).getLedgerCapitalGains;
    const viaGraphql = {
      rows: rows.map(({ heldDays, longHeld, ...row }) => ({
        ...row,
        held_days: heldDays,
        long_held: longHeld,
      })),
      totals,
    };
    return { rest: viaRest, mcp: viaMcp, graphql: viaGraphql };
  };

  return {
    gains,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const COVER_ROW = {
  account: "Assets:Broker",
  commodity: "HOOL",
  acquired: "2026-01-02",
  sold: "2026-01-05",
  held_days: 3,
  long_held: false,
  quantity: { number: "1", currency: "HOOL" },
  proceeds: { number: "100", currency: "USD" },
  basis: { number: "80", currency: "USD" },
  gain: { number: "20", currency: "USD" },
};

describe("capital gains on a short position", () => {
  // One schema per suite: type-graphql's metadata is process-wide.
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => {
    f = await fixture();
  });
  afterAll(async () => {
    await f.close();
  });

  it.each([
    ["the whole ledger", {}],
    ["a window after the short opened", { time: "2026-01-05" }],
    ["the cover's own day", { fromDate: "2026-01-05", toDate: "2026-01-05" }],
  ])(
    "report only the cover's 20 USD on REST, MCP and GraphQL for %s",
    async (_, query: Record<string, string>) => {
      const expected = {
        rows: [COVER_ROW],
        totals: {
          one_year_or_less: { USD: "20" },
          more_than_one_year: {},
          holding_unknown: {},
        },
      };
      const surfaces = await f.gains(query);
      expect(surfaces.rest).toEqual(expected);
      expect(surfaces.mcp).toEqual(expected);
      expect(surfaces.graphql).toEqual(expected);
    },
  );

  it("realize nothing on any surface while the short only opens", async () => {
    const empty = {
      rows: [],
      totals: {
        one_year_or_less: {},
        more_than_one_year: {},
        holding_unknown: {},
      },
    };
    const surfaces = await f.gains({ toDate: "2026-01-04" });
    expect(surfaces.rest).toEqual(empty);
    expect(surfaces.mcp).toEqual(empty);
    expect(surfaces.graphql).toEqual(empty);
  });
});
