import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
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

async function fixture(caller = identity, accessKey = "fixture") {
  const check = jest.fn(async () => ({
    allowed: true,
    currentCount: 10,
    maxAllowed: 1000,
  }));
  const charge = jest.fn(async () => undefined);
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
    { check, addTokenUsage: charge } as never,
    { blockeden: { accessKey } } as never,
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
    { identity: caller, llmService: service } as unknown as McpRequestContext,
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
    getJournal,
    rest: (body: unknown = { transactions }) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/import/suggest-categories`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      ),
    gql: (vars: Record<string, unknown> = { transactions }) =>
      graphql({
        schema,
        source:
          "query($ledgerId:String!,$transactions:[TransactionToCategorizeInput!]!) { suggestTransactionCategories(ledgerId:$ledgerId,transactions:$transactions) { rowIndex targetAccount confidence source reasoning } }",
        variableValues: { ledgerId: "alice/main", ...vars },
        contextValue: { identity: caller, getCurrentIdentity: () => caller },
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
      expect(f.charge).toHaveBeenCalledTimes(3);
      expect(f.charge).toHaveBeenCalledWith("usr_alice", 140);
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
    expect(f.charge).toHaveBeenCalledWith("usr_alice", 6);
  } finally {
    await f.close();
  }
});

it("refuses missing read capability before quota or ledger work", async () => {
  const f = await fixture({ ...identity, scopes: new Set() });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(f.read()).rejects.toThrow();
    expect(f.check).not.toHaveBeenCalled();
    expect(categorizeTransactions).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("refuses a caller without AI-write relationship before quota", async () => {
  const f = await fixture();
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
});

it("refuses a different credential pin before ledger work", async () => {
  const f = await fixture({ ...identity, ledgerScope: "other/books" });
  try {
    expect((await f.rest()).status).toBe(403);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(f.read()).rejects.toThrow();
    expect(categorizeTransactions).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

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
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

it("fails without a configured provider key instead of guessing", async () => {
  // The behavior under test is the service's per-call isLlmConfigured guard
  // (ADR 0011): with neither direct provider key set at call time, every
  // surface fails with a clear error before touching the model or the quota.
  const f = await fixture(identity, "");
  const priorAnthropic = process.env.ANTHROPIC_API_KEY;
  const priorOpenai = process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    expect((await f.rest()).status).toBe(500);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(f.read()).rejects.toThrow();
    expect(categorizeTransactions).not.toHaveBeenCalled();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    if (priorAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = priorAnthropic;
    if (priorOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorOpenai;
    await f.close();
  }
});

it("propagates provider failure without charging", async () => {
  const f = await fixture();
  jest
    .mocked(categorizeTransactions)
    .mockRejectedValue(new Error("fixture provider unavailable"));
  try {
    expect((await f.rest()).status).toBe(500);
    expect((await f.gql()).errors).toHaveLength(1);
    await expect(f.read()).rejects.toThrow();
    expect(f.charge).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

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
