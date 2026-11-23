import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { FavaApiError } from "@/foundation/fava/api-client";
import { formatError } from "@/server/graphql/format-error";
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
 * w1/204. On a cost-basis account the register's `units` answered the cost
 * total — the service omitted `conversion`, and the ledger's account journal
 * defaults to `at_cost` — and an unknown code, or a lowercase `usd`, answered
 * the units view as if honoured. The ledger now refuses what its statements
 * refuse; this stub answers the account journal the way it does, so what is
 * pinned here is that every surface asks for `units` and passes the refusal
 * through alike. Holdings checks the currency in this service.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const ACCOUNT = "Assets:US:ETrade:ITOT";
const VIEWS: Record<string, Record<string, string>> = {
  units: { ITOT: "104" },
  at_cost: { USD: "6828.88" },
  USD: { USD: "7792.72" },
};
const envelope = (data: unknown) => ({ data: { success: true, data } });

let resolver: LedgerFinanceQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture() {
  const getAccountJournal = jest.fn(
    async (_o: string, _n: string, query: { conversion?: string }) => {
      const conversion = query.conversion ?? "at_cost";
      const balance = VIEWS[conversion];
      if (!balance) {
        throw new FavaApiError("Bad Request", 400, {
          message: `Unsupported conversion "${conversion}": pass "units", "at_cost", "at_value", "units_by_cost", or a currency in this ledger (ITOT, USD).`,
        } as never);
      }
      return envelope({
        items: [
          {
            entry: {
              date: "2026-03-01",
              entry_hash: "h1",
              directive_type: "Transaction",
              flag: "*",
              payee: "Broker",
              narration: "Buy",
              postings: [
                {
                  account: ACCOUNT,
                  units: { number: "104", currency: "ITOT" },
                  cost: null,
                },
              ],
            },
            change: balance,
            balance,
          },
        ],
        total: 1,
        account: ACCOUNT,
        with_children: true,
      });
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
    getLedgerPostingsPerAccount: async (
      _o: string,
      _n: string,
      query?: { time?: string },
    ) => envelope(query?.time === "1999" ? [] : [{ account: ACCOUNT }]),
    getLedgerCurrencies: async () => envelope(["ITOT", "USD"]),
    getLedgerCommodities: async () =>
      envelope([{ base: "ITOT", quote: "USD", prices: [] }]),
  };
  const queryShellPost = jest.fn(async () =>
    envelope({ result: { types: [], rows: [] } }),
  );
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports,
      journal: {
        getJournal: async () => envelope({ items: [], total: 0 }),
        getAccountJournal,
      },
      shell: { queryShellPost },
    }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, {} as never),
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
  const client = new Client({ name: "report-conversion-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** Each surface's final register balance (or empty result), or its refusal code. */
  const register = async (
    conversion: string,
    opts?: { account?: string; time?: string },
  ) => {
    const account = opts?.account ?? ACCOUNT;
    const params: Record<string, string> = { account, conversion };
    if (opts?.time) params.time = opts.time;
    const query = new URLSearchParams(params);
    const response = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/alice/main/register?${query}`,
    );
    const restBody = await response.json();
    const restOut =
      response.status === 200
        ? restBody.account === null
          ? { account: null, rows: restBody.rows }
          : restBody.rows.at(-1).balance
        : restBody.error.code;
    const mcpQuery = new URLSearchParams({
      conversion,
      ...(opts?.time ? { time: opts.time } : {}),
    });
    const mcpOut = await client
      .readResource({
        uri: `beancount://alice/main/register/${account}?${mcpQuery}`,
      })
      .then((result) => {
        const content = result.contents[0];
        if (!("text" in content)) throw new Error("Expected JSON");
        const parsed = JSON.parse(content.text);
        return parsed.account === null
          ? { account: null, rows: parsed.rows }
          : parsed.rows.at(-1).balance;
      })
      .catch((error: { data?: { code: string } }) => error.data?.code);
    const gql = await graphql({
      schema,
      source: `query($a: String!, $c: String, $t: String) { getLedgerRegister(ledgerId: "alice/main", account: $a, conversion: $c, time: $t) { account rows { balance } } }`,
      variableValues: { a: account, c: conversion, t: opts?.time },
      contextValue: { identity: pinnedReadToken },
    });
    const gqlError = gql.errors?.[0];
    const gqlOut = gqlError
      ? formatError(gqlError.toJSON(), gqlError).extensions?.code
      : (() => {
          const reg = (
            gql.data as {
              getLedgerRegister: {
                account: string | null;
                rows: { balance: unknown }[];
              };
            }
          ).getLedgerRegister;
          return reg.account === null
            ? { account: null, rows: reg.rows }
            : reg.rows.at(-1)?.balance;
        })();
    return { rest: restOut, mcp: mcpOut, gql: gqlOut };
  };

  /** Each surface's holdings outcome: "ok" or its refusal code. */
  const holdings = async (conversion: string) => {
    const response = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/alice/main/holdings?conversion=${conversion}`,
    );
    const restOut =
      response.status === 200 ? "ok" : (await response.json()).error.code;
    const mcpOut = await client
      .readResource({
        uri: `beancount://alice/main/holdings?conversion=${conversion}`,
      })
      .then(() => "ok")
      .catch((error: { data?: { code: string } }) => error.data?.code);
    const gql = await graphql({
      schema,
      source: `query($c: String) { getLedgerHoldings(ledgerId: "alice/main", conversion: $c) { valuation } }`,
      variableValues: { c: conversion },
      contextValue: { identity: pinnedReadToken },
    });
    const gqlError = gql.errors?.[0];
    const gqlOut = gqlError
      ? formatError(gqlError.toJSON(), gqlError).extensions?.code
      : "ok";
    return { rest: restOut, mcp: mcpOut, gql: gqlOut };
  };

  return {
    getAccountJournal,
    queryShellPost,
    register,
    holdings,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("the register's conversion on a cost-basis account", () => {
  it.each([
    ["units", VIEWS.units],
    ["at_cost", VIEWS.at_cost],
    ["USD", VIEWS.USD],
  ])("%s answers the same view on REST, MCP and GraphQL", async (c, view) => {
    const f = await fixture();
    try {
      expect(await f.register(c)).toEqual({ rest: view, mcp: view, gql: view });
    } finally {
      await f.close();
    }
  });

  it("asks the ledger for units, not for no conversion", async () => {
    const f = await fixture();
    try {
      await f.register("units");
      for (const [, , sent] of f.getAccountJournal.mock.calls)
        expect(sent).toMatchObject({ conversion: "units" });
    } finally {
      await f.close();
    }
  });

  it.each(["bogus", "usd", "EUR"])(
    "refuses %p alike on every surface",
    async (c) => {
      const f = await fixture();
      try {
        expect(await f.register(c)).toEqual({
          rest: "BAD_USER_INPUT",
          mcp: "BAD_USER_INPUT",
          gql: "BAD_USER_INPUT",
        });
      } finally {
        await f.close();
      }
    },
  );

  // w31/039: empty account match or empty time window still validates conversion.
  it.each([
    ["BOGUS", { account: "Assets:NoSuchAcct" }],
    ["USD,EUR", { account: "Assets:NoSuchAcct" }],
    ["BOGUS", { time: "1999" }],
    ["USD,EUR", { time: "1999" }],
  ] as const)(
    "refuses %p on every surface even when root is empty (%o)",
    async (c, opts) => {
      const f = await fixture();
      try {
        expect(await f.register(c, opts)).toEqual({
          rest: "BAD_USER_INPUT",
          mcp: "BAD_USER_INPUT",
          gql: "BAD_USER_INPUT",
        });
        expect(f.getAccountJournal).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["units", "at_cost", "at_value", "units_by_cost", "USD"])(
    "still returns empty on every surface for valid %p when root is empty",
    async (c) => {
      const f = await fixture();
      try {
        const empty = { account: null, rows: [] };
        expect(await f.register(c, { account: "Assets:NoSuchAcct" })).toEqual({
          rest: empty,
          mcp: empty,
          gql: empty,
        });
        expect(await f.register(c, { time: "1999" })).toEqual({
          rest: empty,
          mcp: empty,
          gql: empty,
        });
        expect(f.getAccountJournal).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

describe("holdings' conversion", () => {
  it.each(["bogus", "usd", "EUR"])(
    "refuses %p, which the ledger never names, on every surface",
    async (c) => {
      const f = await fixture();
      try {
        expect(await f.holdings(c)).toEqual({
          rest: "BAD_USER_INPUT",
          mcp: "BAD_USER_INPUT",
          gql: "BAD_USER_INPUT",
        });
        expect(f.queryShellPost).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["USD", "units"])("accepts %p on every surface", async (c) => {
    const f = await fixture();
    try {
      expect(await f.holdings(c)).toEqual({ rest: "ok", mcp: "ok", gql: "ok" });
    } finally {
      await f.close();
    }
  });
});
