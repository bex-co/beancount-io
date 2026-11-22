import { requestPlatform } from "@/server/api/request-platform";
import "reflect-metadata";
jest.mock("../../utils/categorize-transactions", () => ({
  categorizeTransactions: jest.fn(),
}));
import { categorizeTransactions } from "../../utils/categorize-transactions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { DirectiveType } from "@/foundation/fava";
import { LLMCategorizationQueryResolver } from "../ai-categorization-resolver";
import { LLMService } from "../../service/llm-service";
import { estimateCategorizationTokens } from "../../utils/categorize-transactions/estimate-tokens";
import { MAX_SUGGEST_TRANSACTIONS } from "../../utils/suggest-categories-cap";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const transactions = [
  {
    rowIndex: 0,
    date: "2026-08-01",
    payee: "Blue Bottle",
    description: "Latte",
    amount: -6.5,
  },
  {
    rowIndex: 1,
    date: "2026-08-02",
    payee: "Shell",
    description: "Gas",
    amount: -40,
  },
];
const suggestions = [
  {
    rowIndex: 0,
    targetAccount: "Expenses:Coffee",
    confidence: 0.92,
    reasoning: "Coffee shop purchase",
  },
  {
    rowIndex: 1,
    targetAccount: "Expenses:Auto:Fuel",
    confidence: 0.8,
    reasoning: "Fuel purchase",
  },
];
const expected = suggestions.map((s) => ({ ...s, source: "llm" }));

let resolver: LLMCategorizationQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LLMCategorizationQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});
beforeEach(() => {
  jest.mocked(categorizeTransactions).mockReset();
  jest.mocked(categorizeTransactions).mockResolvedValue({
    suggestions,
    tokenUsage: { inputTokens: 100, outputTokens: 40 },
  });
});

