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
import { FavaApiError } from "@/foundation/fava/api-client";

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
async function fixture(
  caller = identity,
  errorBatches: {
    message: string;
    source?: { filename: string; lineno: number };
  }[][] = [[], []],
) {
  const committed: unknown[] = [];
  const state = { writable: true, failCommit: false, unbalanced: false };
  const errorCalls = { count: 0 };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const write = jest.fn(async (_owner, _name, body) => {
    if (state.failCommit) throw new Error("Fixture commit refused");
    if (state.unbalanced)
      throw new FavaApiError(
        "entry 0: Transaction does not balance: residual 5 USD",
        400,
        {
          error: "entry 0: Transaction does not balance: residual 5 USD",
          code: "UNBALANCED",
          details: { residual: "5 USD", entry: 0 },
        },
      );
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
    // These suites exercise structured entries, not text appends; a stub that
    // refuses makes an accidental call a visible failure rather than a silent
    // undefined.
    {
      appendDirectiveText: () => {
        throw new Error("appendDirectiveText not exercised by this suite");
      },
    },
  );
  resolver = new LedgerEntryMutationResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerEntry: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const ledgerData = {
    getErrors: jest.fn(async () => {
      const batch =
        errorBatches[Math.min(errorCalls.count, errorBatches.length - 1)] ?? [];
      errorCalls.count += 1;
      return batch;
    }),
  };
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerEntryService: service,
      services: { ledgerData },
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
    call: async (
      surface: string,
      batch = entries,
      opts: { allowInvalid?: boolean } = {},
    ) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entries`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries: batch, ...opts }),
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
            'mutation($entries:[AddEntryInput!]!,$allowInvalid:Boolean) { bulkEntries(ledgerId:"alice/main",entries:$entries,allowInvalid:$allowInvalid) { success message } }',
          variableValues: { entries: input, ...opts },
          contextValue: {
            identity: caller,
            getCurrentIdentity: () => caller,
            platform: "web",
          },
        });
        return {
          success: !response.errors,
          result: response.data?.bulkEntries,
          errors: response.errors,
        };
      }
      const response = await client.callTool({
        name: "addLedgerEntries",
        arguments: {
          entries: batch,
          ...opts,
          ...(caller.ledgerScope ? {} : { ledger: "alice/main" }),
        },
      });
      return {
        success: !response.isError,
        result: (response.structuredContent as { result?: unknown })?.result,
        full: response.structuredContent,
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
        // REST and GraphQL keep the `{success, message}` contract; MCP
        // carries the write outcome (summary first, then wrote, entryHashes,
        // validation) around the same committed batch.
        const { success, result } = await f.call(surface);
        expect({ success, result }).toEqual({
          success: true,
          result:
            surface === "mcp"
              ? {
                  summary:
                    "Added 10 entries to main.bean. No new bean-check errors.",
                  success: true,
                  message: "Added 10 entries successfully",
                  files: ["main.bean"],
                  wrote: [{ path: "main.bean" }],
                  entryHashes: [],
                  validation: {
                    errorsBefore: 0,
                    errorsAfter: 0,
                    newErrors: [],
                  },
                }
              : { success: true, message: "Added 10 entries successfully" },
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

it("reports an unbalanced write in the MCP validation envelope", async () => {
  const f = await fixture(identity, [
    [],
    [
      {
        message: "Transaction does not balance: residual 5.00 USD",
        source: { filename: "main.bean", lineno: 73 },
      },
    ],
  ]);
  try {
    // The fixture mock bypasses the ledger's balance refusal to prove the
    // envelope reports the residual when a write does commit one — as happens
    // with `allowInvalid: true` below.
    const { success, result } = await f.call("mcp", [entries[0]!]);
    expect({ success, result }).toEqual({
      success: true,
      result: {
        summary:
          "Added 1 entry to main.bean. 1 new bean-check error: Transaction does not balance: residual 5.00 USD (main.bean:73)",
        success: true,
        message: "Added 1 entry successfully",
        files: ["main.bean"],
        wrote: [{ path: "main.bean" }],
        entryHashes: [],
        validation: {
          errorsBefore: 0,
          errorsAfter: 1,
          newErrors: [
            {
              message: "Transaction does not balance: residual 5.00 USD",
              source: "main.bean:73",
            },
          ],
        },
      },
    });
  } finally {
    await f.close();
  }
});

const unbalancedBatch = [
  {
    type: "transaction",
    entry: {
      date,
      flag: "*",
      postings: [
        { account: "Expenses:Food", units: { number: "10", currency: "USD" } },
        { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
      ],
    },
  },
] as unknown as LedgerEntryInput[];

describe.each(["rest", "gql", "mcp"])(
  "unbalanced entries via %s",
  (surface) => {
    it("refuses the residual with UNBALANCED and writes nothing", async () => {
      const f = await fixture();
      f.state.unbalanced = true;
      try {
        const result = await f.call(surface, unbalancedBatch);
        expect(result.success).toBe(false);
        expect(f.committed).toEqual([]);
        if (surface === "rest") {
          expect(result.result).toMatchObject({
            ok: false,
            error: {
              code: "UNBALANCED",
              message: expect.stringContaining("residual 5 USD"),
            },
          });
        } else if (surface === "gql") {
          // Raw `graphql()` bypasses Apollo's formatError, so no
          // extensions.code here — the message carries the residual, and the
          // UNBALANCED code mapping is proven in format-error.test.ts.
          expect(result.success).toBe(false);
          expect(
            (result.errors ?? []).some((error) =>
              String(error.message).includes("residual 5 USD"),
            ),
          ).toBe(true);
        } else {
          expect(result.full).toMatchObject({
            ok: false,
            error: {
              code: "UNBALANCED",
              message: expect.stringContaining("residual 5 USD"),
              hint: expect.stringContaining("allowInvalid: true"),
            },
          });
        }
      } finally {
        await f.close();
      }
    });

    it("writes the imbalance with allowInvalid and reports it", async () => {
      const f = await fixture(identity, [
        [],
        [
          {
            message: "Transaction does not balance: residual 5 USD",
            source: { filename: "main.bean", lineno: 73 },
          },
        ],
      ]);
      try {
        const result = await f.call(surface, unbalancedBatch, {
          allowInvalid: true,
        });
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.write).toHaveBeenCalledTimes(1);
        expect(f.write.mock.calls[0]?.[0]).toBe("alice");
        expect(f.write.mock.calls[0]?.[1]).toBe("main");
        expect(f.write.mock.calls[0]?.[2]).toMatchObject({
          allowInvalid: true,
        });
        if (surface === "mcp") {
          expect(result.result).toMatchObject({
            summary: expect.stringContaining("Added 1 entry to main.bean"),
            validation: {
              errorsBefore: 0,
              errorsAfter: 1,
              newErrors: [
                {
                  message: "Transaction does not balance: residual 5 USD",
                  source: "main.bean:73",
                },
              ],
            },
          });
        }
      } finally {
        await f.close();
      }
    });
  },
);

describe.each(["rest", "gql", "mcp"])("elided postings via %s", (surface) => {
  const elidedBatch = [
    {
      type: "transaction",
      entry: {
        date,
        flag: "*",
        narration: "Food",
        postings: [
          {
            account: "Expenses:Food",
            units: { number: "10.00", currency: "USD" },
          },
          { account: "Assets:Cash" },
        ],
      },
    },
  ] as unknown as LedgerEntryInput[];

  it("accepts one elided posting and writes it elided", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, elidedBatch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]).toMatchObject({
        account: "Expenses:Food",
      });
      expect(committed.item.postings[1]).not.toHaveProperty("units");
    } finally {
      await f.close();
    }
  });

  it("refuses two elided postings before committing", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          postings: [{ account: "Expenses:Food" }, { account: "Assets:Cash" }],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
      expect(f.committed).toEqual([]);
    } finally {
      await f.close();
    }
  });
});

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
