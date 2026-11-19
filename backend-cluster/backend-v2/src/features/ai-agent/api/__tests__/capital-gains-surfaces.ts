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

/**
 * The hosted capital-gains report on all three surfaces — REST, the MCP
 * `capital-gains` resource and GraphQL — over one stubbed ledger journal,
 * so a parity test compares what each one answers for the same query.
 * The caller mocks `authorizeLedger`, as every parity suite does.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const envelope = (data: unknown) => ({ data: { success: true, data } });

const GAINS_SELECTION = `rows { account commodity acquired sold heldDays longHeld quantity { number currency } proceeds { number currency } basis { number currency } gain { number currency } } totals unpricedReductions { date entryHash account commodity acquired quantity { number currency } cost { number currency } }`;

/** A journal transaction as the ledger's journal answers it. */
export const transaction = (
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

/** A posting with no cost and no price; spread it to add either. */
export const leg = (account: string, number: string, currency: string) => ({
  account,
  units: { number, currency },
  cost: null,
  price: null,
  meta: null,
  flag: null,
});

type GraphqlGains = {
  rows: (Record<string, unknown> & { heldDays: unknown; longHeld: unknown })[];
  totals: unknown;
  unpricedReductions: (Record<string, unknown> & { entryHash: unknown })[];
};

/**
 * `journal` answers one journal read, newest first: `time` is the read's
 * time filter, undefined for the whole ledger.
 */
export async function capitalGainsSurfaces(
  journal: (time: string | undefined) => unknown[],
) {
  const getJournal = jest.fn(
    async (_owner: string, _name: string, query: { time?: string }) => {
      const items = journal(query.time);
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

  /** Each surface's answer for one query, GraphQL's renamed back. */
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
      source: `{ getLedgerCapitalGains(ledgerId: "alice/main"${args}) { ${GAINS_SELECTION} } }`,
      contextValue: { identity: pinnedReadToken },
    });
    expect(gql.errors).toBeUndefined();
    const { rows, totals, unpricedReductions } = (
      gql.data as { getLedgerCapitalGains: GraphqlGains }
    ).getLedgerCapitalGains;
    const viaGraphql = {
      rows: rows.map(({ heldDays, longHeld, ...row }) => ({
        ...row,
        held_days: heldDays,
        long_held: longHeld,
      })),
      totals,
      unpriced_reductions: unpricedReductions.map(({ entryHash, ...item }) => ({
        ...item,
        entry_hash: entryHash,
      })),
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
