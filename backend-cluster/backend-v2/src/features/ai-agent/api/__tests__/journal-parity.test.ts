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
import { formatError } from "@/server/graphql/format-error";
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
        total: 1,
        truncated: false,
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
    tool: (args: Record<string, unknown>) =>
      client.callTool({ name: "listLedgerEntries", arguments: args }),
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
      selection: "content total truncated",
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
    {
      path: "account-journal",
      field: "getLedgerAccountJournal",
      params: {
        account: "Assets:Bank",
        directiveTypes: ["Transaction", "Open"],
        transactionSubtypes: ["pending"],
        documentSubtypes: ["linked"],
        customSubtypes: ["budget"],
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
      for (const [index, call] of method.mock.calls.entries())
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
                directive_types: undefined,
                transaction_subtypes: undefined,
                document_subtypes: undefined,
                custom_subtypes: undefined,
                ...Object.fromEntries(
                  Object.entries(entry.params).flatMap(([key, value]) => {
                    if (key === "directiveTypes")
                      return [["directive_types", value]];
                    if (key === "transactionSubtypes")
                      return [["transaction_subtypes", value]];
                    if (key === "documentSubtypes")
                      return [["document_subtypes", value]];
                    if (key === "customSubtypes")
                      return [["custom_subtypes", value]];
                    return [[key, value]];
                  }),
                ),
              }
            : // MCP, the second call, pages the export by default (w23/044).
              { ...entry.params, ...(index === 1 && { limit: 200 }) },
        ]);
    } finally {
      await f.close();
    }
  });

  // w23/044: one read returned the whole ledger's text; MCP now pages it by
  // default while REST and GraphQL keep the whole export the dashboard reads.
  it("pages the plaintext export on request on every surface", async () => {
    const f = await fixture();
    try {
      const rest = await (
        await f.rest("plaintext-journal?limit=2&offset=2")
      ).json();
      expect(rest).toMatchObject({ total: 1, truncated: false });
      expect(await f.mcp("plaintext-journal?limit=2&offset=2")).toEqual(rest);
      const gql = await f.gql(
        'getLedgerPlaintextJournal(ledgerId: "alice/main", query: { limit: 2, offset: 2 }) { content total truncated }',
      );
      expect(gql.data?.getLedgerPlaintextJournal).toEqual(rest);
      for (const [, , query] of f.journal.plaintextJournal.mock.calls)
        expect(query).toMatchObject({ limit: 2, offset: 2 });
    } finally {
      await f.close();
    }
  });

  it("refuses a plaintext page above 1000 entries on every surface", async () => {
    const f = await fixture();
    try {
      expect((await f.rest("plaintext-journal?limit=1001")).status).toBe(400);
      await expect(f.mcp("plaintext-journal?limit=1001")).rejects.toThrow();
      const gql = await f.gql(
        'getLedgerPlaintextJournal(ledgerId: "alice/main", query: { limit: 1001 }) { content }',
      );
      expect(gql.errors?.[0]?.message).toContain(
        "limit must be an integer from 1 to 1000",
      );
      expect(f.journal.plaintextJournal).not.toHaveBeenCalled();
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
      expect((await f.rest(path)).status).toBe(404);
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

/**
 * w6/007. GraphQL published journal pagination as unconstrained `Number`s and
 * the ledger pages with `slice(offset, offset + limit)`: `limit: -1` returned
 * every entry but the last, `1.5` truncated, `0` answered an empty page, and
 * `offset: -1` read from the end. REST and MCP already refused these in their
 * schemas. Every surface now refuses them before reading — with its own
 * envelope — and passes every valid page through unchanged.
 */
describe("journal pagination contract", () => {
  const reads = [
    {
      name: "journal",
      call: "getJournal" as const,
      base: {},
      gql: (input: string) =>
        `getLedgerJournal(ledgerId: "alice/main", query: { ${input} }) { total }`,
    },
    {
      name: "account-journal",
      call: "getAccountJournal" as const,
      base: { account: "Assets:Bank" },
      gql: (input: string) =>
        `getLedgerAccountJournal(ledgerId: "alice/main", query: { ${input} }) { total }`,
    },
  ];
  const invalid = [
    { page: { limit: -1 }, field: "limit" },
    { page: { limit: 1.5 }, field: "limit" },
    { page: { limit: 0 }, field: "limit" },
    { page: { limit: 1001 }, field: "limit" },
    { page: { offset: -1 }, field: "offset" },
    { page: { offset: 0.5 }, field: "offset" },
    { page: { limit: 2, offset: -1 }, field: "offset" },
  ];

  it.each(
    reads.flatMap((read) => invalid.map((cases) => ({ ...read, ...cases }))),
  )(
    "refuses $name page $page on every surface before reading",
    async (read) => {
      const f = await fixture();
      try {
        const params = { ...read.base, ...read.page };
        const path = `${read.name}?${encode(params)}`;
        const rest = await f.rest(path);
        expect(rest.status).toBe(400);
        expect((await rest.json()).error.code).toBe("VALIDATION_FAILED");
        await expect(f.mcp(path)).rejects.toMatchObject({
          data: { code: "BAD_USER_INPUT" },
        });
        const gql = await f.gql(read.gql(gqlInput(params)));
        const error = gql.errors?.[0];
        expect(error).toBeDefined();
        expect(formatError(error!.toJSON(), error!).extensions).toMatchObject({
          code: "BAD_USER_INPUT",
          field: read.field,
        });
        expect(f.journal[read.call]).not.toHaveBeenCalled();
        expect(f.authorize).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(
    reads.flatMap((read) =>
      [
        { page: {}, sent: { limit: 20, offset: 0 } },
        { page: { limit: 1, offset: 0 }, sent: { limit: 1, offset: 0 } },
        { page: { limit: 1000 }, sent: { limit: 1000, offset: 0 } },
        // Past the end is a valid, empty page — not an error.
        { page: { limit: 2, offset: 50 }, sent: { limit: 2, offset: 50 } },
      ].map((cases) => ({ ...read, ...cases })),
    ),
  )("passes $name page $page through as $sent", async (read) => {
    const f = await fixture();
    try {
      const params = { ...read.base, ...read.page };
      const path = `${read.name}?${encode(params)}`;
      expect((await f.rest(path)).status).toBe(200);
      await f.mcp(path);
      const gql = await f.gql(read.gql(gqlInput(params) || 'filter: ""'));
      expect(gql.errors).toBeUndefined();
      expect(f.journal[read.call]).toHaveBeenCalledTimes(3);
      for (const [, , sent] of f.journal[read.call].mock.calls)
        expect(sent).toMatchObject(read.sent);
    } finally {
      await f.close();
    }
  });
});

/**
 * w6/008. `listLedgerEntries` is the journal verb's tool binding, so a host
 * that never reads resources can find an entry's hash. It answers exactly
 * what REST `journal` and GraphQL `getLedgerJournal` answer for the same
 * query, through the same service call.
 */
describe("listLedgerEntries tool", () => {
  const toolQuery = {
    account: "Assets:Bank",
    filter: "#travel",
    time: "2026",
    directiveTypes: ["Transaction"],
    limit: 7,
    offset: 2,
  };

  it("returns the journal REST and GraphQL return for the same query", async () => {
    const f = await fixture();
    try {
      const tool = await f.tool(toolQuery);
      expect(tool.isError).toBeFalsy();
      const result = (tool.structuredContent as { result: unknown }).result;
      const rest = await (await f.rest(`journal?${encode(toolQuery)}`)).json();
      const gql = await f.gql(
        `getLedgerJournal(ledgerId: "alice/main", query: { ${gqlInput(toolQuery)} }) { total data is_empty }`,
      );
      expect(result).toEqual(rest);
      expect(gql.data?.getLedgerJournal).toEqual(rest);
      expect(result).toEqual({ total: 1, data: [entry], is_empty: false });
      expect(f.journal.getJournal).toHaveBeenCalledTimes(3);
      const [first, ...others] = f.journal.getJournal.mock.calls;
      for (const call of others) expect(call).toEqual(first);
      expect(f.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUTHORIZATION_ACTIONS.LEDGER_JOURNAL_READ,
        }),
      );
    } finally {
      await f.close();
    }
  });

  it("reports an empty match as an empty page, not an error", async () => {
    const f = await fixture();
    f.journal.getJournal.mockResolvedValue(
      envelope({ total: 0, items: [], is_empty: true }),
    );
    try {
      const tool = await f.tool({ filter: "payee:nobody" });
      expect(tool.isError).toBeFalsy();
      expect((tool.structuredContent as { result: unknown }).result).toEqual({
        total: 0,
        data: [],
        is_empty: true,
      });
    } finally {
      await f.close();
    }
  });

  it.each([{ limit: -1 }, { limit: 1.5 }, { limit: 1001 }, { offset: -1 }])(
    "refuses page %p before reading",
    async (page) => {
      const f = await fixture();
      try {
        const tool = await f.tool(page);
        expect(tool.isError).toBe(true);
        expect(f.journal.getJournal).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w23/m2/t004. Every `filter` form the shared description and `docs/mcp.md`
 * document reaches the journal service byte-identical from all four surfaces
 * (MCP tool, REST, MCP resource, GraphQL). What each form *matches* is proven
 * by the ledger evaluator's own tests; here only the pass-through is in scope.
 */
describe("documented filter examples", () => {
  it.each([
    "#travel",
    "^receipt",
    "Salary",
    '"Salary"',
    "account:Checking",
    'account:"Assets:Bank:Checking"',
    "tag:trip",
    "link:receipt",
    "payee:Store",
    "narration:ramen",
    'date:"2026"',
    "amount>100",
    ">100",
    "any(account:Expenses)",
    "all(account:Assets)",
    "-#travel",
    "#a,#b",
    "(#a #b)",
  ])("passes %p through every surface untouched", async (filter) => {
    const f = await fixture();
    try {
      f.journal.getJournal.mockClear();
      const params = { filter };
      const path = `journal?${encode(params)}`;
      const tool = await f.tool(params);
      expect(tool.isError).toBeFalsy();
      const rest = await f.rest(path);
      expect(rest.status).toBe(200);
      await f.mcp(path);
      const gql = await f.gql(
        `getLedgerJournal(ledgerId: "alice/main", query: { ${gqlInput(params)} }) { total data is_empty }`,
      );
      expect(gql.errors).toBeUndefined();
      expect(f.journal.getJournal).toHaveBeenCalledTimes(4);
      for (const call of f.journal.getJournal.mock.calls) {
        expect(call[2]).toMatchObject({ filter });
      }
      const [first, ...others] = f.journal.getJournal.mock.calls;
      for (const call of others) expect(call).toEqual(first);
    } finally {
      await f.close();
    }
  });
});

/**
 * w23/006. The ledger service filters kinds by exact match, so the lowercase
 * spelling `addLedgerEntries` takes — `"transaction"` — and any typo came back
 * as an empty success. Every surface now matches case-insensitively and
 * refuses an unknown kind before authorization or ledger work.
 */
describe("journal directive kinds", () => {
  const loose = {
    directiveTypes: ["transaction", "OPEN"],
    transactionSubtypes: ["Cleared"],
    documentSubtypes: ["LINKED"],
    customSubtypes: ["Budget"],
  };
  const canonical = {
    directive_types: ["Transaction", "Open"],
    transaction_subtypes: ["cleared"],
    document_subtypes: ["linked"],
    custom_subtypes: ["budget"],
  };

  it("forwards any spelling of a kind as the ledger's own, on every surface", async () => {
    const f = await fixture();
    try {
      const path = `journal?${encode(loose)}`;
      expect((await f.rest(path)).status).toBe(200);
      await f.mcp(path);
      const tool = await f.tool({ directiveTypes: loose.directiveTypes });
      expect(tool.isError).toBeFalsy();
      const gql = await f.gql(
        `getLedgerJournal(ledgerId: "alice/main", query: { ${gqlInput(loose)} }) { total }`,
      );
      expect(gql.errors).toBeUndefined();
      const forwarded = f.journal.getJournal.mock.calls.map(
        ([, , params]) => params,
      );
      expect(forwarded).toHaveLength(4);
      for (const params of [forwarded[0], forwarded[1], forwarded[3]])
        expect(params).toMatchObject(canonical);
      expect(forwarded[2]).toMatchObject({
        directive_types: canonical.directive_types,
      });

      const accountPath = `account-journal?${encode({ account: "Assets:Bank", ...loose })}`;
      expect((await f.rest(accountPath)).status).toBe(200);
      await f.mcp(accountPath);
      const accountGql = await f.gql(
        `getLedgerAccountJournal(ledgerId: "alice/main", query: { account: "Assets:Bank", ${gqlInput(loose)} }) { total }`,
      );
      expect(accountGql.errors).toBeUndefined();
      for (const [, , params] of f.journal.getAccountJournal.mock.calls)
        expect(params).toMatchObject(canonical);
      expect(f.journal.getAccountJournal).toHaveBeenCalledTimes(3);
    } finally {
      await f.close();
    }
  });

  it.each([
    { directiveTypes: ["Txn"], field: "directiveTypes" },
    { directiveTypes: ["Transaction", "Nope"], field: "directiveTypes" },
    { transactionSubtypes: ["settled"], field: "transactionSubtypes" },
    { documentSubtypes: ["attached"], field: "documentSubtypes" },
    { customSubtypes: ["forecast"], field: "customSubtypes" },
  ])(
    "refuses an unknown $field value as BAD_USER_INPUT before reading",
    async ({ field, ...params }) => {
      const f = await fixture();
      try {
        for (const read of ["journal", "account-journal"]) {
          const path = `${read}?${encode({ account: "Assets:Bank", ...params })}`;
          const rest = await f.rest(path);
          expect(rest.status).toBe(400);
          expect((await rest.json()).error).toMatchObject({
            code: "BAD_USER_INPUT",
          });
          await expect(f.mcp(path)).rejects.toMatchObject({
            data: { code: "BAD_USER_INPUT" },
          });
        }
        const gql = await f.gql(
          `getLedgerJournal(ledgerId: "alice/main", query: { ${gqlInput(params)} }) { total }`,
        );
        const error = gql.errors?.[0];
        expect(error).toBeDefined();
        expect(formatError(error!.toJSON(), error!).extensions).toMatchObject({
          code: "BAD_USER_INPUT",
          field,
        });
        if ("directiveTypes" in params) {
          const tool = await f.tool(params);
          expect(tool.isError).toBe(true);
          expect(JSON.stringify(tool.content)).toContain("BAD_USER_INPUT");
        }
        expect(f.journal.getJournal).not.toHaveBeenCalled();
        expect(f.journal.getAccountJournal).not.toHaveBeenCalled();
        expect(f.authorize).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("keeps an empty list as an empty filter", async () => {
    const f = await fixture();
    try {
      expect(
        (await f.rest(`journal?${encode({ directiveTypes: [] })}`)).status,
      ).toBe(200);
      expect(f.journal.getJournal.mock.calls[0]![2]).toMatchObject({
        directive_types: [],
      });
    } finally {
      await f.close();
    }
  });

  it("publishes the kinds as an enum in listLedgerEntries' input schema", async () => {
    const f = await fixture();
    try {
      const server = assembleMcpRegistry(
        {
          identity: pinnedReadToken,
          services: {},
        } as unknown as McpRequestContext,
        config,
      );
      const client = new Client({ name: "journal-kinds", version: "1" });
      const [a, b] = InMemoryTransport.createLinkedPair();
      await Promise.all([client.connect(a), server.connect(b)]);
      const { tools } = await client.listTools();
      const schema = tools.find(({ name }) => name === "listLedgerEntries")
        ?.inputSchema as unknown as {
        properties: { directiveTypes: { items: { enum?: string[] } } };
      };
      expect(schema.properties.directiveTypes.items.enum).toEqual([
        "Transaction",
        "Balance",
        "Commodity",
        "Close",
        "Custom",
        "Document",
        "Event",
        "Note",
        "Open",
        "Pad",
        "Price",
      ]);
      await client.close();
      await server.close();
    } finally {
      await f.close();
    }
  });
});