async function fixture(
  caller = identity,
  accessKey = "fixture",
  appId?: string,
) {
  const headers: Record<string, string> = appId ? { "x-app-id": appId } : {};
  const platform = requestPlatform(headers);
  const check = jest.fn(async () => ({
    allowed: true,
    currentCount: 10,
    maxAllowed: 1000,
  }));
  const charge = jest.fn(async () => undefined);
  const reserve = jest.fn(async (_userId: string, tokens: number) => ({
    allowed: true,
    currentCount: 10 + tokens,
    maxAllowed: 1000,
    billingMonth: "2026-11",
    reservedTokens: tokens,
  }));
  const settle = jest.fn(async () => undefined);
  const state = { permission: "write", plugins: [] as string[] };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const getJournal = jest.fn(async () =>
    envelope({
      items: [
        {
          payee: "Blue Bottle",
          narration: "Morning latte",
          postings: [
            { account: "Assets:Cash" },
            { account: "Expenses:Coffee" },
          ],
        },
        {
          payee: "",
          narration: "No payee, skipped",
          postings: [{ account: "Expenses:Coffee" }],
        },
        {
          payee: "Landlord",
          narration: "Deposit only, skipped",
          postings: [
            { account: "Assets:Cash" },
            { account: "Liabilities:Deposit" },
          ],
        },
        { narration: "Not a transaction shape, skipped" },
      ],
    }),
  );
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.permission }),
        },
        journal: { getJournal },
        reports: {
          getLedgerPlugins: async () => envelope(state.plugins),
        },
      },
    }),
    getPublicApiClient: async () => ({
      reports: {
        getLedgerAccounts: async () =>
          envelope({
            "Assets:Cash": { close_date: null },
            "Expenses:Coffee": { close_date: null },
            "Expenses:Closed": { close_date: "2025-01-01" },
          }),
      },
    }),
  };
  const service = new LLMService(
    fava as never,
    {} as never,
    { check, addTokenUsage: charge, reserve, settle } as never,
    {
      openai: { apiKey: accessKey, baseUrl: "https://api.openai.com/v1" },
    } as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LLMCategorizationQueryResolver(service);
  const rest = await startV1TestServer(
    { services: { llm: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      llmService: service,
      platform,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({
    name: "suggest-categories-parity",
    version: "1",
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    state,
    check,
    charge,
    reserve,
    settle,
    getJournal,
    rest: (body: unknown = { transactions }) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/import/suggest-categories`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...headers },
          body: JSON.stringify(body),
        },
      ),
    gql: (vars: Record<string, unknown> = { transactions }) =>
      graphql({
        schema,
        source:
          "query($ledgerId:String!,$transactions:[TransactionToCategorizeInput!]!) { suggestTransactionCategories(ledgerId:$ledgerId,transactions:$transactions) { rowIndex targetAccount confidence source reasoning } }",
        variableValues: { ledgerId: "alice/main", ...vars },
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform,
        },
      }),
    read: async (payload: unknown = transactions) => {
      const result = await client.readResource({
        uri: `beancount://alice/main/import/suggest-categories?transactions=${encodeURIComponent(JSON.stringify(payload))}`,
      });
      const c = result.contents[0];
      if (!("text" in c)) throw new Error("Expected JSON");
      return JSON.parse(c.text as string) as unknown;
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([identity, { ...identity, ledgerScope: undefined }])(
  "suggests categories from the ledger's accounts and history with %j",
  async (caller) => {
    const f = await fixture(caller);
    try {
      const r = await f.rest();
      const g = await f.gql();
      const m = await f.read();
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      for (const result of [
        await r.json(),
        g.data!.suggestTransactionCategories,
        m,
      ])
        expect(result).toEqual(expected);
      expect(categorizeTransactions).toHaveBeenCalledTimes(3);
      expect(categorizeTransactions).toHaveBeenCalledWith(expect.anything(), {
        transactions,
        existingAccounts: ["Assets:Cash", "Expenses:Coffee"],
        recentExamples: [
          {
            payee: "Blue Bottle",
            narration: "Morning latte",
            account: "Expenses:Coffee",
          },
        ],
        autoAccounts: false,
      });
      expect(f.getJournal).toHaveBeenCalledWith("alice", "main", {
        limit: 50,
        directive_types: [DirectiveType.Transaction],
      });
      // Each call holds its estimate before the model runs and settles to
      // the 140 tokens it really used.
      const estimate = estimateCategorizationTokens({
        transactions,
        existingAccounts: ["Assets:Cash", "Expenses:Coffee"],
        recentExamples: [
          {
            payee: "Blue Bottle",
            narration: "Morning latte",
            account: "Expenses:Coffee",
          },
        ],
        autoAccounts: false,
      });
      expect(f.reserve).toHaveBeenCalledTimes(3);
      expect(f.reserve).toHaveBeenCalledWith("usr_alice", estimate);
      expect(f.reserve.mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(categorizeTransactions).mock.invocationCallOrder[0],
      );
      expect(f.settle).toHaveBeenCalledTimes(3);
      expect(f.settle).toHaveBeenCalledWith(
        "usr_alice",
        expect.objectContaining({ reservedTokens: estimate }),
        140,
      );
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("reports auto_accounts plugins so suggestions may leave the account list", async () => {
  const f = await fixture();
  f.state.plugins = ["beancount.plugins.auto_accounts"];
  try {
    expect((await f.rest()).status).toBe(200);
    expect(categorizeTransactions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autoAccounts: true }),
    );
  } finally {
    await f.close();
  }
});

it("passes an empty batch through without inventing a minimum", async () => {
  const f = await fixture();
  jest.mocked(categorizeTransactions).mockResolvedValue({
    suggestions: [],
    tokenUsage: { inputTokens: 5, outputTokens: 1 },
  });
  try {
    const r = await f.rest({ transactions: [] });
    const g = await f.gql({ transactions: [] });
    const m = await f.read([]);
    expect(r.status).toBe(200);
    expect(g.errors).toBeUndefined();
    for (const result of [
      await r.json(),
      g.data!.suggestTransactionCategories,
      m,
    ])
      expect(result).toEqual([]);
    expect(f.settle).toHaveBeenCalledWith("usr_alice", expect.anything(), 6);
  } finally {
    await f.close();
  }
});

it.each([undefined, "beancount-mobile"])(
  "refuses missing read capability before quota or ledger work (%s)",
  async (appId) => {
    const f = await fixture(
      { ...identity, scopes: new Set() },
      "fixture",
      appId,
    );
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      await expect(f.read()).rejects.toThrow();
      expect(f.check).not.toHaveBeenCalled();
      expect(f.reserve).not.toHaveBeenCalled();
      expect(categorizeTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "refuses a caller without AI-write relationship before quota (%s)",
  async (appId) => {
    const f = await fixture(identity, "fixture", appId);
    f.state.permission = "read";
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      await expect(f.read()).rejects.toThrow();
      expect(f.check).not.toHaveBeenCalled();
      expect(categorizeTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "refuses a different credential pin before ledger work (%s)",
  async (appId) => {
    const f = await fixture(
      { ...identity, ledgerScope: "other/books" },
      "fixture",
      appId,
    );
    try {
      expect((await f.rest()).status).toBe(403);
      expect((await f.gql()).errors).toHaveLength(1);
      await expect(f.read()).rejects.toThrow();
      expect(categorizeTransactions).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("refuses exhausted quota before provider work or charging", async () => {
  const f = await fixture();
  f.check.mockResolvedValue({
    allowed: false,
    currentCount: 1000,
    maxAllowed: 1000,
  });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(f.read()).rejects.toThrow();
    expect(categorizeTransactions).not.toHaveBeenCalled();
    expect(f.reserve).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
    expect(f.settle).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses with the same quota error when the reservation finds the quota spent", async () => {
  const f = await fixture();
  f.reserve.mockResolvedValue({
    allowed: false,
    currentCount: 1000,
    maxAllowed: 1000,
    billingMonth: "2026-11",
    reservedTokens: 0,
  });
  try {
    const r = await f.rest();
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({
      ok: false,
      error: { code: "RESOURCE_LIMIT_REACHED" },
    });
    const g = await f.gql();
    expect(g.errors).toHaveLength(1);
    expect(g.errors![0].originalError).toMatchObject({
      category: "RESOURCE_LIMIT_REACHED",
    });
    await expect(f.read()).rejects.toMatchObject({
      data: { code: "RESOURCE_LIMIT_REACHED" },
    });
    expect(f.reserve).toHaveBeenCalledTimes(3);
    expect(categorizeTransactions).not.toHaveBeenCalled();
    expect(f.settle).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it.each([undefined, "beancount-mobile"])(
  "fails without a configured provider key instead of guessing (%s)",
  async (appId) => {
    // Provider configuration is checked at call time on every surface.
    const f = await fixture(identity, "", appId);
    const priorAnthropic = process.env.ANTHROPIC_API_KEY;
    const priorOpenai = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      // ADR029 D5: an operator setup gap, not a crash — one code, the
      // variables to set as the hint, and 503 rather than 500 on REST.
      const hint = "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)";
      const r = await f.rest();
      expect(r.status).toBe(503);
      expect(await r.json()).toMatchObject({
        ok: false,
        error: { code: "CONFIGURATION_ERROR", metadata: { hint } },
      });
      const g = await f.gql();
      expect(g.errors).toHaveLength(1);
      expect(g.errors![0].originalError).toMatchObject({
        category: "CONFIGURATION_ERROR",
        metadata: { hint },
      });
      await expect(f.read()).rejects.toMatchObject({
        data: { code: "CONFIGURATION_ERROR", hint },
      });
      expect(categorizeTransactions).not.toHaveBeenCalled();
      expect(f.reserve).not.toHaveBeenCalled();
      expect(f.charge).not.toHaveBeenCalled();
    } finally {
      if (priorAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = priorAnthropic;
      if (priorOpenai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = priorOpenai;
      await f.close();
    }
  },
);

it.each([undefined, "beancount-mobile"])(
  "propagates provider failure without charging, releasing any reservation (%s)",
  async (appId) => {
    const f = await fixture(identity, "fixture", appId);
    jest
      .mocked(categorizeTransactions)
      .mockRejectedValue(new Error("fixture provider unavailable"));
    try {
      // The control for the case above: a genuine failure stays a 500
      // INTERNAL_SERVER_ERROR on every surface.
      const r = await f.rest();
      expect(r.status).toBe(500);
      expect(await r.json()).toMatchObject({
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
      const g = await f.gql();
      expect(g.errors).toHaveLength(1);
      expect(g.errors![0].originalError).not.toHaveProperty(
        "category",
        "CONFIGURATION_ERROR",
      );
      await expect(f.read()).rejects.toMatchObject({
        data: { code: "INTERNAL_SERVER_ERROR" },
      });
      expect(f.charge).not.toHaveBeenCalled();
      if (appId) {
        // Mobile is not gated, so it holds nothing to release.
        expect(f.reserve).not.toHaveBeenCalled();
        expect(f.settle).not.toHaveBeenCalled();
      } else {
        expect(f.settle).toHaveBeenCalledTimes(3);
        expect(f.settle).toHaveBeenCalledWith(
          "usr_alice",
          expect.objectContaining({ reservedTokens: expect.any(Number) }),
          0,
        );
      }
    } finally {
      await f.close();
    }
  },
);

it("rejects malformed structured input before any domain work", async () => {
  const f = await fixture();
  try {
    expect((await f.rest({ transactions, extra: true })).status).toBe(400);
    expect(
      (
        await f.rest({
          transactions: [{ ...transactions[0], rowIndex: 0.5 }],
        })
      ).status,
    ).toBe(400);
    await expect(
      f.client.readResource({
        uri: "beancount://alice/main/import/suggest-categories?transactions=not-json",
      }),
    ).rejects.toThrow();
    await expect(
      f.client.readResource({
        uri: "beancount://alice/main/import/suggest-categories",
      }),
    ).rejects.toThrow();
    expect(categorizeTransactions).not.toHaveBeenCalled();
    expect(f.check).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it.each(["beancount-mobile", "mobile-beancount"])(
  "mobile %s bypasses exhausted plan quota while recording actual usage",
  async (appId) => {
    const f = await fixture(identity, "fixture", appId);
    f.check.mockResolvedValue({
      allowed: false,
      currentCount: 1000,
      maxAllowed: 1000,
    });
    try {
      const r = await f.rest();
      const g = await f.gql();
      expect(r.status).toBe(200);
      expect(g.errors).toBeUndefined();
      for (const result of [
        await r.json(),
        g.data!.suggestTransactionCategories,
        await f.read(),
      ]) {
        expect(result).toEqual(expected);
      }
      expect(f.check).not.toHaveBeenCalled();
      expect(f.reserve).not.toHaveBeenCalled();
      expect(f.charge).toHaveBeenCalledTimes(3);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 140);
    } finally {
      await f.close();
    }
  },
);

const batchOf = (length: number) =>
  Array.from({ length }, (_, rowIndex) => ({
    rowIndex,
    date: "2026-08-01",
    payee: `Payee ${rowIndex}`,
    description: "Card purchase",
    amount: -1,
  }));

it.each([undefined, "beancount-mobile"])(
  "refuses one transaction over the cap identically on every surface before any work (%s)",
  async (appId) => {
    const f = await fixture(identity, "fixture", appId);
    const overCap = batchOf(MAX_SUGGEST_TRANSACTIONS + 1);
    const message = `transactions holds ${MAX_SUGGEST_TRANSACTIONS + 1} transactions; at most ${MAX_SUGGEST_TRANSACTIONS} may be categorized per call. Split them into several calls.`;
    try {
      const r = await f.rest({ transactions: overCap });
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message,
          metadata: { field: "transactions" },
        },
      });
      const g = await f.gql({ transactions: overCap });
      expect(g.errors).toHaveLength(1);
      expect(g.errors![0].message).toBe(message);
      expect(g.errors![0].originalError).toMatchObject({
        category: "BAD_USER_INPUT",
        metadata: { field: "transactions" },
      });
      await expect(f.read(overCap)).rejects.toMatchObject({
        message: expect.stringContaining(message),
        data: { code: "BAD_USER_INPUT" },
      });
      expect(f.check).not.toHaveBeenCalled();
      expect(f.reserve).not.toHaveBeenCalled();
      expect(f.getJournal).not.toHaveBeenCalled();
      expect(categorizeTransactions).not.toHaveBeenCalled();
      expect(f.charge).not.toHaveBeenCalled();
      expect(f.settle).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

it("accepts exactly the cap on every surface", async () => {
  const f = await fixture();
  const atCap = batchOf(MAX_SUGGEST_TRANSACTIONS);
  try {
    expect((await f.rest({ transactions: atCap })).status).toBe(200);
    expect((await f.gql({ transactions: atCap })).errors).toBeUndefined();
    expect(await f.read(atCap)).toEqual(expected);
    expect(categorizeTransactions).toHaveBeenCalledTimes(3);
    for (const [, request] of jest.mocked(categorizeTransactions).mock.calls)
      expect(request.transactions).toHaveLength(MAX_SUGGEST_TRANSACTIONS);
  } finally {
    await f.close();
  }
});
