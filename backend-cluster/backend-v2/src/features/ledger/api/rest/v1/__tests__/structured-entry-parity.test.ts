import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerEntryMutationResolver } from "../../../resolvers/ledger-entry-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import {
  LedgerEntryService,
  createLedgerEntryWriter,
  type LedgerEntryInput,
} from "@/features/ledger/service/ledger-entry-service";
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
let resolver: LedgerEntryMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerEntryMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerEntryMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

const date = "2026-09-01";
const amount = { number: "123.45", currency: "USD" };
const entries: LedgerEntryInput[] = [
  {
    type: "transaction",
    entry: {
      date,
      flag: "*",
      payee: "Café",
      narration: "Food",
      postings: [
        {
          account: "Assets:Cash",
          units: amount,
          price: { number: "1.01", currency: "EUR" },
          flag: "!",
        },
        {
          account: "Expenses:Food",
          units: { number: "-124.6845", currency: "EUR" },
        },
      ],
      tags: ["trip"],
      links: ["receipt"],
      meta: { source: "fixture", note: "Café" },
    },
  },
  { type: "commodity", entry: { date, currency: "USD" } },
  { type: "price", entry: { date, currency: "EUR", amount } },
  {
    type: "note",
    entry: { date, account: "Assets:Cash", content: "Café note" },
  },
  { type: "balance", entry: { date, account: "Assets:Cash", amount } },
  {
    type: "open",
    entry: { date, account: "Assets:Cash", currencies: ["USD", "EUR"] },
  },
  { type: "close", entry: { date, account: "Assets:Old" } },
  {
    type: "budget",
    entry: { date, account: "Expenses:Food", interval: "monthly", amount },
  },
  {
    type: "document",
    entry: {
      date,
      account: "Expenses:Food",
      filename: "receipt.pdf",
      tags: ["trip"],
      links: ["receipt"],
    },
  },
  { type: "event", entry: { date, type: "location", description: "Paris" } },
];
async function fixture(caller = identity) {
  const committed: unknown[] = [];
  const state = { writable: true, failCommit: false };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const write = jest.fn(async (_owner, _name, body) => {
    if (state.failCommit) throw new Error("Fixture commit refused");
    committed.push(...body.entries);
    return envelope(null);
  });
  const createFile = jest.fn();
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: state.writable ? "write" : "read" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      entries: { addBulkEntries: write },
      reports: {
        getLedgerBcioOptions: async () =>
          envelope({ default_file: "main.bean" }),
      },
      ledgers: {
        getLedgerFile: async () => envelope({ path: "main.bean" }),
        createLedgerFile: createFile,
      },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const service = new LedgerEntryService(
    createLedgerEntryWriter(fava as never),
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerEntryMutationResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerEntry: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerEntryService: service,
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "structured-entry-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    committed,
    state,
    write,
    createFile,
    call: async (surface: string, batch = entries) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entries`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries: batch }),
          },
        );
        return {
          success: response.status === 200,
          result: await response.json(),
        };
      }
      if (surface === "gql") {
        const input = batch.map(({ type, entry }) => ({
          type: type.toUpperCase(),
          [type]: type === "budget" ? { ...entry, interval: "MONTHLY" } : entry,
        }));
        const response = await graphql({
          schema,
          source:
            'mutation($entries:[AddEntryInput!]!) { bulkEntries(ledgerId:"alice/main",entries:$entries) { success message } }',
          variableValues: { entries: input },
          contextValue: {
            identity: caller,
            getCurrentIdentity: () => caller,
            platform: "web",
          },
        });
        return {
          success: !response.errors,
          result: response.data?.bulkEntries,
        };
      }
      const response = await client.callTool({
        name: "addLedgerEntries",
        arguments: {
          entries: batch,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      return {
        success: !response.isError,
        result: (response.structuredContent as { result?: unknown })?.result,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

it.each([identity, { ...identity, ledgerScope: undefined }])(
  "builds identical directives across surfaces for %j",
  async (caller) => {
    const batches: unknown[][] = [];
    for (const surface of ["rest", "gql", "mcp"]) {
      const f = await fixture(caller);
      try {
        expect(await f.call(surface)).toEqual({
          success: true,
          result: { success: true, message: "Added 10 entries successfully" },
        });
        expect(f.write).toHaveBeenCalledTimes(1);
        expect(f.committed).toHaveLength(10);
        expect(f.committed[7]).toMatchObject({
          type: "custom",
          filename: "main.bean",
          item: {
            type: "budget",
            values: [
              { kind: "account", value: "Expenses:Food" },
              { kind: "text", value: "monthly" },
              { kind: "amount", ...amount },
            ],
          },
        });
        expect(f.committed[8]).toMatchObject({
          type: "document",
          filename: "main.bean",
          item: { filename: "receipt.pdf", tags: ["trip"], links: ["receipt"] },
        });
        expect(f.createFile).not.toHaveBeenCalled();
        batches.push(f.committed);
      } finally {
        await f.close();
      }
    }
    expect(batches[1]).toEqual(batches[0]);
    expect(batches[2]).toEqual(batches[0]);
  },
);

describe.each(["rest", "gql", "mcp"])(
  "structured entries via %s",
  (surface) => {
    it("retains the whole batch when the ledger refuses the commit", async () => {
      const f = await fixture();
      f.state.failCommit = true;
      try {
        expect((await f.call(surface)).success).toBe(false);
        expect(f.committed).toEqual([]);
      } finally {
        await f.close();
      }
    });
    it("refuses revoked write access before the writer", async () => {
      const f = await fixture();
      f.state.writable = false;
      try {
        expect((await f.call(surface)).success).toBe(false);
        expect(f.write).not.toHaveBeenCalled();
        expect(f.createFile).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

it.each([0, 101])(
  "preserves GraphQL batch size %s on every surface",
  async (size) => {
    for (const surface of ["rest", "gql", "mcp"]) {
      const f = await fixture();
      try {
        const batch = Array.from({ length: size }, () => entries[1]!);
        expect((await f.call(surface, batch)).success).toBe(true);
        expect(f.committed).toHaveLength(size);
        expect(f.write).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    }
  },
);

it("normalizes optional null values identically", async () => {
  const batch = [
    {
      type: "transaction",
      entry: {
        date,
        flag: "*",
        payee: null,
        narration: null,
        tags: null,
        links: null,
        meta: null,
        postings: [
          { account: "Assets:Cash", units: amount, flag: null, price: null },
        ],
      },
    },
    {
      type: "document",
      entry: {
        date,
        account: "Assets:Cash",
        filename: "receipt.pdf",
        tags: null,
        links: null,
      },
    },
  ] as unknown as LedgerEntryInput[];
  const results: unknown[][] = [];
  for (const surface of ["rest", "gql", "mcp"]) {
    const f = await fixture();
    try {
      expect((await f.call(surface, batch)).success).toBe(true);
      results.push(f.committed);
    } finally {
      await f.close();
    }
  }
  expect(results[1]).toEqual(results[0]);
  expect(results[2]).toEqual(results[0]);
});

it("refuses non-string transaction metadata before writing", async () => {
  const batch = [
    {
      type: "transaction",
      entry: { date, flag: "*", postings: [], meta: { invalid: 123 } },
    },
  ] as unknown as LedgerEntryInput[];
  for (const surface of ["rest", "gql", "mcp"]) {
    const f = await fixture();
    try {
      expect((await f.call(surface, batch)).success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  }
});
