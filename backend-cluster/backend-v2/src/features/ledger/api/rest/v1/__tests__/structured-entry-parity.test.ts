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
import { MAX_BULK_ENTRIES } from "@/features/ledger/utils/bulk-entries-cap";

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
  const state = {
    writable: true,
    failCommit: false,
    unbalanced: false,
    wouldBreak: false,
    /** bcio `account_file` routing template, when the ledger routes opens. */
    accountFile: null as string | null,
    /** Files the ledger included from the entry point for this write. */
    includedFiles: [] as string[],
    /** The accounts the ledger opens, which a budget's must be among. */
    accounts: ["Assets:Cash", "Assets:Old", "Expenses:Food"],
  };
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
    // The ledger service's pre-commit check (w0/m2): entries that would add
    // bean-check errors are refused unless the caller records them anyway.
    if (state.wouldBreak && body.allowInvalid !== true) {
      const detail = "Duplicate open directive for Assets:Cash (main.bean:74)";
      throw new FavaApiError(
        `adding these entries would introduce 1 new bean-check error: ${detail}`,
        400,
        {
          error: `adding these entries would introduce 1 new bean-check error: ${detail}`,
          code: "NEW_LEDGER_ERRORS",
          details: { count: 1, detail },
        },
      );
    }
    // A dry run runs the same refusals above, then answers a preview and
    // commits nothing (w23/m7/t002). The mock cannot render beancount text —
    // content fidelity is proven at the ledger level — so it previews one
    // marker line per row, which is enough to prove the plumbing end to end.
    if (body.dryRun === true) {
      const rows = (body.entries ?? []) as {
        type?: unknown;
        filename?: unknown;
      }[];
      const byFile = new Map<string, string[]>();
      rows.forEach((row, index) => {
        const file =
          typeof row.filename === "string" ? row.filename : "main.bean";
        const lines = byFile.get(file) ?? [];
        lines.push(`# preview row ${index}: ${String(row.type)}`);
        byFile.set(file, lines);
      });
      return envelope({
        entry_hashes: [],
        included_files: [],
        preview: [...byFile].map(([path, lines]) => ({
          path,
          text: lines.join("\n"),
        })),
      });
    }
    committed.push(...body.entries);
    // The ledger answers each committed entry's hash (w23/060).
    return envelope({
      entry_hashes: body.entries.map(
        (_entry: unknown, index: number) => `hash-${index}`,
      ),
      included_files: state.includedFiles,
    });
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
          envelope({
            default_file: "main.bean",
            account_file: state.accountFile,
          }),
        getLedgerAccounts: async () =>
          envelope(
            Object.fromEntries(state.accounts.map((account) => [account, {}])),
          ),
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
      opts: {
        allowInvalid?: boolean;
        allow_invalid?: boolean;
        dryRun?: boolean;
        dry_run?: boolean;
      } = {},
      // The spelling test sends the other surface's flag untouched.
      raw = false,
    ) => {
      if (surface === "rest") {
        const { dry_run: _s1, allow_invalid: _s2, ...restOpts } = opts;
        const sent = raw ? opts : restOpts;
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/entries`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries: batch, ...sent }),
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
        // Preview selections ride a wider mutation so the shared selections
        // every existing test pins stay untouched (w23/m7/t002). The wide
        // mutation declares both flag spellings (w23/m9/t002); a missing
        // variable arrives undefined, which resolves as flag off.
        const previewing = opts.dryRun === true || opts.dry_run === true;
        const response = await graphql({
          schema,
          source: previewing
            ? 'mutation($entries:[AddEntryInput!]!,$allowInvalid:Boolean,$allow_invalid:Boolean,$dryRun:Boolean,$dry_run:Boolean) { bulkEntries(ledgerId:"alice/main",entries:$entries,allowInvalid:$allowInvalid,allow_invalid:$allow_invalid,dryRun:$dryRun,dry_run:$dry_run) { success message dryRun entryHashes preview { path text } } }'
            : 'mutation($entries:[AddEntryInput!]!,$allowInvalid:Boolean,$allow_invalid:Boolean) { bulkEntries(ledgerId:"alice/main",entries:$entries,allowInvalid:$allowInvalid,allow_invalid:$allow_invalid) { success message entryHashes } }',
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
      // MCP spells the preview flag dry_run; the camel twin rides
      // along only when the spelling test sends it raw (w23/m9/t002).
      const { dryRun: _s1, allow_invalid: _s2, ...mcpOpts } = opts;
      const sent = raw ? opts : mcpOpts;
      const response = await client.callTool({
        name: "addLedgerEntries",
        arguments: {
          entries: batch,
          ...sent,
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
        // REST and GraphQL keep the `{success, message}` contract plus the
        // committed entries' hashes (w23/060); REST also echoes the dryRun
        // flag with its preview (w23/m7/t002). MCP carries the write outcome
        // (summary first, then wrote, entryHashes, validation) around the
        // same committed batch.
        const entryHashes = Array.from(
          { length: 10 },
          (_hash, index) => `hash-${index}`,
        );
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
                  dry_run: false,
                  files: ["main.bean"],
                  preview: [],
                  wrote: [{ path: "main.bean" }],
                  entryHashes,
                  validation: {
                    errorsBefore: 0,
                    errorsAfter: 0,
                    newErrors: [],
                  },
                }
              : surface === "rest"
                ? {
                    success: true,
                    message: "Added 10 entries successfully",
                    dryRun: false,
                    entryHashes,
                    preview: [],
                  }
                : {
                    success: true,
                    message: "Added 10 entries successfully",
                    entryHashes,
                  },
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
        dry_run: false,
        files: ["main.bean"],
        preview: [],
        wrote: [{ path: "main.bean" }],
        entryHashes: ["hash-0"],
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

    // w23/m9/t003: the allow_invalid twin records like allowInvalid.
    it("writes the imbalance with the allow_invalid twin", async () => {
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
        const result = await f.call(
          surface,
          unbalancedBatch,
          {
            allow_invalid: true,
          },
          true,
        );
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.write.mock.calls[0]?.[2]).toMatchObject({
          allowInvalid: true,
        });
      } finally {
        await f.close();
      }
    });

    it("refuses one true and one false errors flag", async () => {
      const f = await fixture();
      try {
        const result = await f.call(
          surface,
          unbalancedBatch,
          {
            allowInvalid: false,
            allow_invalid: true,
          },
          true,
        );
        expect(result.success).toBe(false);
        expect(f.committed).toEqual([]);
        expect(f.write).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w23/140: pad's source and posting's total price dual-accept snake_case,
// folded to camelCase by the service — one rule, every surface.
const snakePadBatch = [
  {
    type: "pad",
    entry: {
      date,
      account: "Assets:Cash",
      source_account: "Equity:Opening-Balances",
    },
  },
] as unknown as LedgerEntryInput[];

const snakeTotalBatch = [
  {
    type: "transaction",
    entry: {
      date,
      flag: "*",
      postings: [
        { account: "Assets:Cash", units: amount, total_price: amount },
        {
          account: "Expenses:Food",
          units: { number: "-123.45", currency: "USD" },
        },
      ],
    },
  },
] as unknown as LedgerEntryInput[];

const splitPadBatch = [
  {
    type: "pad",
    entry: {
      date,
      account: "Assets:Cash",
      sourceAccount: "Equity:A",
      source_account: "Equity:B",
    },
  },
] as unknown as LedgerEntryInput[];

describe.each(["rest", "gql", "mcp"])("nested key twins via %s", (surface) => {
  it("commits a snake_case pad as its camel canonical", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, snakePadBatch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      expect(f.committed[0]).toMatchObject({
        type: "pad",
        item: { sourceAccount: "Equity:Opening-Balances" },
      });
      expect(
        "source_account" in (f.committed[0] as { item: object }).item,
      ).toBe(false);
    } finally {
      await f.close();
    }
  });

  it("commits a snake_case total price as its camel canonical", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, snakeTotalBatch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const postings = (
        f.committed[0] as { item: { postings: Record<string, unknown>[] } }
      ).item.postings;
      expect(postings[0]).toMatchObject({ totalPrice: amount });
      expect("total_price" in (postings[0] as object)).toBe(false);
    } finally {
      await f.close();
    }
  });

  it("refuses a split pad pair without writing", async () => {
    const f = await fixture();
    try {
      const result = await f.call(surface, splitPadBatch);
      expect(result.success).toBe(false);
      expect(f.committed).toEqual([]);
      expect(f.write).not.toHaveBeenCalled();
      const message =
        "pass one source account, not sourceAccount and source_account with different values.";
      if (surface === "rest") {
        expect(result.result).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(message),
          },
        });
      } else if (surface === "gql") {
        expect(
          (result.errors ?? []).some((error) =>
            String(error.message).includes(message),
          ),
        ).toBe(true);
      } else {
        expect(result.full).toMatchObject({
          ok: false,
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(message),
          },
        });
      }
    } finally {
      await f.close();
    }
  });
});

// A second `open` for an account the ledger already opens: the ledger service
// refuses it before committing, and every surface must say so the same way
// (w0/m2). The refusal's source is the ledger client, so this proves the
// adapters, not the engine's diagnosis (ledger `entries-new-errors.test.ts`).
const duplicateOpenBatch = [
  {
    type: "open",
    entry: { date, account: "Assets:Cash", currencies: ["USD"] },
  },
] as unknown as LedgerEntryInput[];

describe.each(["rest", "gql", "mcp"])(
  "entries that would break the ledger via %s",
  (surface) => {
    it("refuses them with VALIDATION_FAILED and writes nothing", async () => {
      const f = await fixture();
      f.state.wouldBreak = true;
      try {
        const result = await f.call(surface, duplicateOpenBatch);
        expect(result.success).toBe(false);
        expect(f.committed).toEqual([]);
        const named = "Duplicate open directive for Assets:Cash (main.bean:74)";
        if (surface === "rest") {
          // Apps read the named errors from `newLedgerErrors`, not the prose.
          expect(result.result).toMatchObject({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: expect.stringContaining(named),
              metadata: { field: "entries", newLedgerErrors: named },
            },
          });
        } else if (surface === "gql") {
          // Raw `graphql()` bypasses Apollo's formatError, which merges this
          // metadata into `extensions`; the category mapping is proven by the
          // REST and MCP envelopes above and below.
          const refusal = (result.errors ?? []).find((error) =>
            String(error.message).includes(named),
          );
          expect(
            (refusal?.originalError as { metadata?: unknown } | undefined)
              ?.metadata,
          ).toMatchObject({ field: "entries", newLedgerErrors: named });
        } else {
          // MCP carries the same field (w23/077), past its output schema.
          expect(result.full).toMatchObject({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: expect.stringContaining(named),
              hint: expect.stringContaining("allowInvalid: true"),
              newLedgerErrors: named,
            },
          });
        }
      } finally {
        await f.close();
      }
    });

    it("records them with allowInvalid and reports the new error", async () => {
      const f = await fixture(identity, [
        [],
        [
          {
            message: "Duplicate open directive for Assets:Cash",
            source: { filename: "main.bean", lineno: 74 },
          },
        ],
      ]);
      f.state.wouldBreak = true;
      try {
        const result = await f.call(surface, duplicateOpenBatch, {
          allowInvalid: true,
        });
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.write.mock.calls[0]?.[2]).toMatchObject({
          allowInvalid: true,
        });
        if (surface === "mcp") {
          expect(result.result).toMatchObject({
            validation: {
              errorsBefore: 0,
              errorsAfter: 1,
              newErrors: [
                {
                  message: "Duplicate open directive for Assets:Cash",
                  source: "main.bean:74",
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

// w23/071: a budget for an account the ledger lacks was added with "no new
// bean-check errors" and never applied.
describe.each(["rest", "gql", "mcp"])(
  "a budget's account via %s",
  (surface) => {
    const budget = (account: string): LedgerEntryInput => ({
      type: "budget",
      entry: { date, account, interval: "monthly", amount },
    });
    it("refuses one the ledger does not open, naming it", async () => {
      const f = await fixture();
      try {
        const outcome = await f.call(surface, [budget("Expenses:NopeQa")]);
        expect(outcome.success).toBe(false);
        const refusal = {
          code: "VALIDATION_FAILED",
          message: expect.stringContaining(
            "budget account Expenses:NopeQa is not opened in this ledger, nor is any account under it; nearest: Expenses:Food",
          ),
        };
        if (surface === "rest")
          expect(outcome.result).toMatchObject({ error: refusal });
        if (surface === "mcp")
          expect(outcome.full).toMatchObject({ error: refusal });
        if (surface === "gql") {
          expect(outcome.errors?.[0].originalError).toMatchObject({
            category: "VALIDATION_FAILED",
            message: refusal.message,
          });
        }
        expect(f.write).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
    it.each(["Expenses:Food", "Expenses"])("accepts %s", async (account) => {
      const f = await fixture();
      try {
        expect((await f.call(surface, [budget(account)])).success).toBe(true);
        expect(f.write).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });
    it("records an unknown one with allowInvalid", async () => {
      const f = await fixture();
      try {
        const outcome = await f.call(surface, [budget("Expenses:NopeQa")], {
          allowInvalid: true,
        });
        expect(outcome.success).toBe(true);
        expect(f.committed).toHaveLength(1);
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

  it("refuses a price without units before committing (w23/079)", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "px",
          postings: [
            {
              account: "Assets:Cash",
              price: { number: "1", currency: "USD" },
            },
            {
              account: "Equity:Initial",
              units: { number: "-10", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
      expect(f.committed).toEqual([]);
      const text = JSON.stringify("errors" in result ? result.errors : result);
      expect(text).toContain("entry 0: postings[0].price needs units");
      expect(text).toContain("can't carry a price");
    } finally {
      await f.close();
    }
  });

  // w23/m6/t002: the note's repro — a dateless cost commits, with no date
  // defaulted onto the wire (a defaulted date would change booking meaning).
  it("writes a posting with a dateless cost", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "lot",
          postings: [
            {
              account: "Assets:Broker",
              units: { number: "10", currency: "HOOLI" },
              cost: { number: "100", currency: "USD" },
            },
            {
              account: "Assets:Cash",
              units: { number: "-1000", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]).toMatchObject({
        cost: { number: "100", currency: "USD" },
      });
      expect(committed.item.postings[0]?.cost).not.toHaveProperty("date");
    } finally {
      await f.close();
    }
  });

  it("writes a cost with date and label", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "lot",
          postings: [
            {
              account: "Assets:Broker",
              units: { number: "10", currency: "HOOLI" },
              cost: {
                number: "100",
                currency: "USD",
                date: "2024-01-15",
                label: "lot-a",
              },
            },
            {
              account: "Assets:Cash",
              units: { number: "-1000", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]).toMatchObject({
        cost: {
          number: "100",
          currency: "USD",
          date: "2024-01-15",
          label: "lot-a",
        },
      });
    } finally {
      await f.close();
    }
  });

  it("refuses a cost without units before committing", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "lot",
          postings: [
            {
              account: "Assets:Broker",
              cost: { number: "100", currency: "USD" },
            },
            {
              account: "Assets:Cash",
              units: { number: "-1000", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(false);
      expect(f.write).not.toHaveBeenCalled();
      expect(f.committed).toEqual([]);
      const text = JSON.stringify("errors" in result ? result.errors : result);
      expect(text).toContain("entry 0: postings[0].cost needs units");
      expect(text).toContain("can't carry a cost");
    } finally {
      await f.close();
    }
  });
});

describe.each(["rest", "gql", "mcp"])("posting meta via %s", (surface) => {
  // w23/m6/t003: posting metadata, tags, and links commit on the wire row.
  it("writes a posting with meta, tags, and links", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "annotated",
          postings: [
            {
              account: "Expenses:Food",
              units: { number: "10", currency: "USD" },
              tags: ["receipt"],
              links: ["order-1"],
              meta: { receipt: "r-1" },
            },
            {
              account: "Assets:Cash",
              units: { number: "-10", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]).toMatchObject({
        tags: ["receipt"],
        links: ["order-1"],
        meta: { receipt: "r-1" },
      });
    } finally {
      await f.close();
    }
  });

  it("writes a posting with tags alone", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "tagged",
          postings: [
            {
              account: "Expenses:Food",
              units: { number: "10", currency: "USD" },
              tags: ["receipt"],
            },
            {
              account: "Assets:Cash",
              units: { number: "-10", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]).toMatchObject({
        tags: ["receipt"],
      });
      expect(committed.item.postings[0]?.links).toBeUndefined();
      expect(committed.item.postings[0]?.meta).toBeUndefined();
    } finally {
      await f.close();
    }
  });

  it("leaves plain postings without meta, tags, or links keys", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "plain",
          postings: [
            {
              account: "Expenses:Food",
              units: { number: "10", currency: "USD" },
            },
            {
              account: "Assets:Cash",
              units: { number: "-10", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.committed).toHaveLength(1);
      const committed = f.committed[0] as {
        item: { postings: Record<string, unknown>[] };
      };
      expect(committed.item.postings[0]?.tags).toBeUndefined();
      expect(committed.item.postings[0]?.links).toBeUndefined();
      expect(committed.item.postings[0]?.meta).toBeUndefined();
    } finally {
      await f.close();
    }
  });
});

describe.each(["rest", "gql", "mcp"])(
  "booking and tolerance via %s",
  (surface) => {
    // w23/m6/t009: booking commits on the open wire row.
    it("writes an open with a booking method", async () => {
      const batch = [
        {
          type: "open",
          entry: {
            date,
            account: "Assets:Broker",
            currencies: ["HOOLI"],
            booking: "FIFO",
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.committed[0]).toMatchObject({
          item: { booking: "FIFO" },
        });
      } finally {
        await f.close();
      }
    });

    // w23/m6/t009: tolerance commits on the balance wire row.
    it("writes a balance with a tolerance", async () => {
      const batch = [
        {
          type: "balance",
          entry: {
            date,
            account: "Assets:Cash",
            amount: { number: "100", currency: "USD" },
            tolerance: "0.01",
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.committed[0]).toMatchObject({
          item: { tolerance: "0.01" },
        });
      } finally {
        await f.close();
      }
    });

    // w23/m6/t009: the booking enum refuses unknown methods on every surface.
    it("refuses an unknown booking method before committing", async () => {
      const batch = [
        {
          type: "open",
          entry: {
            date,
            account: "Assets:Broker",
            currencies: ["HOOLI"],
            booking: "AVERAGE",
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
  },
);

describe.each(["rest", "gql", "mcp"])(
  "total price and pad via %s",
  (surface) => {
    // w23/m6/t010: a total price commits on the posting wire row.
    it("writes a posting with a total price", async () => {
      const batch = [
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "buy",
            postings: [
              {
                account: "Assets:Broker",
                units: { number: "10", currency: "HOOLI" },
                totalPrice: { number: "1000", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-1000", currency: "USD" },
              },
            ],
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        const committed = f.committed[0] as {
          item: { postings: Record<string, unknown>[] };
        };
        expect(committed.item.postings[0]).toMatchObject({
          totalPrice: { number: "1000", currency: "USD" },
        });
      } finally {
        await f.close();
      }
    });

    // w23/m6/t010: pad commits as its own wire row.
    it("writes a pad entry", async () => {
      const batch = [
        {
          type: "pad",
          entry: {
            date,
            account: "Assets:Cash",
            sourceAccount: "Equity:Opening-Balances",
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
        expect(f.committed[0]).toMatchObject({
          type: "pad",
          item: {
            account: "Assets:Cash",
            sourceAccount: "Equity:Opening-Balances",
          },
        });
      } finally {
        await f.close();
      }
    });

    // w23/m6/t010: price and totalPrice exclude each other on every surface.
    it("refuses a posting with both price and total price", async () => {
      const batch = [
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "buy",
            postings: [
              {
                account: "Assets:Broker",
                units: { number: "10", currency: "HOOLI" },
                price: { number: "100", currency: "USD" },
                totalPrice: { number: "1000", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-1000", currency: "USD" },
              },
            ],
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(false);
        expect(f.write).not.toHaveBeenCalled();
        expect(f.committed).toEqual([]);
        const text = JSON.stringify(
          "errors" in result ? result.errors : result,
        );
        expect(text).toContain(
          "entry 0: postings[0].totalPrice excludes price",
        );
        expect(text).toContain("can't carry both");
      } finally {
        await f.close();
      }
    });

    // w23/m6/t007: a total price needs units, like every other price.
    it("refuses a total price without units before committing", async () => {
      const batch = [
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "buy",
            postings: [
              {
                account: "Assets:Broker",
                totalPrice: { number: "1000", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-1000", currency: "USD" },
              },
            ],
          },
        },
      ] as unknown as LedgerEntryInput[];
      const f = await fixture();
      try {
        const result = await f.call(surface, batch);
        expect(result.success).toBe(false);
        expect(f.write).not.toHaveBeenCalled();
        expect(f.committed).toEqual([]);
        const text = JSON.stringify(
          "errors" in result ? result.errors : result,
        );
        expect(text).toContain("entry 0: postings[0].totalPrice needs units");
        expect(text).toContain("can't carry a total price");
      } finally {
        await f.close();
      }
    });
  },
);

describe.each(["rest", "gql", "mcp"])("typed add preview via %s", (surface) => {
  // MCP spells the preview flag dry_run; REST and GraphQL dryRun (w23/m7/t002).
  const previewOpts = () =>
    surface === "mcp" ? { dry_run: true } : { dryRun: true };

  // w23/m7/t002: a dry run previews without committing on every surface.
  it("previews a batch without committing it", async () => {
    const batch = [
      {
        type: "transaction",
        entry: {
          date,
          flag: "*",
          narration: "previewed",
          postings: [
            {
              account: "Expenses:Food",
              units: { number: "10", currency: "USD" },
            },
            {
              account: "Assets:Cash",
              units: { number: "-10", currency: "USD" },
            },
          ],
        },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch, previewOpts());
      expect(result.success).toBe(true);
      expect(f.committed).toEqual([]);
      // The checks still ran ledger-side: the hop went out flagged dryRun.
      expect(f.write).toHaveBeenCalled();
      expect(f.write.mock.calls[0]?.[2]).toMatchObject({ dryRun: true });
      const body = result.result as Record<string, unknown>;
      if (surface === "mcp") {
        expect(body).toMatchObject({
          dry_run: true,
          entryHashes: [],
          wrote: [],
          preview: [
            {
              path: "main.bean",
              text: expect.stringContaining("# preview row 0: transaction"),
            },
          ],
        });
      } else {
        expect(body).toMatchObject({
          dryRun: true,
          entryHashes: [],
          preview: [
            {
              path: "main.bean",
              text: expect.stringContaining("# preview row 0: transaction"),
            },
          ],
        });
      }
    } finally {
      await f.close();
    }
  });

  // w23/m7/t002: a dry run refuses imbalance exactly as the commit would.
  it("refuses an unbalanced batch on a dry run", async () => {
    const f = await fixture();
    f.state.unbalanced = true;
    try {
      const result = await f.call(surface, unbalancedBatch, previewOpts());
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
        // extensions.code here — the message carries the residual.
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
          },
        });
      }
    } finally {
      await f.close();
    }
  });

  // w23/m7/t008: a preview runs the same checks — entries that would add
  // a bean-check error refuse on a dry run exactly as on a commit.
  it("refuses breaking entries on a dry run", async () => {
    const f = await fixture();
    f.state.wouldBreak = true;
    try {
      const result = await f.call(surface, duplicateOpenBatch, previewOpts());
      expect(result.success).toBe(false);
      expect(f.committed).toEqual([]);
      const named = "Duplicate open directive for Assets:Cash (main.bean:74)";
      if (surface === "rest") {
        expect(result.result).toMatchObject({
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining(named),
            metadata: { field: "entries", newLedgerErrors: named },
          },
        });
      } else if (surface === "gql") {
        const refusal = (result.errors ?? []).find((error) =>
          String(error.message).includes(named),
        );
        expect(
          (refusal?.originalError as { metadata?: unknown } | undefined)
            ?.metadata,
        ).toMatchObject({ field: "entries", newLedgerErrors: named });
      } else {
        expect(result.full).toMatchObject({
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: expect.stringContaining(named),
            hint: expect.stringContaining("allowInvalid: true"),
            newLedgerErrors: named,
          },
        });
      }
    } finally {
      await f.close();
    }
  });

  // w23/m7/t002: the preview message says what would happen, not what did.
  it("says Would add on a dry run", async () => {
    const batch = [
      {
        type: "open",
        entry: { date, account: "Assets:New", currencies: ["USD"] },
      },
    ] as unknown as LedgerEntryInput[];
    const f = await fixture();
    try {
      const result = await f.call(surface, batch, previewOpts());
      expect(result.success).toBe(true);
      const body = result.result as Record<string, unknown>;
      const text = String(surface === "mcp" ? body.summary : body.message);
      expect(text).toContain("Would add 1 entry");
      expect(text).not.toContain("Added 1 entry");
    } finally {
      await f.close();
    }
  });

  // w23/m9/t002: MCP spells the flag dry_run, REST and GraphQL dryRun;
  // each surface accepts the other's spelling as a twin that previews
  // without writing.
  it("accepts the other surface's preview spelling", async () => {
    const f = await fixture();
    try {
      const batch = [
        {
          type: "open",
          entry: { date, account: "Assets:New", currencies: ["USD"] },
        },
      ] as unknown as LedgerEntryInput[];
      const result = await f.call(
        surface,
        batch,
        surface === "mcp" ? { dryRun: true } : { dry_run: true },
        true,
      );
      expect(result.success).toBe(true);
      const body = result.result as Record<string, unknown>;
      expect(body.dryRun ?? body.dry_run).toBe(true);
      // The preview threads past the hop with the flag on, committing nothing.
      expect(f.write).toHaveBeenCalledTimes(1);
      expect(f.write).toHaveBeenCalledWith(
        "alice",
        "main",
        expect.objectContaining({ dryRun: true }),
        expect.anything(),
      );
      expect(f.committed).toEqual([]);
    } finally {
      await f.close();
    }
  });

  // w23/m9/t002: one true and one false is refused before the writer runs.
  it("refuses one true and one false preview flag", async () => {
    const f = await fixture();
    try {
      const batch = [
        {
          type: "open",
          entry: { date, account: "Assets:New", currencies: ["USD"] },
        },
      ] as unknown as LedgerEntryInput[];
      const result = await f.call(
        surface,
        batch,
        { dry_run: true, dryRun: false },
        true,
      );
      expect(result.success).toBe(false);
      expect(f.committed).toEqual([]);
      expect(f.write).not.toHaveBeenCalled();
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

describe.each(["rest", "gql", "mcp"])(
  "malformed amounts via %s (w3/641)",
  (surface) => {
    const posting = (number: string) => ({
      account: "Expenses:Food",
      units: { number, currency: "USD" },
    });
    const cases: Array<[string, LedgerEntryInput, string]> = [
      [
        "a parenthesized posting",
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "Food",
            postings: [posting("(12.50)"), { account: "Assets:Cash" }],
          },
        } as LedgerEntryInput,
        'entry 0: postings[0].units.number "(12.50)" is not a decimal number',
      ],
      [
        "a grouped posting",
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "Food",
            postings: [posting("-1,234.56"), posting("1,234.56")],
          },
        } as LedgerEntryInput,
        'entry 0: postings[0].units.number "-1,234.56" is not a decimal number',
      ],
      [
        "a balance",
        {
          type: "balance",
          entry: {
            date,
            account: "Assets:Cash",
            amount: { number: "abc", currency: "USD" },
          },
        } as LedgerEntryInput,
        'entry 0: amount.number "abc" is not a decimal number',
      ],
      [
        "a price",
        {
          type: "price",
          entry: {
            date,
            currency: "XYZ",
            amount: { number: "$4.50", currency: "USD" },
          },
        } as LedgerEntryInput,
        'entry 0: amount.number "$4.50" is not a decimal number',
      ],
      [
        "a budget",
        {
          type: "budget",
          entry: {
            date,
            account: "Expenses:Food",
            interval: "monthly",
            amount: { number: "1.000,00", currency: "EUR" },
          },
        } as unknown as LedgerEntryInput,
        'entry 0: amount.number "1.000,00" is not a decimal number',
      ],
      // w23/m6/t007: cost numbers ride the same decimal refusal.
      [
        "a cost",
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "Buy",
            postings: [
              {
                account: "Assets:Broker",
                units: { number: "10", currency: "HOOLI" },
                cost: { number: "abc", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-1000", currency: "USD" },
              },
            ],
          },
        } as LedgerEntryInput,
        'entry 0: postings[0].cost.number "abc" is not a decimal number',
      ],
      // w23/m6/t010: total-price numbers ride the same decimal refusal.
      [
        "a total price",
        {
          type: "transaction",
          entry: {
            date,
            flag: "*",
            narration: "Buy",
            postings: [
              {
                account: "Assets:Broker",
                units: { number: "10", currency: "HOOLI" },
                totalPrice: { number: "abc", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-1000", currency: "USD" },
              },
            ],
          },
        } as unknown as LedgerEntryInput,
        'entry 0: postings[0].totalPrice.number "abc" is not a decimal number',
      ],
      // w23/m6/t009: tolerance rides the same decimal refusal.
      [
        "a balance tolerance",
        {
          type: "balance",
          entry: {
            date,
            account: "Assets:Cash",
            amount: { number: "100", currency: "USD" },
            tolerance: "abc",
          },
        } as LedgerEntryInput,
        'entry 0: tolerance "abc" is not a decimal number',
      ],
    ];

    it.each(cases)(
      "refuses %s as bad input naming the field, writing nothing",
      async (_name, entry, message) => {
        const f = await fixture();
        try {
          const result = await f.call(surface, [entry]);
          expect(result.success).toBe(false);
          expect(f.write).not.toHaveBeenCalled();
          expect(f.committed).toEqual([]);
          const text = JSON.stringify(
            "errors" in result ? result.errors : result,
          );
          expect(text).toContain(JSON.stringify(message).slice(1, -1));
          expect(text).not.toMatch(
            /SERVICE_UNAVAILABLE|temporarily unavailable/,
          );
        } finally {
          await f.close();
        }
      },
    );

    it.each(["-3.21", "1e-7"])("still writes %s", async (number) => {
      const f = await fixture();
      try {
        const result = await f.call(surface, [
          {
            type: "transaction",
            entry: {
              date,
              flag: "*",
              narration: "Food",
              postings: [posting(number), { account: "Assets:Cash" }],
            },
          } as LedgerEntryInput,
        ]);
        expect(result.success).toBe(true);
        expect(f.committed).toHaveLength(1);
      } finally {
        await f.close();
      }
    });
  },
);

/** w4/m38: years 0001–0099 are real dates, not 1900s, on every surface. */
describe.each(["rest", "gql", "mcp"])(
  "early-year entries via %s",
  (surface) => {
    const open = (date: string) => [
      {
        type: "open" as const,
        entry: {
          date,
          account: "Assets:Qa-20261020:Date",
          currencies: ["USD"],
        },
      },
    ];

    it.each([
      ["0001-01-01", "accounts/0001.bean"],
      ["0099-01-01", "accounts/0099.bean"],
      ["0100-01-01", "accounts/0100.bean"],
    ])("writes %s exactly once, routed to %s", async (date, filename) => {
      const f = await fixture();
      f.state.accountFile = "accounts/{year}.bean";
      try {
        expect((await f.call(surface, open(date))).success).toBe(true);
        expect(f.write).toHaveBeenCalledTimes(1);
        expect(f.committed).toEqual([
          expect.objectContaining({
            type: "open",
            filename,
            item: expect.objectContaining({ date }),
          }),
        ]);
      } finally {
        await f.close();
      }
    });

    it("refuses year 0000 atomically, with the rest of its batch", async () => {
      const f = await fixture();
      try {
        const result = await f.call(surface, [
          ...open("0099-01-01"),
          ...open("0000-01-01"),
        ]);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result)).toContain("0000-01-01");
        expect(f.write).not.toHaveBeenCalled();
        expect(f.committed).toEqual([]);
      } finally {
        await f.close();
      }
    });
  },
);

// w23/062: the ledger includes a routed file nothing loaded; every surface
// says so, and MCP lists the entry point among the files written.
describe.each(["rest", "gql", "mcp"])(
  "a routed file the ledger includes via %s",
  (surface) => {
    it("names the include in the result", async () => {
      const f = await fixture();
      f.state.accountFile = "accounts/{year}.bean";
      f.state.includedFiles = ["accounts/2028.bean"];
      try {
        const result = await f.call(surface, [
          {
            type: "open" as const,
            entry: {
              date: "2028-01-04",
              account: "Assets:Qa-20261022:Routed",
              currencies: ["USD"],
            },
          },
        ]);
        expect(result.success).toBe(true);
        const note = "main.bean now includes accounts/2028.bean";
        const data = result.result as {
          message?: string;
          summary?: string;
          wrote?: { path: string }[];
        };
        expect(data.message).toBe(`Added 1 entry successfully; ${note}`);
        if (surface === "mcp") {
          expect(data.summary).toContain(
            `Added 1 entry to accounts/2028.bean; ${note}`,
          );
          expect(data.wrote).toEqual([
            { path: "accounts/2028.bean" },
            { path: "main.bean" },
          ]);
        }
      } finally {
        await f.close();
      }
    });
  },
);

const overCapBatch = Array.from({ length: MAX_BULK_ENTRIES + 1 }, () => ({
  type: "note",
  entry: { date, account: "Assets:Cash", content: "bulk" },
})) as unknown as LedgerEntryInput[];

describe.each(["rest", "gql", "mcp"])(
  "over-cap entry batches via %s",
  (surface) => {
    // w23/103: one call carries at most MAX_BULK_ENTRIES entries; the
    // refusal names the cap and tells the caller to chunk.
    it("refuses 1001 entries and writes nothing", async () => {
      const f = await fixture();
      try {
        const result = await f.call(surface, overCapBatch);
        expect(result.success).toBe(false);
        expect(f.committed).toEqual([]);
        expect(f.write).not.toHaveBeenCalled();
        if (surface === "rest") {
          // Schema refusals leave as VALIDATION_FAILED on REST — the REST
          // dialect of the same refusal (validation-middleware).
          expect(result.result).toMatchObject({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: expect.stringContaining(
                "at most 1000 entries per call; split into several calls",
              ),
            },
          });
        } else if (surface === "gql") {
          expect(
            (result.errors ?? []).some(
              (error) =>
                String(error.message).includes("entries holds 1001 entries") &&
                String(error.message).includes("Split into several calls"),
            ),
          ).toBe(true);
        } else {
          expect(result.full).toMatchObject({
            ok: false,
            error: {
              code: "BAD_USER_INPUT",
              message: expect.stringContaining("at most 1000 entries"),
            },
          });
        }
      } finally {
        await f.close();
      }
    });
  },
);

// The cap boundary itself still commits: MAX_BULK_ENTRIES notes through
// the schema max and the service assert on one surface.
it("commits exactly 1000 entries on REST", async () => {
  const f = await fixture();
  try {
    const batch = Array.from({ length: MAX_BULK_ENTRIES }, () => ({
      type: "note",
      entry: { date, account: "Assets:Cash", content: "bulk" },
    })) as unknown as LedgerEntryInput[];
    const result = await f.call("rest", batch);
    expect(result.success).toBe(true);
    expect(f.write).toHaveBeenCalled();
  } finally {
    await f.close();
  }
});

// w23/105: the four types with no typed form refuse naming the exclusion
// and the raw-text way out, instead of just listing the accepted set.
it.each(["custom", "query", "option", "plugin"])(
  "refuses %s naming the deliberate exclusion on REST and MCP",
  async (type) => {
    const f = await fixture();
    try {
      const batch = [{ type, entry: {} }] as never;
      const rest = await f.call("rest", batch);
      expect(rest.success).toBe(false);
      expect(rest.result).toMatchObject({
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: expect.stringContaining("deliberately excluded"),
        },
      });
      expect(String(
        (rest.result as { error: { message: string } }).error.message,
      )).toContain("raw text via file writes");
      const mcp = await f.call("mcp", batch);
      expect(mcp.success).toBe(false);
      expect(mcp.full).toMatchObject({
        ok: false,
        error: {
          code: "BAD_USER_INPUT",
          message: expect.stringContaining("deliberately excluded"),
        },
      });
      expect(f.write).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  },
);

// w23/106: stock beancount accepts a currency-less open; the typed path
// used to invent the requirement. Absent renders bare (currencies []).
it.each(["rest", "gql", "mcp"])(
  "accepts a currency-less open on %s",
  async (surface) => {
    const f = await fixture();
    try {
      const batch = [
        { type: "open", entry: { date, account: "Assets:New" } },
      ] as unknown as LedgerEntryInput[];
      const result = await f.call(surface, batch);
      expect(result.success).toBe(true);
      expect(f.write).toHaveBeenCalled();
      expect(f.committed).toHaveLength(1);
      expect(f.committed[0]).toMatchObject({
        type: "open",
        item: { account: "Assets:New", currencies: [] },
      });
    } finally {
      await f.close();
    }
  },
);
