import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerAccountQueryResolver } from "@/features/ledger/api/resolvers/ledger-account-resolver.query";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { LedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const balance = { USD: "9007199254740993.12", EUR: "-45.60" };
// The same value as a JS number. Written via `Number` rather than as a
// literal because it is deliberately past 2^53 — the point of the fixture is
// that transports do not reformat it — and the summary reports it as a
// number, so the rounding below is the contract, not an accident.
const usd = Number(balance.USD);
// A full daily year proves that transport mappings preserve more than 100 rows.
const series = Array.from({ length: 365 }, (_, day) => ({
  date: new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10),
  balance,
}));
const intervals = series.map((point) => ({
  ...point,
  account_balances: { "Assets:Bank": balance },
}));
const tree = {
  account: "Assets",
  balance,
  balance_children: balance,
  children: [],
  has_txns: true,
  cost: balance,
  cost_children: balance,
};
const fixtures = [
  {
    path: "statements/balance-sheet",
    field: "getLedgerBalanceSheet",
    payload: {
      net_worth_data: series,
      assets_data: series,
      liabilities_data: series,
      equity_data: series,
      assets_hierarchy_data: tree,
      liabilities_hierarchy_data: tree,
      equity_hierarchy_data: tree,
    },
    intervalFields: [] as string[],
  },
  {
    path: "statements/income-statement",
    field: "getLedgerIncomeStatement",
    payload: {
      net_profit_data: series,
      income_data: intervals,
      expenses_data: intervals,
      income_hierarchy_data: tree,
      expenses_hierarchy_data: tree,
    },
    intervalFields: ["income_data", "expenses_data"],
  },
  {
    path: "overview",
    field: "getLedgerOverview",
    payload: {
      net_worth_data: series,
      assets_data: series,
      liabilities_data: series,
      income_data: series,
      expenses_data: series,
      income_interval_data: intervals,
      expenses_interval_data: intervals,
      assets_hierarchy_data: tree,
      liabilities_hierarchy_data: tree,
      income_hierarchy_data: tree,
      expenses_hierarchy_data: tree,
    },
    intervalFields: ["income_interval_data", "expenses_interval_data"],
  },
];
const camel = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
// Only transport field names are mapped; currency and account dictionary keys remain intact.
const normalizeTree = (node: typeof tree) => ({
  account: node.account,
  balance: node.balance,
  balanceChildren: node.balance_children,
  children: [],
  hasTxns: node.has_txns,
  cost: node.cost,
  costChildren: node.cost_children,
});
const params = {
  account: "Expenses:Café",
  filter: "#travel + #work",
  time: "2026",
  conversion: "EUR",
  interval: "quarterly",
};
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture() {
  const check = jest.fn().mockResolvedValue(true);
  const auth = new AuthorizationService({ check }, jest.fn());
  const reports = Object.fromEntries(
    fixtures.map((entry) => [
      entry.field,
      jest.fn().mockResolvedValue(envelope(entry.payload)),
    ]),
  );
  reports.getLedgerAccounts = jest.fn().mockResolvedValue(
    envelope({
      "Assets:Open": { close_date: null },
      "Assets:Closed": { close_date: "2026-01-01" },
    }),
  );
  const document = {
    date: "2026-01-01",
    account: "Assets:Open",
    filename: "receipts/café.pdf",
    tags: ["travel"],
    links: ["receipt-1"],
    meta: { reviewed: true },
  };
  reports.getLedgerDocuments = jest
    .fn()
    .mockResolvedValue(envelope([document]));
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({ reports }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, auth),
    ledgerAccount: new LedgerAccountService(factory as never, auth),
    ledgerData: new LedgerDataService(factory as never, auth),
  };
  resolvers = new Map<unknown, object>([
    [
      LedgerFinanceQueryResolver,
      new LedgerFinanceQueryResolver(services.ledgerFinance),
    ],
    [
      LedgerAccountQueryResolver,
      new LedgerAccountQueryResolver(services.ledgerAccount),
    ],
    [LedgerDataQueryResolver, new LedgerDataQueryResolver(services.ledgerData)],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [
      LedgerFinanceQueryResolver,
      LedgerAccountQueryResolver,
      LedgerDataQueryResolver,
    ],
    container: { get: (ctor) => resolvers.get(ctor) },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
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
  const client = new Client({ name: "statement-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    reports,
    check,
    document,
    rest: (path: string) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/${path}`),
    mcp: async (path: string) => {
      const result = await client.readResource({
        uri: `beancount://alice/main/${path}`,
      });
      const content = result.contents[0];
      if (!("text" in content)) throw new Error("Expected JSON");
      return JSON.parse(content.text);
    },
    gql: (query: string) =>
      graphql({
        schema,
        source: `{ ${query} }`,
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("statement adapter contracts", () => {
  it.each(
    fixtures.flatMap((entry) =>
      [false, true].map((filtered) => ({ ...entry, filtered })),
    ),
  )("preserves $field with filters=$filtered", async (entry) => {
    const f = await fixture();
    try {
      const query = entry.filtered ? params : {};
      // `shape=fava` is the chart payload this test has always pinned; the
      // default is now the agent summary (w2/m28:t002), covered below. It is
      // a REST/MCP switch only — GraphQL keeps the one payload it always had.
      const uri = `${entry.path}?${new URLSearchParams({ ...query, shape: "fava" })}`;
      const response = await f.rest(uri);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(entry.payload);
      expect(await f.mcp(uri)).toEqual(entry.payload);
      const selection = Object.keys(entry.payload)
        .map(
          (key) =>
            `${camel(key)} { ${key.includes("hierarchy") ? "account balance balanceChildren children hasTxns cost costChildren" : `date balance ${entry.intervalFields.includes(key) ? "accountBalances" : ""}`} }`,
        )
        .join(" ");
      const args = Object.entries(query)
        .map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
        .join("");
      const result = await f.gql(
        `${entry.field}(ledgerId: "alice/main"${args}) { ${selection} }`,
      );
      expect(result.errors).toBeUndefined();
      const normalized = Object.fromEntries(
        Object.entries(entry.payload).map(([key, value]) => [
          camel(key),
          key.includes("hierarchy")
            ? normalizeTree(value as typeof tree)
            : (value as typeof intervals).map((point) => ({
                date: point.date,
                balance: point.balance,
                ...(entry.intervalFields.includes(key)
                  ? { accountBalances: point.account_balances }
                  : {}),
              })),
        ]),
      );
      expect(result.data?.[entry.field]).toEqual(normalized);
      const expectedParams = entry.filtered
        ? params
        : { conversion: "USD", interval: "monthly" };
      expect(f.reports[entry.field]).toHaveBeenCalledTimes(3);
      for (const call of f.reports[entry.field].mock.calls)
        expect(call).toEqual(["alice", "main", expectedParams]);
    } finally {
      await f.close();
    }
  });

  /**
   * w2/m28:t002. The audit's agents never used the statements — they
   * recomputed net worth with BQL, because pulling a number out of a chart
   * payload is harder than writing a query. These pin the shape that made
   * them usable and the size that made them affordable.
   */
  describe("the agent summary is what a statement returns by default", () => {
    it("reduces the balance sheet to totals and non-zero accounts", async () => {
      const f = await fixture();
      try {
        const summary = await f.mcp("statements/balance-sheet");
        expect(summary).toEqual({
          asOf: "2026-12-31",
          currency: "USD",
          // One `tree` node stands in for each of the three hierarchies, so
          // each contributes its own balance plus its children's.
          assets: 2 * usd,
          liabilities: 2 * usd,
          equity: 2 * usd,
          netWorth: usd,
          byAccount: [
            { account: "Assets", balance: usd },
            { account: "Assets", balance: usd },
            { account: "Assets", balance: usd },
          ],
        });
        // REST is the same seam, so it answers identically.
        expect(await (await f.rest("statements/balance-sheet")).json()).toEqual(
          summary,
        );
      } finally {
        await f.close();
      }
    });

    it("honours conversion when choosing the currency to report in", async () => {
      const f = await fixture();
      try {
        const summary = await f.mcp(
          "statements/balance-sheet?conversion=EUR",
        );
        expect(summary.currency).toBe("EUR");
        expect(summary.netWorth).toBe(-45.6);
      } finally {
        await f.close();
      }
    });

    it("states income, expenses, and the profit they imply", async () => {
      const f = await fixture();
      try {
        const summary = await f.mcp("statements/income-statement");
        expect(summary.period).toEqual({ from: "2026-01-01", to: "2026-12-31" });
        expect(summary.currency).toBe("USD");
        expect(summary.income).toBe(2 * usd);
        expect(summary.expenses).toBe(2 * usd);
        // Beancount signs income negative, so profit is the negated sum.
        expect(summary.net).toBe(-(summary.income + summary.expenses));
      } finally {
        await f.close();
      }
    });

    it("reduces the overview to the net-worth series", async () => {
      const f = await fixture();
      try {
        const summary = await f.mcp("overview");
        expect(summary.currency).toBe("USD");
        expect(summary.netWorth).toBe(usd);
        expect(summary.series).toHaveLength(365);
        expect(summary.series[0]).toEqual({
          date: "2026-01-01",
          netWorth: usd,
        });
        // The chart payload is still one query away.
        expect(Object.keys(await f.mcp("overview?shape=fava"))).toContain(
          "assets_hierarchy_data",
        );
      } finally {
        await f.close();
      }
    });

    it("is an order of magnitude smaller than the chart payload", async () => {
      const f = await fixture();
      try {
        const summary = JSON.stringify(
          await f.mcp("statements/balance-sheet"),
        ).length;
        const fava = JSON.stringify(
          await f.mcp("statements/balance-sheet?shape=fava"),
        ).length;
        expect(summary).toBeLessThan(fava / 10);
      } finally {
        await f.close();
      }
    });
  });

  it.each([undefined, "open", "closed", "all"])(
    "preserves account status %s",
    async (status) => {
      const f = await fixture();
      try {
        const path = `accounts${status ? `?status=${status}` : ""}`;
        const expected =
          status === "open"
            ? ["Assets:Open"]
            : status === "closed"
              ? ["Assets:Closed"]
              : ["Assets:Open", "Assets:Closed"];
        expect(await (await f.rest(path)).json()).toEqual(expected);
        expect(await f.mcp(path)).toEqual(expected);
        const gql = await f.gql(
          `getLedgerAccounts(ledgerId: "alice/main"${status ? `, status: "${status}"` : ""})`,
        );
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.getLedgerAccounts).toEqual(expected);
      } finally {
        await f.close();
      }
    },
  );

  it("preserves document fields and all filters", async () => {
    const f = await fixture();
    try {
      const query = {
        account: params.account,
        filter: params.filter,
        time: params.time,
      };
      const path = `documents?${new URLSearchParams(query)}`;
      expect(await (await f.rest(path)).json()).toEqual([f.document]);
      expect(await f.mcp(path)).toEqual([f.document]);
      const args = Object.entries(query)
        .map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
        .join("");
      const gql = await f.gql(
        `getLedgerDocuments(ledgerId: "alice/main"${args}) { date account filename tags links meta }`,
      );
      expect(gql.errors).toBeUndefined();
      expect(gql.data?.getLedgerDocuments).toEqual([f.document]);
      for (const call of f.reports.getLedgerDocuments.mock.calls)
        expect(call).toEqual(["alice", "main", query]);
    } finally {
      await f.close();
    }
  });
});

describe("report refusals", () => {
  it.each([
    [
      "statements/income-statement",
      'getLedgerIncomeStatement(ledgerId: "alice/main") { netProfitData { date balance } }',
    ],
    [
      "statements/balance-sheet",
      'getLedgerBalanceSheet(ledgerId: "alice/main") { assetsData { date balance } }',
    ],
    [
      "overview",
      'getLedgerOverview(ledgerId: "alice/main") { assetsData { date balance } }',
    ],
    ["documents", 'getLedgerDocuments(ledgerId: "alice/main") { filename }'],
    ["accounts", 'getLedgerAccounts(ledgerId: "alice/main")'],
  ])("refuses revoked access to %s before reading", async (path, query) => {
    const f = await fixture();
    f.check.mockResolvedValue(false);
    try {
      expect((await f.rest(path)).status).toBe(403);
      await expect(f.mcp(path)).rejects.toThrow();
      expect((await f.gql(query)).errors).toHaveLength(1);
      for (const call of Object.values(f.reports))
        expect(call).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
