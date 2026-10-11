import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
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

type Intervals = Awaited<ReturnType<LedgerDataService["getIntervalTotals"]>>;
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const march = "2026-03-31";
const params = {
  accountName: "Assets:Bank",
  time: "2026-03",
  interval: "monthly",
  conversion: "units",
};
const transfer: Intervals = [
  {
    date: march,
    balance: {},
    account_balances: {
      "Assets:Bank:Checking": { USD: "-500" },
      "Assets:Bank:Savings": { USD: "500" },
      "Assets:Bank:Unused": { USD: "0" },
    },
  },
];
const transferSummary = {
  period: march,
  total: 0,
  byAccount: [
    { account: "Assets:Bank:Checking", balance: -500 },
    { account: "Assets:Bank:Savings", balance: 500 },
  ],
};
let resolver: LedgerDataQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(data: Intervals, wide: Intervals = data) {
  const check = jest.fn().mockResolvedValue(true);
  const auth = new AuthorizationService({ check }, jest.fn());
  const getLedgerIntervalTotals = jest
    .fn()
    .mockImplementation(
      (_owner: string, _name: string, query: { time?: string }) =>
        Promise.resolve({
          data: { success: true, data: query.time === "2026" ? wide : data },
        }),
    );
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports: { getLedgerIntervalTotals },
    }),
  };
  const services = {
    ledgerData: new LedgerDataService(
      factory as unknown as IFavaClientFactory,
      auth,
    ),
  };
  resolver = new LedgerDataQueryResolver(services.ledgerData);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerDataQueryResolver],
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
  const client = new Client({ name: "interval-summary-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const path = (query: Record<string, string>) =>
    `interval-totals?${new URLSearchParams(query)}`;
  return {
    check,
    factory,
    getLedgerIntervalTotals,
    rest: (query: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/${path(query)}`),
    mcp: async (query: Record<string, string>) => {
      const result = await client.readResource({
        uri: `beancount://alice/main/${path(query)}`,
      });
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0];
      expect(content.mimeType).toBe("application/json");
      if (!("text" in content)) throw new Error("Expected JSON resource");
      return JSON.parse(content.text);
    },
    gql: (query: Record<string, string>) =>
      graphql({
        schema,
        source: `query($accountName: String!, $time: String!, $conversion: String!, $interval: String!) {
          getLedgerIntervalTotals(ledgerId: "alice/main", accountName: $accountName, time: $time, conversion: $conversion, interval: $interval) {
            date balance accountBalances
          }
        }`,
        variableValues: query,
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

async function expectSummary(
  f: Awaited<ReturnType<typeof fixture>>,
  query: Record<string, string>,
  expected: unknown,
) {
  const response = await f.rest(query);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expected);
  expect(await f.mcp(query)).toEqual(expected);
}

async function expectRaw(
  f: Awaited<ReturnType<typeof fixture>>,
  query: Record<string, string>,
  expected: Intervals,
) {
  const response = await f.rest({ ...query, shape: "fava" });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expected);
  expect(await f.mcp({ ...query, shape: "fava" })).toEqual(expected);
  const gql = await f.gql(query);
  expect(gql.errors).toBeUndefined();
  expect(gql.data?.getLedgerIntervalTotals).toEqual(
    expected.map((point) => ({
      date: point.date,
      balance: point.balance,
      accountBalances: point.account_balances,
    })),
  );
}

