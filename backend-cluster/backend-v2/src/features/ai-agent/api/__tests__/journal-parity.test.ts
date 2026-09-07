import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerJournalQueryResolver } from "@/features/ledger/api/resolvers/ledger-journal-resolver.query";
import { LedgerDataQueryResolver } from "@/features/ledger/api/resolvers/ledger-data-resolver.query";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import {
  AuthorizationService,
  AUTHORIZATION_ACTIONS,
} from "@/server/api/authorization";
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
const entry = {
  date: "2026-01-02",
  narration: "café",
  postings: [{ account: "Expenses:Café", amount: "9007199254740993.12 USD" }],
};
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolvers: Map<unknown, object>;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture() {
  const check = jest.fn().mockResolvedValue(true);
  const authorization = new AuthorizationService({ check }, jest.fn());
  const authorize = jest.spyOn(authorization, "authorizeOrThrow");
  const journal = {
    getJournal: jest
      .fn()
      .mockResolvedValue(
        envelope({ total: 1, items: [entry], is_empty: false }),
      ),
    plaintextJournal: jest.fn().mockResolvedValue(
      envelope({
        content:
          '2026-01-02 * "café"\n  Expenses:Café  12.34 USD\n  Assets:Bank\n',
      }),
    ),
    getAccountJournal: jest.fn().mockResolvedValue(
      envelope({
        items: [
          {
            entry,
            change: { USD: "-12.34" },
            balance: { USD: "9007199254740993.12" },
          },
        ],
        total: 1,
        account: "Assets:Bank",
        with_children: false,
      }),
    ),
  };
  const reports = {
    getLedgerSourceFiles: jest
      .fn()
      .mockResolvedValue(envelope(["main.bean", "2026/café.bean"])),
  };
  const factory = { getPublicApiClient: async () => ({ journal, reports }) };
  const services = {
    ledgerJournal: new LedgerJournalService(factory as never, authorization),
    ledgerData: new LedgerDataService(factory as never, authorization),
  };
  resolvers = new Map<unknown, object>([
    [
      LedgerJournalQueryResolver,
      new LedgerJournalQueryResolver(services.ledgerJournal),
    ],
    [LedgerDataQueryResolver, new LedgerDataQueryResolver(services.ledgerData)],
  ]);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerJournalQueryResolver, LedgerDataQueryResolver],
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
  const client = new Client({ name: "journal-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    journal,
    reports,
    check,
    authorize,
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
    gql: (source: string) =>
      graphql({
        schema,
        source: `{ ${source} }`,
        contextValue: { identity: pinnedReadToken },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const query = {
  account: "Assets:Bank",
  filter: "#travel",
  time: "2026",
  limit: 7,
  offset: 2,
  directiveTypes: ["Transaction", "Document"],
  transactionSubtypes: ["cleared", "pending"],
  documentSubtypes: ["linked"],
  customSubtypes: [],
};
const encode = (query: Record<string, unknown>) =>
  new URLSearchParams(
    Object.fromEntries(
      Object.entries(query).map(([key, value]) => [
        key,
        Array.isArray(value) ? JSON.stringify(value) : String(value),
      ]),
    ),
  );
const gqlInput = (query: Record<string, unknown>) =>
  Object.entries(query)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");

describe("journal adapter contracts", () => {
  it.each([false, true])(
    "preserves journal pagination and subtype filters (filtered=%s)",
    async (filtered) => {
      const f = await fixture();
      try {
        const params = filtered ? query : {};
        const path = `journal?${encode(params)}`;
        const expected = { total: 1, data: [entry], is_empty: false };
        const rest = await f.rest(path);
        expect(rest.status).toBe(200);
        expect(await rest.json()).toEqual(expected);
        expect(await f.mcp(path)).toEqual(expected);
        const gql = await f.gql(
          `getLedgerJournal(ledgerId: "alice/main", query: { ${gqlInput(params)} }) { total data is_empty }`,
        );
        expect(gql.errors).toBeUndefined();
        expect(gql.data?.getLedgerJournal).toEqual(expected);
        const expectedParams = filtered
          ? {
              account: query.account,
              filter: query.filter,
              time: query.time,
              limit: 7,
              offset: 2,
              directive_types: query.directiveTypes,
              transaction_subtypes: query.transactionSubtypes,
              document_subtypes: query.documentSubtypes,
              custom_subtypes: [],
            }
          : {
              account: undefined,
              filter: undefined,
              time: undefined,
              limit: 20,
              offset: 0,
              directive_types: undefined,
              transaction_subtypes: undefined,
              document_subtypes: undefined,
              custom_subtypes: undefined,
            };
        expect(f.journal.getJournal).toHaveBeenCalledTimes(3);
        for (const call of f.journal.getJournal.mock.calls)
          expect(call).toEqual(["alice", "main", expectedParams]);
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    {
      path: "account-journal",
      field: "getLedgerAccountJournal",
      params: { account: "Assets:Bank" },
      selection: "items { entry change balance } total account with_children",
    },
    {
      path: "plaintext-journal",
      field: "getLedgerPlaintextJournal",
      params: { account: "Assets:Bank", filter: "#travel", time: "2026" },
      selection: "content",
    },
    {
      path: "account-journal",
      field: "getLedgerAccountJournal",
      params: {
        account: "Assets:Bank",
        filter: "#travel",
        time: "2026",
        with_children: false,
        conversion: "EUR",
        limit: 7,
        offset: 2,
      },
      selection: "items { entry change balance } total account with_children",
    },
  ])("preserves $field", async (entry) => {
    const f = await fixture();
    try {
      const path = `${entry.path}?${encode(entry.params)}`;
      const response = await f.rest(path);
      expect(response.status).toBe(200);
      const rest = await response.json();
      expect(await f.mcp(path)).toEqual(rest);
      const gql = await f.gql(
        `${entry.field}(ledgerId: "alice/main", query: { ${gqlInput(entry.params)} }) { ${entry.selection} }`,
      );
      expect(gql.errors).toBeUndefined();
      expect(gql.data?.[entry.field]).toEqual(rest);
      const method =
        entry.path === "plaintext-journal"
          ? f.journal.plaintextJournal
          : f.journal.getAccountJournal;
      expect(method).toHaveBeenCalledTimes(3);
      for (const call of method.mock.calls)
        expect(call).toEqual([
          "alice",
          "main",
          entry.path === "account-journal"
            ? {
                filter: undefined,
                time: undefined,
                limit: 20,
                offset: 0,
                with_children: true,
                conversion: "at_cost",
                ...entry.params,
              }
            : entry.params,
        ]);
    } finally {
      await f.close();
    }
  });

  it("reads source files using the canonical file action", async () => {
    const f = await fixture();
    try {
      const expected = ["main.bean", "2026/café.bean"];
      expect(await (await f.rest("source-files")).json()).toEqual(expected);
      expect(await f.mcp("source-files")).toEqual(expected);
      const gql = await f.gql('getLedgerSourceFiles(ledgerId: "alice/main")');
      expect(gql.errors).toBeUndefined();
      expect(gql.data?.getLedgerSourceFiles).toEqual(expected);
      expect(f.authorize).toHaveBeenCalledTimes(3);
      for (const [input] of f.authorize.mock.calls)
        expect(input.action).toBe(AUTHORIZATION_ACTIONS.LEDGER_FILES_READ);
    } finally {
      await f.close();
    }
  });

  it("rejects malformed subtype JSON and missing account before reading", async () => {
    const f = await fixture();
    try {
      for (const path of [
        "journal?directiveTypes=broken",
        "journal?directiveTypes=%7B%7D",
        "account-journal",
      ]) {
        expect((await f.rest(path)).status).toBe(400);
        await expect(f.mcp(path)).rejects.toThrow();
      }
      expect(f.journal.getJournal).not.toHaveBeenCalled();
      expect(f.journal.getAccountJournal).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

describe("journal access revocation", () => {
  it.each([
    ["journal", 'getLedgerJournal(ledgerId: "alice/main") { total }'],
    [
      "plaintext-journal",
      'getLedgerPlaintextJournal(ledgerId: "alice/main") { content }',
    ],
    [
      "account-journal?account=Assets%3ABank",
      'getLedgerAccountJournal(ledgerId: "alice/main", query: { account: "Assets:Bank" }) { total }',
    ],
    ["source-files", 'getLedgerSourceFiles(ledgerId: "alice/main")'],
  ])("refuses %s before reading", async (path, query) => {
    const f = await fixture();
    f.check.mockResolvedValue(false);
    try {
      expect((await f.rest(path)).status).toBe(403);
      await expect(f.mcp(path)).rejects.toThrow();
      expect((await f.gql(query)).errors).toHaveLength(1);
      for (const method of [
        ...Object.values(f.journal),
        ...Object.values(f.reports),
      ])
        expect(method).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});
