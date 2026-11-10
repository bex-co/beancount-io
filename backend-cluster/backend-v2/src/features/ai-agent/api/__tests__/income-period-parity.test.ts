import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w6/005. The income-statement summary called August's results August 31's,
 * because it read the first chart point's date as the statement's start — and
 * the ledger dates every chart point by its bucket's inclusive **end**. The
 * same selection then reported a different start under `interval=daily`.
 *
 * The fake ledger below dates its buckets exactly the way the producer does,
 * so each selection reads through REST and MCP with both groupings.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (
    let day = new Date(`${from}T00:00:00Z`);
    day.toISOString().slice(0, 10) <= to;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    out.push(day.toISOString().slice(0, 10));
  return out;
}

const monthEnds = (year: number, months: number[]) =>
  months.map((month) =>
    new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  );

interface Selection {
  name: string;
  time?: string;
  /** Bucket end dates the ledger reports for each grouping. */
  monthly: string[];
  daily: string[];
  empty?: boolean;
}

const selections: Selection[] = [
  {
    name: "a full month",
    time: "2026-08",
    monthly: ["2026-08-31"],
    daily: days("2026-08-01", "2026-08-31"),
  },
  {
    name: "a year",
    time: "2026",
    monthly: monthEnds(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    daily: days("2026-01-01", "2026-12-31"),
  },
  {
    // Subtracting a month from the first bucket's end would be wrong here too.
    name: "a partial range",
    time: "2026-08-15 - 2026-08-31",
    monthly: ["2026-08-31"],
    daily: days("2026-08-15", "2026-08-31"),
  },
  {
    name: "a single day",
    time: "2026-08-03",
    monthly: ["2026-08-03"],
    daily: ["2026-08-03"],
  },
  {
    // No activity does not turn a selected month into a single day.
    name: "an empty period",
    time: "2026-11",
    monthly: ["2026-11-30"],
    daily: days("2026-11-01", "2026-11-30"),
    empty: true,
  },
  {
    // Resolved by the ledger against its own clock; the gateway cannot know
    // which month this names, so it repeats the selection instead.
    name: "an unresolved relative selection",
    time: "month",
    monthly: ["2026-10-31"],
    daily: days("2026-10-01", "2026-10-31"),
  },
  {
    name: "the whole history",
    monthly: ["2026-08-31", "2026-09-30"],
    daily: days("2026-08-01", "2026-09-12"),
  },
];

const tree = (
  account: string,
  children: { account: string; usd: string }[],
  total: string | null,
) => ({
  account,
  balance: {},
  balance_children: total === null ? {} : { USD: total },
  children: children.map((child) => ({
    account: child.account,
    balance: { USD: child.usd },
    balance_children: {},
    children: [],
    has_txns: true,
  })),
  has_txns: children.length > 0,
});

function statement(dates: string[], empty = false) {
  // Every bucket but the first is empty, which is what a selection whose
  // activity falls in its first days looks like under either grouping.
  const point = (date: string, index: number) => ({
    date,
    balance: !empty && index === 0 ? { USD: "-75" } : {},
  });
  return {
    net_profit_data: dates.map(point),
    income_data: dates.map((date, index) => ({
      ...point(date, index),
      account_balances: {},
    })),
    expenses_data: dates.map((date, index) => ({
      ...point(date, index),
      account_balances: {},
    })),
    income_hierarchy_data: empty
      ? tree("Income", [], null)
      : tree("Income", [{ account: "Income:Salary", usd: "-100" }], "-100"),
    expenses_hierarchy_data: empty
      ? tree("Expenses", [], null)
      : tree("Expenses", [{ account: "Expenses:Rent", usd: "25" }], "25"),
  };
}

let resolver: LedgerFinanceQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(selection: Selection) {
  const check = jest.fn().mockResolvedValue(true);
  const auth = new AuthorizationService({ check }, jest.fn());
  const getLedgerIncomeStatement = jest
    .fn()
    .mockImplementation(
      (_owner: string, _name: string, query: { interval?: string }) =>
        Promise.resolve({
          data: {
            success: true,
            data: statement(
              query.interval === "daily" ? selection.daily : selection.monthly,
              selection.empty,
            ),
          },
        }),
    );
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      // The summaries' headline currency defers to these (w1/216).
      reports: {
        getLedgerIncomeStatement,
        getLedgerOptions: async () => ({
          data: { success: true, data: { operating_currency: [] } },
        }),
      },
    }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(
      factory as unknown as IFavaClientFactory,
      auth,
    ),
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
  const client = new Client({ name: "income-period-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const path = (query: Record<string, string>) =>
    `statements/income-statement?${new URLSearchParams({
      ...(selection.time === undefined ? {} : { time: selection.time }),
      ...query,
    })}`;
  return {
    getLedgerIncomeStatement,
    rest: async (query: Record<string, string>) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${path(query)}`,
      );
      expect(response.status).toBe(200);
      return response.json();
    },
    mcp: async (query: Record<string, string>) => {
      const result = await client.readResource({
        uri: `beancount://alice/main/${path(query)}`,
      });
      const content = result.contents[0];
      expect(content.mimeType).toBe("application/json");
      if (!("text" in content)) throw new Error("Expected JSON resource");
      return JSON.parse(content.text);
    },
    gql: (interval: string) =>
      graphql({
        schema,
        source: `query($time: String, $interval: String) {
          getLedgerIncomeStatement(ledgerId: "alice/main", time: $time, interval: $interval) {
            netProfitData { date balance }
          }
        }`,
        variableValues: { time: selection.time, interval },
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("income-statement summary period (w6/005)", () => {
  it.each(selections)(
    "never calls a bucket's end the start of $name",
    async (selection) => {
      const f = await fixture(selection);
      try {
        const summaries: Record<string, unknown> = {};
        for (const interval of ["monthly", "daily"] as const) {
          const summary = await f.mcp({ interval });
          // REST is the same seam, so it answers identically.
          expect(await f.rest({ interval })).toEqual(summary);
          expect(summary.period).toEqual({
            from: null,
            to: selection[interval].at(-1),
            time: selection.time ?? null,
          });
          summaries[interval] = summary;
        }
        // Changing only the chart grouping changes no number the summary
        // reports, and no longer moves its start either.
        const { period: monthly, ...monthlyTotals } = summaries.monthly as {
          period: { from: unknown };
        };
        const { period: daily, ...dailyTotals } = summaries.daily as {
          period: { from: unknown };
        };
        expect(monthly.from).toBe(daily.from);
        expect(monthlyTotals).toEqual(dailyTotals);
        expect(monthlyTotals).toEqual(
          selection.empty
            ? {
                currency: "USD",
                income: 0,
                expenses: 0,
                net: 0,
                byAccount: [],
              }
            : {
                currency: "USD",
                income: -100,
                expenses: 25,
                net: 75,
                byAccount: [
                  { account: "Income:Salary", balance: -100 },
                  { account: "Expenses:Rent", balance: 25 },
                ],
              },
        );
      } finally {
        await f.close();
      }
    },
  );

  it.each(selections)(
    "keeps the raw and GraphQL bucket dates for $name",
    async (selection) => {
      const f = await fixture(selection);
      try {
        for (const interval of ["monthly", "daily"] as const) {
          const expected = statement(selection[interval], selection.empty);
          const raw = await f.mcp({ interval, shape: "fava" });
          expect(raw).toEqual(expected);
          expect(await f.rest({ interval, shape: "fava" })).toEqual(expected);
          const gql = await f.gql(interval);
          expect(gql.errors).toBeUndefined();
          expect(
            (
              gql.data?.getLedgerIncomeStatement as {
                netProfitData: unknown[];
              }
            ).netProfitData,
          ).toEqual(expected.net_profit_data);
        }
        // Every adapter forwarded the selection unchanged.
        for (const [, , query] of f.getLedgerIncomeStatement.mock.calls)
          expect(query.time).toBe(selection.time);
      } finally {
        await f.close();
      }
    },
  );
});