describe("interval summaries through actual report adapters", () => {
  it.each(["units", "at_cost", "at_value", "USD"])(
    "%s keeps the same zero-net March transfer in narrow and wide windows",
    async (conversion) => {
      const opening = {
        date: "2026-01-31",
        balance: { USD: "1000" },
        account_balances: { "Assets:Bank:Checking": { USD: "1000" } },
      };
      const wide = [opening, ...transfer];
      const f = await fixture(transfer, wide);
      const query = { ...params, conversion };
      try {
        await expectSummary(f, query, {
          currency: "USD",
          intervals: [transferSummary],
        });
        await expectSummary(
          f,
          { ...query, time: "2026" },
          {
            currency: "USD",
            intervals: [
              {
                period: "2026-01-31",
                total: 1000,
                byAccount: [{ account: "Assets:Bank:Checking", balance: 1000 }],
              },
              transferSummary,
            ],
          },
        );
        await expectRaw(f, query, transfer);
        expect(f.getLedgerIntervalTotals).toHaveBeenCalledTimes(7);
        expect(f.getLedgerIntervalTotals.mock.calls).toEqual(
          [
            "2026-03",
            "2026-03",
            "2026",
            "2026",
            "2026-03",
            "2026-03",
            "2026-03",
          ].map((time) => [
            "alice",
            "main",
            {
              account_name: "Assets:Bank",
              conversion,
              interval: "monthly",
              time,
            },
          ]),
        );
      } finally {
        await f.close();
      }
    },
  );

  const eur: Intervals = [
    {
      date: march,
      balance: {},
      account_balances: {
        "Assets:Bank:Checking": { EUR: "-125.50" },
        "Assets:Bank:Savings": { EUR: "125.50" },
      },
    },
  ];
  const mixed: Intervals = [
    {
      date: march,
      balance: {},
      account_balances: {
        "Assets:Bank:EUR:Checking": { EUR: "-10" },
        "Assets:Bank:EUR:Savings": { EUR: "10" },
        "Assets:Bank:USD:Checking": { USD: "-500" },
        "Assets:Bank:USD:Savings": { USD: "500" },
      },
    },
  ];
  const cases: {
    name: string;
    data: Intervals;
    conversion: string;
    currency: string;
    total: number;
    byAccount: { account: string; balance: number }[];
  }[] = [
    {
      name: "non-USD transfer",
      data: eur,
      conversion: "at_cost",
      currency: "EUR",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:Checking", balance: -125.5 },
        { account: "Assets:Bank:Savings", balance: 125.5 },
      ],
    },
    {
      name: "genuinely empty period with strategy conversion",
      data: [{ date: march, balance: {}, account_balances: {} }],
      conversion: "units",
      currency: "USD",
      total: 0,
      byAccount: [],
    },
    {
      name: "genuinely empty period with explicit currency",
      data: [{ date: march, balance: {}, account_balances: {} }],
      conversion: "EUR",
      currency: "EUR",
      total: 0,
      byAccount: [],
    },
    {
      name: "nonzero net movement",
      data: [
        {
          date: march,
          balance: { USD: "12.50" },
          account_balances: {
            "Assets:Bank:Checking": { USD: "14.50" },
            "Assets:Bank:Fee": { USD: "-2" },
            "Assets:Bank:Unused": { USD: "0" },
          },
        },
      ],
      conversion: "at_value",
      currency: "USD",
      total: 12.5,
      byAccount: [
        { account: "Assets:Bank:Checking", balance: 14.5 },
        { account: "Assets:Bank:Fee", balance: -2 },
      ],
    },
    {
      name: "most common account currency",
      data: [
        {
          ...mixed[0],
          account_balances: {
            ...mixed[0].account_balances,
            "Assets:Bank:USD:Unused": { USD: "0" },
          },
        },
      ],
      conversion: "units",
      currency: "USD",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:USD:Checking", balance: -500 },
        { account: "Assets:Bank:USD:Savings", balance: 500 },
      ],
    },
    {
      name: "first observed currency on a tie",
      data: mixed,
      conversion: "at_value",
      currency: "EUR",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:EUR:Checking", balance: -10 },
        { account: "Assets:Bank:EUR:Savings", balance: 10 },
      ],
    },
    {
      name: "explicit observed currency overrides a tie",
      data: mixed,
      conversion: "USD",
      currency: "USD",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:USD:Checking", balance: -500 },
        { account: "Assets:Bank:USD:Savings", balance: 500 },
      ],
    },
    {
      name: "unobserved explicit currency uses existing selection policy",
      data: mixed,
      conversion: "JPY",
      currency: "EUR",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:EUR:Checking", balance: -10 },
        { account: "Assets:Bank:EUR:Savings", balance: 10 },
      ],
    },
    {
      name: "aggregate currency evidence still wins over account counts",
      data: [
        {
          date: march,
          balance: { USD: "0" },
          account_balances: {
            ...mixed[0].account_balances,
            "Assets:Bank:EUR:Unused": { EUR: "0" },
          },
        },
      ],
      conversion: "units",
      currency: "USD",
      total: 0,
      byAccount: [
        { account: "Assets:Bank:USD:Checking", balance: -500 },
        { account: "Assets:Bank:USD:Savings", balance: 500 },
      ],
    },
  ];
  it.each(cases)("preserves $name and raw currency maps", async (entry) => {
    const f = await fixture(entry.data);
    const query = { ...params, conversion: entry.conversion };
    try {
      await expectSummary(f, query, {
        currency: entry.currency,
        intervals: [
          { period: march, total: entry.total, byAccount: entry.byAccount },
        ],
      });
      await expectRaw(f, query, entry.data);
      expect(f.getLedgerIntervalTotals).toHaveBeenCalledTimes(5);
    } finally {
      await f.close();
    }
  });

  it("rechecks revoked authorization before requesting summary or raw data", async () => {
    const f = await fixture(transfer);
    try {
      await expectSummary(f, params, {
        currency: "USD",
        intervals: [transferSummary],
      });
      expect(f.getLedgerIntervalTotals).toHaveBeenCalledTimes(2);
      f.check.mockResolvedValue(false);
      for (const query of [params, { ...params, shape: "fava" }]) {
        const response = await f.rest(query);
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({
          error: { code: "NOT_FOUND" },
        });
        await expect(f.mcp(query)).rejects.toMatchObject({
          data: { code: "NOT_FOUND" },
        });
      }
      const gql = await f.gql(params);
      expect(gql.errors).toHaveLength(1);
      expect(gql.errors?.[0].originalError).toMatchObject({
        category: "NOT_FOUND",
      });
      expect(f.getLedgerIntervalTotals).toHaveBeenCalledTimes(2);
      expect(f.factory.getPublicApiClient).toHaveBeenCalledTimes(2);
    } finally {
      await f.close();
    }
  });
});
