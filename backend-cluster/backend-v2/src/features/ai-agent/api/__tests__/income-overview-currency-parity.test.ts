import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import {
  pinnedReadToken,
  startV1TestServer,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type {
  IncomeStatementDataPublic,
  OverviewPublic,
  SerializableTreeNodePublic,
} from "@/foundation/fava";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const date = "2026-02-28";
const scope = {
  time: "2026-02",
  filter: 'invoice:"2026-002"',
  interval: "monthly",
};
const conversions = [undefined, "units", "at_cost", "at_value", "EUR"];
const families = ["income", "overview"] as const;
// An explicit EUR nothing carries leaves the MUSD unconverted, and says so.
const unconverted = (conversion: string | undefined) =>
  conversion === "EUR"
    ? { missingPrices: [{ from: "MUSD", to: "EUR" }] }
    : {};
type Family = (typeof families)[number];

function payloads(income?: number, expenses?: number) {
  const balance = (value?: number): Record<string, string> =>
    value === undefined ? {} : { MUSD: String(value) };
  const point = (value?: number) => ({ date, balance: balance(value) });
  const hierarchy = (
    account: string,
    child: string,
    value?: number,
  ): SerializableTreeNodePublic => ({
    account,
    balance: {},
    balance_children: balance(value),
    has_txns: false,
    children:
      value === undefined
        ? []
        : [
            {
              account: child,
              balance: balance(value),
              balance_children: {},
              children: [],
              has_txns: true,
            },
          ],
  });
  const interval = (account: string, value?: number) => ({
    ...point(value),
    account_balances: value === undefined ? {} : { [account]: balance(value) },
  });
  const profit = income === undefined ? undefined : -(income + expenses!);
  const statement: IncomeStatementDataPublic = {
    net_profit_data: [point(profit === undefined ? undefined : -profit)],
    income_data: [interval("Income:Consulting", income)],
    expenses_data: [interval("Expenses:BadDebt", expenses)],
    income_hierarchy_data: hierarchy("Income", "Income:Consulting", income),
    expenses_hierarchy_data: hierarchy(
      "Expenses",
      "Expenses:BadDebt",
      expenses,
    ),
  };
  const overview: OverviewPublic = {
    net_worth_data: [point(profit)],
    assets_data: [point(income === undefined ? undefined : -income)],
    liabilities_data: [point(expenses === undefined ? undefined : -expenses)],
    assets_hierarchy_data: hierarchy(
      "Assets",
      "Assets:Bank",
      income === undefined ? undefined : -income,
    ),
    liabilities_hierarchy_data: hierarchy(
      "Liabilities",
      "Liabilities:Card",
      expenses === undefined ? undefined : -expenses,
    ),
    income_data: [point(income)],
    expenses_data: [point(expenses)],
    income_interval_data: statement.income_data,
    expenses_interval_data: statement.expenses_data,
    income_hierarchy_data: statement.income_hierarchy_data,
    expenses_hierarchy_data: statement.expenses_hierarchy_data,
  };
  return { income: statement, overview };
}

let resolver: LedgerFinanceQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(raw = payloads()) {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const reports = {
    income: jest
      .fn()
      .mockResolvedValue({ data: { success: true, data: raw.income } }),
    overview: jest
      .fn()
      .mockResolvedValue({ data: { success: true, data: raw.overview } }),
  };
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports: {
        getLedgerIncomeStatement: reports.income,
        getLedgerOverview: reports.overview,
      },
    }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, authorization),
  };
  resolver = new LedgerFinanceQueryResolver(services.ledgerFinance);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerFinanceQueryResolver],
    container: { get: () => resolver },
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
  const client = new Client({
    name: "income-overview-currency-parity",
    version: "1",
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const query = (conversion?: string, shape?: string) => ({
    ...scope,
    ...(conversion === undefined ? {} : { conversion }),
    ...(shape === undefined ? {} : { shape }),
  });
  return {
    check,
    reports,
    read: async (family: Family, conversion?: string, shape?: string) => {
      const path = `${family === "income" ? "statements/income-statement" : "overview"}?${new URLSearchParams(query(conversion, shape))}`;
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${path}`,
      );
      expect(response.status).toBe(200);
      const uri = `beancount://alice/main/${path}`;
      const { contents } = await client.readResource({ uri });
      expect(contents).toHaveLength(1);
      const content = contents[0];
      expect(content).toMatchObject({ uri, mimeType: "application/json" });
      if (!("text" in content)) throw new Error("Expected JSON resource");
      const mcp = JSON.parse(content.text);
      expect(await response.json()).toEqual(mcp);
      return mcp;
    },
    gql: (conversion: string) =>
      graphql({
        schema,
        source: `query($time: String, $filter: String, $interval: String, $conversion: String) {
        income: getLedgerIncomeStatement(ledgerId: "alice/main", time: $time, filter: $filter, interval: $interval, conversion: $conversion) {
          netProfitData { date balance }
          incomeData { date balance accountBalances }
          expensesData { date balance accountBalances }
          incomeHierarchyData { account balance balanceChildren children }
          expensesHierarchyData { account balance balanceChildren children }
        }
        overview: getLedgerOverview(ledgerId: "alice/main", time: $time, filter: $filter, interval: $interval, conversion: $conversion) {
          netWorthData { date balance }
          assetsData { date balance }
          liabilitiesData { date balance }
          incomeData { date balance }
          expensesData { date balance }
          incomeIntervalData { date balance accountBalances }
          expensesIntervalData { date balance accountBalances }
          assetsHierarchyData { account balance balanceChildren }
          liabilitiesHierarchyData { account balance balanceChildren }
        }
      }`,
        variableValues: query(conversion),
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(families)("empty %s currency labels", (family) => {
  it.each(conversions)(
    "uses a currency for conversion=%s through REST and MCP",
    async (conversion) => {
      const f = await fixture();
      try {
        const currency = conversion === "EUR" ? "EUR" : "USD";
        expect(await f.read(family, conversion)).toEqual(
          family === "income"
            ? {
                period: { from: null, to: date, time: scope.time },
                currency,
                income: 0,
                expenses: 0,
                net: 0,
                byAccount: [],
              }
            : {
                currency,
                netWorth: 0,
                series: [{ date, netWorth: 0 }],
              },
        );
        expect(f.reports[family].mock.calls).toEqual(
          Array.from({ length: 2 }, () => [
            "alice",
            "main",
            { ...scope, ...(conversion === undefined ? {} : { conversion }) },
          ]),
        );
        expect(f.check).toHaveBeenCalledTimes(2);
      } finally {
        await f.close();
      }
    },
  );
});

describe("observed income and overview currency controls", () => {
  it.each([
    {
      name: "profit",
      income: -4000,
      expenses: 0,
      net: 4000,
      byAccount: [{ account: "Income:Consulting", balance: -4000 }],
    },
    {
      name: "loss",
      income: 0,
      expenses: 3200,
      net: -3200,
      byAccount: [{ account: "Expenses:BadDebt", balance: 3200 }],
    },
    {
      name: "zero net with two signed accounts",
      income: -1000,
      expenses: 1000,
      net: 0,
      byAccount: [
        { account: "Income:Consulting", balance: -1000 },
        { account: "Expenses:BadDebt", balance: 1000 },
      ],
    },
  ])(
    "retains MUSD and $name when the conversion has no currency evidence",
    async ({ income, expenses, net, byAccount }) => {
      const f = await fixture(payloads(income, expenses));
      try {
        for (const conversion of conversions) {
          expect(await f.read("income", conversion)).toEqual({
            period: { from: null, to: date, time: scope.time },
            currency: "MUSD",
            income,
            expenses,
            net,
            ...unconverted(conversion),
            byAccount,
          });
          expect(await f.read("overview", conversion)).toEqual({
            currency: "MUSD",
            netWorth: net,
            ...unconverted(conversion),
            series: [{ date, netWorth: net }],
          });
          for (const report of Object.values(f.reports)) {
            expect(report).toHaveBeenLastCalledWith("alice", "main", {
              ...scope,
              ...(conversion === undefined ? {} : { conversion }),
            });
          }
        }
        expect(f.check).toHaveBeenCalledTimes(20);
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    { name: "empty maps", raw: payloads() },
    {
      name: "zero-valued MUSD with nonzero accounts",
      raw: payloads(-1000, 1000),
    },
  ])(
    "preserves $name in raw REST/MCP and GraphQL mappings",
    async ({ raw }) => {
      const f = await fixture(raw);
      try {
        for (const family of families) {
          expect(await f.read(family, "at_cost", "fava")).toEqual(raw[family]);
        }
        const gql = await f.gql("at_cost");
        expect(gql.errors).toBeUndefined();
        const intervals = (points: IncomeStatementDataPublic["income_data"]) =>
          points.map(({ account_balances, ...point }) => ({
            ...point,
            accountBalances: account_balances,
          }));
        const hierarchy = (node: SerializableTreeNodePublic) => ({
          account: node.account,
          balance: node.balance,
          balanceChildren: node.balance_children,
        });
        expect(gql.data).toMatchObject({
          income: {
            netProfitData: raw.income.net_profit_data,
            incomeData: intervals(raw.income.income_data),
            expensesData: intervals(raw.income.expenses_data),
            incomeHierarchyData: hierarchy(raw.income.income_hierarchy_data),
            expensesHierarchyData: hierarchy(
              raw.income.expenses_hierarchy_data,
            ),
          },
          overview: {
            netWorthData: raw.overview.net_worth_data,
            assetsData: raw.overview.assets_data,
            liabilitiesData: raw.overview.liabilities_data,
            incomeData: raw.overview.income_data,
            expensesData: raw.overview.expenses_data,
            incomeIntervalData: intervals(raw.overview.income_interval_data),
            expensesIntervalData: intervals(
              raw.overview.expenses_interval_data,
            ),
            assetsHierarchyData: hierarchy(raw.overview.assets_hierarchy_data),
            liabilitiesHierarchyData: hierarchy(
              raw.overview.liabilities_hierarchy_data,
            ),
          },
        });
        const income = gql.data!.income as {
          incomeHierarchyData: { children: unknown[] };
          expensesHierarchyData: { children: unknown[] };
        };
        for (const [actual, node] of [
          [income.incomeHierarchyData, raw.income.income_hierarchy_data],
          [income.expensesHierarchyData, raw.income.expenses_hierarchy_data],
        ] as const) {
          expect(actual.children).toEqual(
            node.children.map((child) => ({
              ...hierarchy(child),
              children: [],
              hasTxns: child.has_txns,
            })),
          );
        }
        for (const report of Object.values(f.reports)) {
          expect(report.mock.calls).toEqual(
            Array.from({ length: 3 }, () => [
              "alice",
              "main",
              { ...scope, conversion: "at_cost" },
            ]),
          );
        }
        expect(f.check).toHaveBeenCalledTimes(6);
      } finally {
        await f.close();
      }
    },
  );
});
