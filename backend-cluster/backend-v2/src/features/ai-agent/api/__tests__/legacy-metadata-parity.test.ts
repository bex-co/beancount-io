import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerLegacyQueryResolver } from "@/features/ledger/api/resolvers/ledger-legacy-resolver.query";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  readOnlyToken,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const options = {
  name_assets: "Assets",
  name_equity: "Equity",
  name_expenses: "Expenses",
  name_income: "Income",
  name_liabilities: "Liabilities",
  operating_currency: ["USD", "EUR"],
};
const expected = {
  success: true,
  data: {
    accounts: ["Assets:Bank", "Expenses:Café"],
    currencies: ["USD", "EUR"],
    errors: 2,
    options,
  },
};
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolver: LedgerLegacyQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

const legacyEntry = {
  type: "Transaction",
  date: "2026-02-03",
  flag: "*",
  payee: "Café",
  narration: "Supplies",
  meta: { filename: "main.bean", lineno: 7 },
  postings: [
    { account: "Expenses:Supplies", amount: "1,234.50 USD" },
    { account: "Assets:Bank", units: { currency: "USD", number: -1234.5 } },
  ],
};
const journalSelection =
  "success data { type date flag payee narration meta { filename lineno } links tags postings { account cost flag price meta { filename lineno } units { currency number } } netAmount primaryAccount searchableText } pageInfo { hasNextPage hasPreviousPage startCursor endCursor totalCount }";
const queryString = (args: Record<string, unknown>) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(args).map(([key, value]) => [
        key,
        Array.isArray(value) ? JSON.stringify(value) : String(value),
      ]),
    ),
  );

async function fixture(identity: Identity) {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const reports = {
    getLedgerOptions: jest
      .fn()
      .mockResolvedValue(envelope({ ...options, title: "not a legacy field" })),
    getLedgerAttributes: jest.fn().mockResolvedValue(
      envelope({
        accounts: expected.data.accounts,
        currencies: expected.data.currencies,
      }),
    ),
    getLedgerErrors: jest
      .fn()
      .mockResolvedValue(envelope([{ message: "one" }, { message: "two" }])),
  };
  const listLedgers = jest
    .fn()
    .mockResolvedValue(envelope([{ full_name: "alice/default" }]));
  const legacy = {
    getLegacyJournal: jest.fn().mockResolvedValue(envelope([legacyEntry])),
  };
  const factory = {
    getApiContext: jest
      .fn()
      .mockResolvedValue({ favaApiClient: { ledgers: { listLedgers } } }),
    getPublicApiClient: jest.fn().mockResolvedValue({ reports, legacy }),
  };
  const workflow = new LedgerWorkflow(
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  resolver = new LedgerLegacyQueryResolver(
    factory as never,
    authorization,
    workflow,
  );
  schemaPromise ??= buildSchema({
    resolvers: [LedgerLegacyQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, ledgerWorkflow: workflow } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "legacy-metadata-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  const params = (ledgerId?: string) =>
    new URLSearchParams({
      userId: "someone-else",
      ...(ledgerId ? { ledgerId } : {}),
    });
  return {
    legacy,
    restJournal: (args: Record<string, unknown>) =>
      fetch(
        `${rest.url}/api-gateway/v1/legacy/journal-entries?${queryString(args)}`,
      ),
    mcpJournal: (args: Record<string, unknown>) =>
      client.readResource({
        uri: `beancount://legacy/journal-entries?${queryString(args)}`,
      }),
    gqlJournal: (args: Record<string, unknown>) => {
      const argumentsText = Object.entries(args)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(", ");
      return graphql({
        schema,
        source: `{ journalEntries${argumentsText ? `(${argumentsText})` : ""} { ${journalSelection} } }`,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
    },
    check,
    reports,
    factory,
    listLedgers,
    rest: (ledgerId?: string) =>
      fetch(
        `${rest.url}/api-gateway/v1/legacy/ledger-meta?${params(ledgerId)}`,
      ),
    mcp: (ledgerId?: string) =>
      client.readResource({
        uri: `beancount://legacy/ledger-meta?${params(ledgerId)}`,
      }),
    gql: (ledgerId?: string) =>
      graphql({
        schema,
        source: `query($ledgerId: String) { ledgerMeta(userId: "someone-else", ledgerId: $ledgerId) { success data { accounts currencies errors options { name_assets name_equity name_expenses name_income name_liabilities operating_currency } } } }`,
        variableValues: { ledgerId },
        contextValue: { identity, getCurrentIdentity: () => identity },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("legacy metadata parity", () => {
  it.each([
    {
      identity: readOnlyToken,
      requested: "alice/selected",
      target: "alice/selected",
    },
    { identity: pinnedReadToken, requested: undefined, target: "alice/main" },
    { identity: readOnlyToken, requested: undefined, target: "alice/default" },
  ])(
    "preserves legacy selection for $target",
    async ({ identity, requested, target }) => {
      const f = await fixture(identity);
      try {
        const response = await f.rest(requested);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expected);
        const gql = await f.gql(requested);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.ledgerMeta).toEqual(expected);
        const resource = await f.mcp(requested);
        const content = resource.contents[0];
        if (!("text" in content))
          throw new Error("Expected JSON resource text");
        expect(JSON.parse(content.text)).toEqual(expected);
        expect(f.factory.getPublicApiClient).toHaveBeenCalledTimes(3);
        for (const call of f.factory.getPublicApiClient.mock.calls)
          expect(call).toEqual([target, identity.userId]);
        if (!requested && !identity.ledgerScope) {
          expect(f.factory.getApiContext).toHaveBeenCalledTimes(3);
          expect(f.factory.getApiContext).toHaveBeenCalledWith(identity.userId);
        } else expect(f.listLedgers).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("refuses an explicit ledger outside the pin on all surfaces", async () => {
    const f = await fixture(pinnedReadToken);
    try {
      expect((await f.rest("alice/other")).status).toBe(403);
      expect((await f.gql("alice/other")).errors).toHaveLength(1);
      await expect(f.mcp("alice/other")).rejects.toThrow();
      expect(f.factory.getPublicApiClient).not.toHaveBeenCalled();
      expect(f.check).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("refuses revoked relationships before reading metadata", async () => {
    const f = await fixture(pinnedReadToken);
    f.check.mockResolvedValue(false);
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      await expect(f.mcp()).rejects.toThrow();
      expect(f.reports.getLedgerOptions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

describe("legacy journal parity", () => {
  it.each([pinnedReadToken, readOnlyToken])(
    "preserves journal transformations and filters (pin=$ledgerScope)",
    async (identity) => {
      const f = await fixture(identity);
      const args = {
        first: 1,
        after: "2026-01-01",
        last: 3,
        before: "2026-03-01",
        detailed: false,
        searchQuery: "café",
        accountFilter: "Assets:*",
        amountMin: 0,
        amountMax: 2500.5,
        entryTypes: ["Transaction", "Open"],
        sortBy: "date",
        sortOrder: "desc",
        groupBy: "account",
      };
      const expectedEntry = {
        ...legacyEntry,
        links: [],
        tags: [],
        postings: [
          {
            account: "Expenses:Supplies",
            cost: null,
            flag: null,
            price: null,
            meta: legacyEntry.meta,
            units: { currency: "USD", number: 1234.5 },
          },
          {
            account: "Assets:Bank",
            cost: null,
            flag: null,
            price: null,
            meta: legacyEntry.meta,
            units: { currency: "USD", number: -1234.5 },
          },
        ],
        netAmount: 0,
        primaryAccount: "Expenses:Supplies",
        searchableText: "café supplies  expenses:supplies assets:bank",
      };
      const expectedResult = {
        success: true,
        data: [expectedEntry],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: "2026-02-03",
          endCursor: "2026-02-03",
          totalCount: 0,
        },
      };
      try {
        const rest = await f.restJournal(args);
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expectedResult);
        const gql = await f.gqlJournal(args);
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.journalEntries).toEqual(expectedResult);
        const mcp = await f.mcpJournal(args);
        const content = mcp.contents[0];
        if (!("text" in content)) throw new Error("Expected JSON");
        expect(JSON.parse(content.text)).toEqual(expectedResult);
        expect(f.legacy.getLegacyJournal).toHaveBeenCalledTimes(3);
        for (const call of f.legacy.getLegacyJournal.mock.calls)
          expect(call).toEqual([
            "alice",
            identity.ledgerScope ? "main" : "default",
            {
              first: 1,
              after: "2026-01-01",
              last: 3,
              before: "2026-03-01",
              detailed: false,
              search_query: "café",
              account_filter: "Assets:*",
              amount_min: 0,
              amount_max: 2500.5,
              entry_types: "Transaction,Open",
              sort_by: "date",
              sort_order: "desc",
              group_by: "account",
            },
          ]);
      } finally {
        await f.close();
      }
    },
  );

  it("preserves empty-page cursor metadata", async () => {
    const f = await fixture(pinnedReadToken);
    f.legacy.getLegacyJournal.mockResolvedValue(envelope([]));
    const expected = {
      success: true,
      data: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: "",
        endCursor: "",
        totalCount: 0,
      },
    };
    try {
      expect(await (await f.restJournal({ first: 10 })).json()).toEqual(
        expected,
      );
      const gql = await f.gqlJournal({ first: 10 });
      expect(gql.errors).toBeUndefined();
      expect(gql.data?.journalEntries).toEqual(expected);
      const content = (await f.mcpJournal({ first: 10 })).contents[0];
      if (!("text" in content)) throw new Error("Expected JSON");
      expect(JSON.parse(content.text)).toEqual(expected);
    } finally {
      await f.close();
    }
  });

  it("refuses revoked journal access before reading", async () => {
    const f = await fixture(pinnedReadToken);
    f.check.mockResolvedValue(false);
    try {
      expect((await f.restJournal({})).status).toBe(403);
      expect((await f.gqlJournal({})).errors).toHaveLength(1);
      await expect(f.mcpJournal({})).rejects.toThrow();
      expect(f.legacy.getLegacyJournal).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
