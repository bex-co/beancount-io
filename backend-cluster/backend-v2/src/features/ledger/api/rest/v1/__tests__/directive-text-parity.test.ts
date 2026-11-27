import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerEntryMutationResolver } from "../../../resolvers/ledger-entry-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import {
  LedgerEntryService,
  createLedgerEntryWriter,
} from "@/features/ledger/service/ledger-entry-service";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { DirectiveAppendWorkflow } from "@/features/ledger/workflow/directive-append-workflow";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { formatError } from "@/server/graphql/format-error";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import { fakeRedisIdempotencyState } from "@/foundation/redis/__tests__/fake-redis-idempotency";

jest.mock(
  "@/foundation/redis/redis-idempotency",
  () =>
    jest.requireActual("@/foundation/redis/__tests__/fake-redis-idempotency")
      .fakeRedisIdempotency,
);

/**
 * w2/m28:t005 — `appendLedgerText` on all three surfaces.
 *
 * The audit's agents wrote Beancount and had nowhere to put it: the
 * structured entry schema is 5 KB of contract, so they reached for
 * `editLedgerFiles` and appended to `main.bean` by hand, out of date order.
 * These run the real service against a fake ledger and assert what an agent
 * would observe — where the text lands, what a refusal says, and that a dry
 * run leaves the repository untouched.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

const TXN = [
  '2026-02-05 * "Cafe" "Coffee"',
  "  Expenses:Food    4.50 USD",
  "  Assets:Cash     -4.50 USD",
].join("\n");

const EXISTING = [
  'option "title" "T"',
  "",
  '2026-01-05 * "Jan" ""',
  "  Expenses:Food   1.00 USD",
  "  Assets:Cash    -1.00 USD",
  "",
  '2026-03-05 * "Mar" ""',
  "  Expenses:Food   2.00 USD",
  "  Assets:Cash    -2.00 USD",
  "",
].join("\n");

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

type Commit = {
  files: { operation: string; path: string; content?: string | null }[];
  message: string;
};

async function fixture(caller = identity) {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const state = {
    files: new Map<string, string>([["main.bean", EXISTING]]),
    /** Errors the projected check reports for the overlaid ledger. */
    projectedErrors: [] as { message: string; source?: null }[],
    /** Errors the ledger already has: the check with no overlay. */
    baselineErrors: [] as { message: string; source?: null }[],
    /**
     * When set, both checks derive the errors from the files instead, with
     * the overlays applied: where an error is reported is under test (w31/116).
     */
    errorsOf: undefined as
      | undefined
      | ((files: ReadonlyMap<string, string>) => {
          message: string;
          source: { filename: string; lineno: number };
        }[]),
    routeTransactionsTo: null as string | null,
    /** The ledger's include closure; every fixture file unless narrowed. */
    sourceFiles: undefined as string[] | undefined,
    /** Opened accounts in the ledger, for custom "budget" checks (w31/094). */
    accounts: [
      "Assets:Cash",
      "Expenses:Food:Coffee",
      "Expenses:Food:Groceries",
    ] as string[],
  };
  const commits: Commit[] = [];
  const getLedgerAccounts = jest.fn(async () =>
    envelope(Object.fromEntries(state.accounts.map((a) => [a, {}]))),
  );

  const changeLedgerFiles = jest.fn(async (_o, _n, body: Commit) => {
    commits.push(body);
    for (const file of body.files) {
      state.files.set(
        file.path,
        Buffer.from(file.content ?? "", "base64").toString("utf8"),
      );
    }
    return envelope(null);
  });
  const checkProjectedErrors = jest.fn(
    async (_o, _n, body: { files: { path: string; content: string }[] }) => {
      if (state.errorsOf) {
        const projected = new Map(state.files);
        for (const file of body.files) {
          projected.set(
            file.path,
            Buffer.from(file.content, "base64").toString("utf8"),
          );
        }
        return envelope(state.errorsOf(projected));
      }
      // No overlay is the baseline read; an overlay is the projection.
      return envelope(
        body.files.length === 0 ? state.baselineErrors : state.projectedErrors,
      );
    },
  );

  // The projected include closure: the narrowed closure when a test sets one
  // (a new file stays out of it), otherwise every file and overlay (w23/062).
  const getProjectedSourceFiles = jest.fn(
    async (_o, _n, body: { files: { path: string }[] }) =>
      envelope(
        state.sourceFiles ?? [
          ...state.files.keys(),
          ...body.files.map((file) => file.path),
        ],
      ),
  );

  // The ledger's entry IDs, scripted as the location each was asked for.
  const getProjectedEntryIds = jest.fn(
    async (
      _o,
      _n,
      body: {
        files: { path: string; content: string }[];
        locations: { path: string; line: number }[];
      },
    ) =>
      envelope({
        entry_hashes: body.locations.map(
          ({ path, line }) => `hash-${path}:${line}`,
        ),
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
            envelope({ permission: "write" }),
        },
      },
    }),
    getPublicApiClient: async () => ({
      entries: { addBulkEntries: jest.fn() },
      reports: {
        getLedgerAccounts,
        getLedgerBcioOptions: async () =>
          envelope({
            default_file: "main.bean",
            transaction_file: state.routeTransactionsTo,
          }),
        checkProjectedErrors,
        getProjectedEntryIds,
        getProjectedSourceFiles,
        getLedgerSourceFiles: async () =>
          envelope(state.sourceFiles ?? [...state.files.keys()]),
      },
      ledgers: {
        getLedgerFile: async (_o: string, _n: string, q: { path: string }) =>
          envelope(
            state.files.has(q.path)
              ? {
                  path: q.path,
                  sha: `sha-${q.path}`,
                  content: state.files.get(q.path),
                }
              : null,
          ),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) =>
          // Missing files are absent from the result, not an error — that is
          // how the append tells a create from an update.
          envelope(
            body.files
              .filter((path) => state.files.has(path))
              .map((path) => ({
                path,
                sha: `sha-${path}`,
                content: state.files.get(path),
              })),
          ),
        changeLedgerFiles,
      },
    }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: caller.userId, ledger_username: "alice" }),
    },
  };
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      {} as never,
      models as never,
      {} as never,
      fava as never,
    ),
  );
  const service = new LedgerEntryService(
    createLedgerEntryWriter(fava as never),
    authorization,
    new DirectiveAppendWorkflow(
      new LedgerRepoService(fava as never, authorization),
      fava as never,
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
      services: {},
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "directive-text-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  type Args = {
    text: string;
    path?: string;
    dryRun?: boolean;
    // w23/m9/t002: the twin spelling, sent only by the spelling tests.
    dry_run?: boolean;
    allowInvalid?: boolean;
    // w23/m9/t003: the errors twin, likewise raw-only.
    allow_invalid?: boolean;
    requestId?: string;
  };
  return {
    state,
    commits,
    changeLedgerFiles,
    checkProjectedErrors,
    getProjectedEntryIds,
    getLedgerAccounts,
    call: async (
      surface: "rest" | "gql" | "mcp",
      args: Args,
      // The spelling tests send the flag untouched.
      raw = false,
    ) => {
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/directives/text`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(args),
          },
        );
        const body = await response.json();
        return response.status === 200
          ? { ok: true as const, data: body }
          : { ok: false as const, error: body.error };
      }
      if (surface === "gql") {
        const result = await graphql({
          schema,
          source: `mutation { appendLedgerText(ledgerId: "alice/main", text: ${JSON.stringify(args.text)}${args.path !== undefined ? `, path: ${JSON.stringify(args.path)}` : ""}${args.dryRun !== undefined ? `, dryRun: ${args.dryRun}` : ""}${args.dry_run !== undefined ? `, dry_run: ${args.dry_run}` : ""}${args.allowInvalid !== undefined ? `, allowInvalid: ${args.allowInvalid}` : ""}${args.allow_invalid !== undefined ? `, allow_invalid: ${args.allow_invalid}` : ""}${args.requestId !== undefined ? `, requestId: ${JSON.stringify(args.requestId)}` : ""}) { success message dryRun count wrote { path line } entryHashes diff { path diff } errorsBefore errorsAfter newErrors { message source } valid appendedUnsorted } }`,
          contextValue: {
            identity: caller,
            getCurrentIdentity: () => caller,
            platform: "web",
          },
        });
        if (result.errors)
          return { ok: false as const, error: result.errors[0] };
        const data = (result.data as Record<string, unknown>)
          .appendLedgerText as { newErrors: { source?: string | null }[] };
        return {
          ok: true as const,
          data: {
            ...data,
            // A null `source` is the other surfaces' absent one.
            newErrors: data.newErrors.map(({ source, ...error }) => ({
              ...error,
              ...(source != null && { source }),
            })),
          },
        };
      }
      const result = await client.callTool({
        name: "appendLedgerText",
        arguments: {
          text: args.text,
          ...(args.path !== undefined && { path: args.path }),
          ...(args.requestId && { requestId: args.requestId }),
          ...(raw
            ? {
                ...(args.dryRun !== undefined ? { dryRun: args.dryRun } : {}),
                ...(args.dry_run !== undefined
                  ? { dry_run: args.dry_run }
                  : {}),
              }
            : { ...(args.dryRun && { dry_run: true }) }),
          ...(raw
            ? {
                ...(args.allowInvalid !== undefined
                  ? { allowInvalid: args.allowInvalid }
                  : {}),
                ...(args.allow_invalid !== undefined
                  ? { allow_invalid: args.allow_invalid }
                  : {}),
              }
            : { ...(args.allowInvalid && { allowInvalid: true }) }),
        },
      });
      const structured = result.structuredContent as Record<string, never>;
      return result.isError
        ? { ok: false as const, error: structured.error }
        : { ok: true as const, data: structured.result };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("appending Beancount text through the real adapters", () => {
  it.each(["rest", "gql", "mcp"] as const)(
    "threads a directive into date order and reports where it landed via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const result = await f.call(surface, { text: TXN });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.count).toBe(1);
        expect(data.wrote).toEqual([{ path: "main.bean", line: 7 }]);
        // The reported line is where the directive actually is.
        expect(f.state.files.get("main.bean")!.split("\n")[6]).toBe(
          '2026-02-05 * "Cafe" "Coffee"',
        );
        // Its hash, located in the committed text (w23/060).
        expect(data.entryHashes).toEqual(["hash-main.bean:7"]);
        const [, , located] = f.getProjectedEntryIds.mock.calls[0]!;
        expect(
          Buffer.from(located.files[0]!.content, "base64").toString("utf8"),
        ).toBe(f.state.files.get("main.bean"));
        expect(data.appendedUnsorted).toEqual([]);

        const dates = [
          ...f.state.files
            .get("main.bean")!
            .matchAll(/^(\d{4}-\d{2}-\d{2}) \*/gm),
        ].map((match) => match[1]);
        expect(dates).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
        expect(f.commits).toHaveLength(1);
        expect(f.commits[0].message).toBe("Add 1 directive to main.bean");
      } finally {
        await f.close();
      }
    },
  );

  // w31/015: threaded by date into main.bean's own `pushtag`/`pushmeta`
  // scopes, the entries took a tag and metadata their text never had.
  it.each(["rest", "gql", "mcp"] as const)(
    "keeps appended entries out of the file's pushtag and pushmeta scopes via %s",
    async (surface) => {
      const txn = (date: string, payee: string, tag = "") =>
        [
          `${date} * "${payee}" "n"${tag}`,
          "  Expenses:Food   1.00 USD",
          "  Assets:Cash",
        ].join("\n");
      const scoped = [
        "pushtag #trip",
        txn("2026-09-02", "A"),
        "poptag #trip",
        "",
        txn("2026-09-03", "B", " #inline"),
        "",
        'pushmeta trip: "pm"',
        txn("2026-09-04", "C"),
        "popmeta trip:",
      ];
      const f = await fixture();
      f.state.files.set("main.bean", `${scoped.join("\n")}\n`);
      const text = `${txn("2026-09-01", "New 1")}\n\n${txn("2026-09-03", "New 3")}\n`;
      try {
        const dry = await f.call(surface, { text, dryRun: true });
        expect(dry.ok).toBe(true);
        const preview = dry.ok ? (dry.data as Record<string, never>) : {};
        const [{ diff }] = preview.diff as { path: string; diff: string }[];
        // The new entries come before the push lines, which stay where they were.
        expect(diff).not.toMatch(/^[+-](push|pop)/m);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();

        const result = await f.call(surface, { text });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.appendedUnsorted).toEqual([]);
        const written = f.state.files.get("main.bean")!;
        expect(written).toBe(
          [
            txn("2026-09-01", "New 1"),
            "",
            ...scoped.slice(0, 6),
            txn("2026-09-03", "New 3"),
            "",
            ...scoped.slice(6),
            "",
          ].join("\n"),
        );
        const lines = written.split("\n");
        expect(
          (data.wrote as { line: number }[]).map(({ line }) => lines[line - 1]),
        ).toEqual(['2026-09-01 * "New 1" "n"', '2026-09-03 * "New 3" "n"']);
      } finally {
        await f.close();
      }
    },
  );

  // w31/018: a note or document inside the text's own `pushtag` was stored
  // without the tag, though Beancount and the engine both give it one.
  it.each(["rest", "gql", "mcp"] as const)(
    "writes the text's pushed tag onto a note and a document via %s",
    async (surface) => {
      const text = [
        "pushtag #trip",
        '2026-02-10 note Assets:Cash "left a tip"',
        '2026-02-11 document Assets:Cash "receipt.pdf"',
        "poptag #trip",
      ].join("\n");
      const tagged = [
        '2026-02-10 note Assets:Cash "left a tip" #trip',
        '2026-02-11 document Assets:Cash "receipt.pdf" #trip',
      ];
      const f = await fixture();
      try {
        const dry = await f.call(surface, { text, dryRun: true });
        expect(dry.ok).toBe(true);
        const preview = dry.ok ? (dry.data as Record<string, never>) : {};
        const [{ diff }] = preview.diff as { path: string; diff: string }[];
        for (const line of tagged) expect(diff).toContain(`+${line}\n`);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();

        const result = await f.call(surface, { text });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        const written = f.state.files.get("main.bean")!;
        expect(written).not.toMatch(/^(push|pop)tag/m);
        const lines = written.split("\n");
        expect(
          (data.wrote as { line: number }[]).map(({ line }) => lines[line - 1]),
        ).toEqual(tagged);
      } finally {
        await f.close();
      }
    },
  );

  // w31/029: a key pushed twice keeps a stack of values, as in Beancount.
  // The text was refused at its second `popmeta` on every surface.
  it.each(["rest", "gql", "mcp"] as const)(
    "writes a nested pushmeta's values onto the entries of each scope via %s",
    async (surface) => {
      const entry = (date: string, payee: string) => [
        `${date} * "${payee}" ""`,
        "  Expenses:Food   1.00 USD",
        "  Assets:Cash    -1.00 USD",
      ];
      const text = [
        'pushmeta trip: "outer"',
        'pushmeta trip: "inner"',
        ...entry("2026-02-10", "T1A"),
        "popmeta trip:",
        ...entry("2026-02-11", "T1B"),
        "popmeta trip:",
      ].join("\n");
      const stored = [
        ['2026-02-10 * "T1A" ""', '  trip: "inner"'],
        ['2026-02-11 * "T1B" ""', '  trip: "outer"'],
      ];
      const f = await fixture();
      try {
        const dry = await f.call(surface, { text, dryRun: true });
        expect(dry.ok).toBe(true);
        const preview = dry.ok ? (dry.data as Record<string, never>) : {};
        const [{ diff }] = preview.diff as { path: string; diff: string }[];
        for (const [header, meta] of stored)
          expect(diff).toContain(`+${header}\n+${meta}\n`);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();

        const result = await f.call(surface, { text });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        const written = f.state.files.get("main.bean")!;
        expect(written).not.toMatch(/^(push|pop)meta/m);
        const lines = written.split("\n");
        expect(
          (data.wrote as { line: number }[]).map(({ line }) =>
            lines.slice(line - 1, line + 1),
          ),
        ).toEqual(stored);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses an unbalanced transaction with UNBALANCED via %s",
    async (surface) => {
      const f = await fixture();
      f.state.projectedErrors = [
        { message: "Transaction does not balance: residual 5 USD" },
      ];
      try {
        const result = await f.call(surface, { text: TXN });
        expect(result.ok).toBe(false);
        // Nothing reaches the repository when the projection is rejected.
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        expect(f.state.files.get("main.bean")).toBe(EXISTING);
      } finally {
        await f.close();
      }
    },
  );

  describe.each([
    ["with date routing", "txns/{date}.bean"],
    ["without routing", undefined],
  ])("a date that is not on the calendar, %s", (_label, route) => {
    it.each(["rest", "gql", "mcp"] as const)(
      "is refused as bad input and writes nothing via %s",
      async (surface) => {
        const f = await fixture();
        if (route) f.state.routeTransactionsTo = route;
        try {
          const result = await f.call(surface, {
            text: TXN.replace(/^\d{4}-\d{2}-\d{2}/, "2026-13-45"),
            dryRun: true,
          });
          expect(result.ok).toBe(false);
          const error = (result.ok === false ? result.error : {}) as {
            code?: string;
            message?: string;
            originalError?: { category?: string };
          };
          expect(error.code ?? error.originalError?.category).toBe(
            "BAD_USER_INPUT",
          );
          expect(error.message).toContain("2026-13-45");
          expect(error.message).not.toContain("Invalid time value");
          expect(f.checkProjectedErrors).not.toHaveBeenCalled();
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        } finally {
          await f.close();
        }
      },
    );
  });

  /** w4/m38: years 0001–0099 are real dates, not 1900s, on every surface. */
  describe("early-year dates", () => {
    const early = (date: string) => TXN.replace("2026-02-05", date);

    it.each(["rest", "gql", "mcp"] as const)(
      "routes and writes a 0099 directive once, after a non-writing dry run, via %s",
      async (surface) => {
        const f = await fixture();
        f.state.routeTransactionsTo = "txns/{year}/{date}.bean";
        try {
          const dry = await f.call(surface, {
            text: early("0099-08-11"),
            dryRun: true,
          });
          expect(dry.ok).toBe(true);
          const preview = dry.ok ? (dry.data as Record<string, never>) : {};
          expect((preview.diff as { path: string; diff: string }[])[0]).toEqual(
            {
              path: "txns/0099/0099-08-11.bean",
              diff: expect.stringContaining('+0099-08-11 * "Cafe" "Coffee"'),
            },
          );
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();

          const result = await f.call(surface, { text: early("0099-08-11") });
          expect(result.ok).toBe(true);
          const data = result.ok ? (result.data as Record<string, never>) : {};
          expect(data.wrote).toEqual([
            { path: "txns/0099/0099-08-11.bean", line: 1 },
          ]);
          expect(f.commits).toHaveLength(1);
          expect(
            f.state.files.get("txns/0099/0099-08-11.bean")!.split("\n")[0],
          ).toBe('0099-08-11 * "Cafe" "Coffee"');
        } finally {
          await f.close();
        }
      },
    );

    it.each(["rest", "gql", "mcp"] as const)(
      "still refuses year 0000 as bad input, writing nothing, via %s",
      async (surface) => {
        const f = await fixture();
        try {
          const result = await f.call(surface, { text: early("0000-08-11") });
          expect(result.ok).toBe(false);
          const error = (result.ok === false ? result.error : {}) as {
            code?: string;
            message?: string;
            originalError?: { category?: string };
          };
          expect(error.code ?? error.originalError?.category).toBe(
            "BAD_USER_INPUT",
          );
          expect(error.message).toContain("0000-08-11");
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        } finally {
          await f.close();
        }
      },
    );
  });

  it("names the UNBALANCED code and a hint on the MCP surface", async () => {
    const f = await fixture();
    f.state.projectedErrors = [
      { message: "Transaction does not balance: residual 5 USD" },
    ];
    try {
      const result = await f.call("mcp", { text: TXN });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatchObject({
        code: "UNBALANCED",
        hint: expect.stringContaining("allowInvalid"),
      });
    } finally {
      await f.close();
    }
  });

  // w23/077: MCP named the new errors only inside its message, while REST's
  // error.metadata and GraphQL's extensions carry them as newLedgerErrors.
  it("names the new errors in newLedgerErrors on MCP, as on REST", async () => {
    const f = await fixture();
    f.state.projectedErrors = [
      { message: "Balance failed for Assets:Cash: expected 5 USD, got 0 USD" },
    ];
    try {
      const rest = await f.call("rest", { text: TXN });
      const mcp = await f.call("mcp", { text: TXN });
      const named = "Balance failed for Assets:Cash: expected 5 USD, got 0 USD";
      expect(rest.ok === false && rest.error).toMatchObject({
        code: "VALIDATION_FAILED",
        metadata: { newLedgerErrors: named },
      });
      expect(mcp.ok === false && mcp.error).toMatchObject({
        code: "VALIDATION_FAILED",
        newLedgerErrors: named,
      });
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each(["rest", "gql", "mcp"] as const)(
    "commits an invalid directive when allowInvalid says so via %s",
    async (surface) => {
      const f = await fixture();
      f.state.projectedErrors = [
        { message: "Transaction does not balance: residual 5 USD" },
      ];
      try {
        const result = await f.call(surface, { text: TXN, allowInvalid: true });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        // MCP carries bean-check's verdict under the m26 write outcome;
        // REST and GraphQL return the service's own field.
        expect(
          (data.validation as { newErrors: unknown[] })?.newErrors ??
            data.newErrors,
        ).toHaveLength(1);
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    },
  );

  // w23/m9/t003: the allow_invalid twin records like allowInvalid.
  it.each(["rest", "gql", "mcp"] as const)(
    "commits an invalid directive under the allow_invalid twin via %s",
    async (surface) => {
      const f = await fixture();
      f.state.projectedErrors = [
        { message: "Transaction does not balance: residual 5 USD" },
      ];
      try {
        const result = await f.call(
          surface,
          { text: TXN, allow_invalid: true },
          true,
        );
        expect(result.ok).toBe(true);
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses one true and one false errors flag via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const result = await f.call(
          surface,
          { text: TXN, allowInvalid: false, allow_invalid: true },
          true,
        );
        expect(result.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "previews without committing under dryRun via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const result = await f.call(surface, { text: TXN, dryRun: true });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.dryRun ?? data.dry_run).toBe(true);
        expect((data.diff as { path: string; diff: string }[])[0].path).toBe(
          "main.bean",
        );
        expect(
          (data.diff as { path: string; diff: string }[])[0].diff,
        ).toContain('+2026-02-05 * "Cafe" "Coffee"');
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        expect(f.state.files.get("main.bean")).toBe(EXISTING);
        expect(data.entryHashes).toEqual([]);
        expect(f.getProjectedEntryIds).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  // w23/m9/t002: each surface accepts the other's spelling as a twin
  // that previews without writing.
  it.each(["rest", "gql", "mcp"] as const)(
    "accepts the other surface's preview spelling via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const twin = surface === "mcp" ? { dryRun: true } : { dry_run: true };
        const result = await f.call(surface, { text: TXN, ...twin }, true);
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.dryRun ?? data.dry_run).toBe(true);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        expect(f.state.files.get("main.bean")).toBe(EXISTING);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses one true and one false preview flag via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const result = await f.call(
          surface,
          { text: TXN, dry_run: true, dryRun: false },
          true,
        );
        expect(result.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "previews a write that would break the ledger, with its new errors, via %s",
    async (surface) => {
      const f = await fixture();
      f.state.projectedErrors = [
        { message: "Account Expenses:Food was never opened" },
      ];
      try {
        const result = await f.call(surface, { text: TXN, dryRun: true });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.dryRun ?? data.dry_run).toBe(true);
        expect(
          (data.diff as { path: string; diff: string }[])[0].diff,
        ).toContain('+2026-02-05 * "Cafe" "Coffee"');
        const newErrors =
          (data.validation as { newErrors: { message: string }[] })
            ?.newErrors ?? (data.newErrors as { message: string }[]);
        expect(newErrors).toEqual([
          expect.objectContaining({
            message: expect.stringContaining("never opened"),
          }),
        ]);
        // The explicit verdict (w23/219), on every surface.
        const valid =
          (data.validation as { valid?: boolean } | undefined)?.valid ??
          (data as { valid?: boolean }).valid;
        expect(valid).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        expect(f.state.files.get("main.bean")).toBe(EXISTING);

        // The same call without the preview is still refused.
        const commit = await f.call(surface, { text: TXN });
        expect(commit.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses text that is not Beancount directives via %s",
    async (surface) => {
      const f = await fixture();
      try {
        const result = await f.call(surface, {
          text: "Sure! Here are the transactions you asked for:",
        });
        expect(result.ok).toBe(false);
        expect(f.checkProjectedErrors).not.toHaveBeenCalled();
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  // w23/018: ledger configuration is not an entry to append.
  describe.each(["rest", "gql", "mcp"] as const)(
    "refuses ledger configuration via %s",
    (surface) => {
      it.each([
        'option "operating_currency" "EUR"',
        'plugin "beancount.plugins.auto_accounts"',
        'include "other.bean"',
      ])("%s, previewed or not, before any check or write", async (line) => {
        const f = await fixture();
        try {
          for (const dryRun of [true, false]) {
            const result = await f.call(surface, { text: line, dryRun });
            expect(result.ok).toBe(false);
            expect(JSON.stringify(result.error)).toContain(
              "configures the ledger",
            );
          }
          expect(f.checkProjectedErrors).not.toHaveBeenCalled();
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        } finally {
          await f.close();
        }
      });
    },
  );

  it("refuses more than fifty directives in one call", async () => {
    const f = await fixture();
    try {
      const many = Array.from({ length: 51 }, (_, i) =>
        TXN.replace(
          "2026-02-05",
          `2026-02-${String((i % 28) + 1).padStart(2, "0")}`,
        ),
      ).join("\n\n");
      const result = await f.call("mcp", { text: many });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatchObject({
        code: "BAD_USER_INPUT",
        message: expect.stringContaining("at most 50"),
      });
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("routes a transaction to the file the ledger's own options assign it", async () => {
    const f = await fixture();
    f.state.routeTransactionsTo = "txns/{year}.bean";
    try {
      const result = await f.call("mcp", { text: TXN });
      expect(result.ok).toBe(true);
      expect(f.commits[0].files[0]).toMatchObject({
        operation: "create",
        path: "txns/2026.bean",
      });
      expect(f.commits[0].message).toBe("Add 1 directive to txns/2026.bean");
    } finally {
      await f.close();
    }
  });

  // w23/035: an explicit path outside the include closure committed an entry
  // no read would ever show.
  it.each(["rest", "gql", "mcp"] as const)(
    "refuses an explicit path the ledger does not load on %s",
    async (surface) => {
      const f = await fixture();
      f.state.files.set("2026/03.bean", "");
      f.state.files.set("notes.txt", "");
      f.state.sourceFiles = ["main.bean", "2026/02.bean"];
      try {
        for (const path of ["2026/03.bean", "qa-new.bean", "notes.txt"]) {
          for (const dryRun of [true, false]) {
            const result = await f.call(surface, { text: TXN, path, dryRun });
            expect(result.ok).toBe(false);
            expect(JSON.stringify(result.ok ? null : result.error)).toContain(
              `${path} is not included by the ledger`,
            );
          }
        }
        expect(f.commits).toEqual([]);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "still writes to an included file in a subdirectory on %s",
    async (surface) => {
      const f = await fixture();
      f.state.files.set("2026/02.bean", "");
      f.state.sourceFiles = ["main.bean", "2026/02.bean"];
      try {
        const result = await f.call(surface, {
          text: TXN,
          path: "2026/02.bean",
        });
        expect(result.ok).toBe(true);
        expect(f.commits[0].files[0]).toMatchObject({ path: "2026/02.bean" });
      } finally {
        await f.close();
      }
    },
  );

  // w23/062: a routed write to a year file nothing included committed an
  // entry no report loaded, and said it added no bean-check errors.
  it.each(["rest", "gql", "mcp"] as const)(
    "includes a routed file the ledger does not load, in the same commit, on %s",
    async (surface) => {
      const f = await fixture();
      f.state.routeTransactionsTo = "txns/{year}.bean";
      f.state.sourceFiles = ["main.bean"];
      try {
        const result = await f.call(surface, { text: TXN });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(JSON.stringify(data)).toContain(
          "Added 1 directive to txns/2026.bean; main.bean now includes txns/2026.bean",
        );
        expect(f.commits).toHaveLength(1);
        expect(f.commits[0].files.map(({ path }) => path)).toEqual([
          "txns/2026.bean",
          "main.bean",
        ]);
        expect(f.state.files.get("main.bean")).toBe(
          `${EXISTING.trimEnd()}\ninclude "txns/2026.bean"\n`,
        );
      } finally {
        await f.close();
      }
    },
  );

  // w1/197: an append rewrote a Windows-authored file to LF, so every append
  // to one was a whole-file diff.
  it.each(["rest", "gql", "mcp"] as const)(
    "keeps a CRLF file's lines byte-identical and appends in CRLF via %s",
    async (surface) => {
      const f = await fixture();
      const crlf = EXISTING.replace(/\n/g, "\r\n");
      f.state.files.set("main.bean", crlf);
      try {
        const result = await f.call(surface, { text: TXN });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        const written = f.state.files.get("main.bean")!;
        expect(written.replace(/\r\n/g, "")).not.toContain("\n");
        const lines = written.split("\r\n");
        // The untouched head and tail are the original CRLF bytes.
        expect(
          written.startsWith(crlf.split("\r\n").slice(0, 6).join("\r\n")),
        ).toBe(true);
        expect(written.endsWith(crlf.split("\r\n").slice(6).join("\r\n"))).toBe(
          true,
        );
        expect(data.wrote).toEqual([{ path: "main.bean", line: 7 }]);
        expect(lines[6]).toBe('2026-02-05 * "Cafe" "Coffee"');
        expect(data.entryHashes).toEqual(["hash-main.bean:7"]);
      } finally {
        await f.close();
      }
    },
  );

  it("honours an explicit path over the routing rules", async () => {
    const f = await fixture();
    f.state.routeTransactionsTo = "txns/{year}.bean";
    f.state.files.set("2026.bean", "");
    try {
      const result = await f.call("mcp", { text: TXN, path: "2026.bean" });
      expect(result.ok).toBe(true);
      expect(f.commits[0].files[0]).toMatchObject({
        operation: "update",
        path: "2026.bean",
      });
    } finally {
      await f.close();
    }
  });

  // w31/109: the lexer reads `2026/08/25` and `2026-8-26` as dates. Read as
  // `YYYY-MM-DD` only, they were no entries to the append, so a 2026-08-27
  // entry landed above both, and the refusal of one in new text said nothing
  // of the dashed form that would work.
  it.each(["rest", "gql", "mcp"] as const)(
    "threads an entry past slash-dated and unpadded neighbours, previewed and committed, via %s",
    async (surface) => {
      const entry = (date: string, payee: string) =>
        [
          `${date} * "${payee}" "n"`,
          "  Assets:Cash     -1.00 USD",
          "  Expenses:Food    1.00 USD",
        ].join("\n");
      const mixed = [
        entry("2026-08-22", "Bus"),
        "",
        entry("2026/08/25", "Slash"),
        "",
        entry("2026-8-26", "Unpadded"),
        "",
        entry("2026-08-28", "Market"),
        "",
      ].join("\n");
      const f = await fixture();
      f.state.files.set("main.bean", mixed);
      try {
        const text = entry("2026-08-27", "New");
        const preview = await f.call(surface, { text, dryRun: true });
        expect(preview.ok).toBe(true);
        const data = preview.ok ? (preview.data as Record<string, never>) : {};
        expect(data.appendedUnsorted).toEqual([]);
        const [{ diff }] = data.diff as { path: string; diff: string }[];
        const at = [
          ' 2026-8-26 * "Unpadded"',
          '+2026-08-27 * "New"',
          ' 2026-08-28 * "Market"',
        ].map((line) => diff.indexOf(line));
        expect(at.every((index) => index !== -1)).toBe(true);
        expect([...at].sort((a, b) => a - b)).toEqual(at);
        expect(f.state.files.get("main.bean")).toBe(mixed);

        const commit = await f.call(surface, { text });
        expect(commit.ok).toBe(true);
        expect(
          [
            ...f.state.files.get("main.bean")!.matchAll(/^\S+ \* "([^"]+)"/gm),
          ].map((match) => match[1]),
        ).toEqual(["Bus", "Slash", "Unpadded", "New", "Market"]);

        const refused = await f.call(surface, {
          text: entry("2026-9-1", "Unpadded"),
          dryRun: true,
        });
        expect(refused.ok).toBe(false);
        // The hint rides as MCP's `hint`, REST's `metadata.hint`, and the
        // GraphQL error's original `metadata.hint`.
        const error = (refused.ok ? {} : refused.error) as {
          hint?: string;
          metadata?: { hint?: string };
          originalError?: { metadata?: { hint?: string } };
        };
        expect(
          error.hint ??
            error.metadata?.hint ??
            error.originalError?.metadata?.hint,
        ).toContain("write 2026-9-1 as 2026-09-01");
      } finally {
        await f.close();
      }
    },
  );

  it("appends at the end of a file whose directives are out of order, and says so", async () => {
    const f = await fixture();
    f.state.files.set(
      "main.bean",
      [
        '2026-05-01 * "Late" ""',
        "  Expenses:Food   1.00 USD",
        "  Assets:Cash    -1.00 USD",
        "",
        '2026-01-01 * "Early" ""',
        "  Expenses:Food   1.00 USD",
        "  Assets:Cash    -1.00 USD",
      ].join("\n"),
    );
    try {
      const result = await f.call("mcp", { text: TXN });
      expect(result.ok).toBe(true);
      const data = result.ok ? (result.data as Record<string, never>) : {};
      expect(data.appendedUnsorted).toEqual(["main.bean"]);
      expect(String(data.summary)).toContain("not in date order");
      expect(
        f.state.files.get("main.bean")!.trimEnd().endsWith("-4.50 USD"),
      ).toBe(true);
    } finally {
      await f.close();
    }
  });
});

// w31/113: while an assertion is off, any entry above it changes the figure
// the account reached, so the projection quotes a new "got". That is the
// error the ledger already had, and the structured add already says so.
describe.each(["rest", "gql", "mcp"] as const)(
  "appendLedgerText over a balance assertion that already fails via %s",
  (surface) => {
    const failed = (got: string) => ({
      message: `Balance failed for Assets:Cash: expected 40.00 USD, got ${got}`,
    });
    const verdict = (res: { ok: boolean; data?: unknown }) => {
      const data = res.ok ? (res.data as Record<string, unknown>) : {};
      return (data.validation ?? data) as {
        valid: boolean;
        errorsBefore: number;
        errorsAfter: number;
        newErrors: { message: string }[];
      };
    };

    it("previews valid: true with no new errors", async () => {
      const f = await fixture();
      f.state.baselineErrors = [failed("49.75 USD")];
      f.state.projectedErrors = [failed("44.75 USD")];
      try {
        const res = await f.call(surface, { text: TXN, dryRun: true });
        expect(res.ok).toBe(true);
        expect(verdict(res)).toMatchObject({
          valid: true,
          errorsBefore: 1,
          errorsAfter: 1,
          newErrors: [],
        });
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("commits without allowInvalid", async () => {
      const f = await fixture();
      f.state.baselineErrors = [failed("49.75 USD")];
      f.state.projectedErrors = [failed("44.75 USD")];
      try {
        const res = await f.call(surface, { text: TXN });
        expect(res.ok).toBe(true);
        expect(verdict(res)).toMatchObject({ valid: true, newErrors: [] });
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });

    it("still names a second failing assertion as new", async () => {
      const f = await fixture();
      f.state.baselineErrors = [failed("49.75 USD")];
      f.state.projectedErrors = [failed("44.75 USD"), failed("44.75 USD")];
      try {
        const preview = await f.call(surface, { text: TXN, dryRun: true });
        expect(verdict(preview)).toMatchObject({
          valid: false,
          newErrors: [failed("44.75 USD")],
        });
        const commit = await f.call(surface, { text: TXN });
        expect(commit.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w31/115: a sale whose buys are missing fails to book, and the error quotes
// the lots the account holds. Importing one of the missing buys changes that
// figure, so the projection quotes "available 7" and "3 lots match" where the
// ledger had "available 5" and "2 lots match". Those are the errors the
// ledger already had (the engine's wording, from the note's fixture).
describe.each(["rest", "gql", "mcp"] as const)(
  "appendLedgerText over a lot error the ledger already has via %s",
  (surface) => {
    const short = (available: string, requested = "10") => ({
      message: `Not enough units in Assets:Broker: requested ${requested}, available ${available}; not enough to reduce (2026-03-01, "sell-a")`,
    });
    const ambiguous = (lots: number) => ({
      message: `Ambiguous lot match for HOOL: ${lots} lots match in Assets:Strict (2026-03-01, "sell-s")`,
    });
    const BUY = [
      '2026-02-15 * "buy-b"',
      "  Assets:Broker  2 HOOL {10.00 USD}",
      "  Assets:Cash  -20.00 USD",
    ].join("\n");
    const verdict = (res: { ok: boolean; data?: unknown }) => {
      const data = res.ok ? (res.data as Record<string, unknown>) : {};
      return (data.validation ?? data) as {
        valid: boolean;
        errorsBefore: number;
        errorsAfter: number;
        newErrors: { message: string }[];
      };
    };

    it("previews valid: true and commits without allowInvalid", async () => {
      const f = await fixture();
      f.state.baselineErrors = [short("5"), ambiguous(2)];
      f.state.projectedErrors = [short("7"), ambiguous(3)];
      try {
        const preview = await f.call(surface, { text: BUY, dryRun: true });
        expect(preview.ok).toBe(true);
        expect(verdict(preview)).toMatchObject({
          valid: true,
          errorsBefore: 2,
          errorsAfter: 2,
          newErrors: [],
        });
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        const commit = await f.call(surface, { text: BUY });
        expect(commit.ok).toBe(true);
        expect(verdict(commit)).toMatchObject({ valid: true, newErrors: [] });
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });

    it("still refuses a reduction whose requested amount changed", async () => {
      const f = await fixture();
      f.state.baselineErrors = [short("5")];
      f.state.projectedErrors = [short("7", "12")];
      try {
        const preview = await f.call(surface, { text: BUY, dryRun: true });
        expect(verdict(preview)).toMatchObject({
          valid: false,
          newErrors: [short("7", "12")],
        });
        const commit = await f.call(surface, { text: BUY });
        expect(commit.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w31/127: with check_commodity declared, the ledger reports each undeclared
// currency once, naming the first account that uses it. Opening an account
// that sorts before it names the new account instead, so the projection
// quotes 'Assets:US:Ally:Savings' where the ledger had
// 'Assets:US:BofA:Checking'. That is the error the ledger already had (the
// engine's wording, from the note's fixture).
describe.each(["rest", "gql", "mcp"] as const)(
  "appendLedgerText over a missing-commodity error the ledger already has via %s",
  (surface) => {
    const missing = (currency: string, account: string) => ({
      message: `Missing Commodity directive for '${currency}' in '${account}'`,
    });
    const OPEN = "2025-10-13 open Assets:US:Ally:Savings USD";
    // Its own caller, so these calls spend no other test's write budget.
    const ledger = () =>
      fixture({ ...identity, userId: `usr_text_commodity_${surface}` });
    const verdict = (res: { ok: boolean; data?: unknown }) => {
      const data = res.ok ? (res.data as Record<string, unknown>) : {};
      return (data.validation ?? data) as {
        valid: boolean;
        errorsBefore: number;
        errorsAfter: number;
        newErrors: { message: string }[];
      };
    };

    it("previews valid: true and commits without allowInvalid", async () => {
      const f = await ledger();
      f.state.baselineErrors = [missing("USD", "Assets:US:BofA:Checking")];
      f.state.projectedErrors = [missing("USD", "Assets:US:Ally:Savings")];
      try {
        const preview = await f.call(surface, { text: OPEN, dryRun: true });
        expect(preview.ok).toBe(true);
        expect(verdict(preview)).toMatchObject({
          valid: true,
          errorsBefore: 1,
          errorsAfter: 1,
          newErrors: [],
        });
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        const commit = await f.call(surface, { text: OPEN });
        expect(commit.ok).toBe(true);
        expect(verdict(commit)).toMatchObject({ valid: true, newErrors: [] });
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });

    it("still refuses a new undeclared currency", async () => {
      const f = await ledger();
      f.state.baselineErrors = [missing("USD", "Assets:US:BofA:Checking")];
      f.state.projectedErrors = [
        missing("GBP", "Assets:UK:Cash"),
        missing("USD", "Assets:US:BofA:Checking"),
      ];
      const text = "2025-10-13 open Assets:UK:Cash GBP";
      try {
        const preview = await f.call(surface, { text, dryRun: true });
        expect(verdict(preview)).toMatchObject({
          valid: false,
          newErrors: [missing("GBP", "Assets:UK:Cash")],
        });
        const commit = await f.call(surface, { text });
        expect(commit.ok).toBe(false);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w31/116: an append threads its text in by date, so everything below the
// insertion sits that many lines lower in the text bean-check reads. A preview
// and a refusal commit nothing, so both name a new error at its line in the
// file as it stands, the one addLedgerEntries names; the note's refusal
// cited main.bean:91 in an 87-line file. An error in the new text keeps the
// line the preview's diff shows, and a forced commit reports the line the
// error has once written.
describe.each(["rest", "gql", "mcp"] as const)(
  "where appendLedgerText names a new error, via %s",
  (surface) => {
    const BALANCE = "2026-08-29 balance Assets:Cash 49.75 USD";
    const FAILED =
      "Balance failed for Assets:Cash: expected 49.75 USD, got 48.75 USD";
    const NEVER = "Account Expenses:Nope was never opened";
    const MAIN = [
      'include "prices.bean"',
      "",
      "2026-01-01 open Assets:Cash USD",
      "2026-01-01 open Expenses:Food:Coffee USD",
      "",
      '2026-08-10 * "Earlier"',
      "  Assets:Cash  -1.00 USD",
      "  Expenses:Food:Coffee  1.00 USD",
      "",
      '2026-08-28 * "FARMERS MARKET"',
      "  Assets:Cash  -23.50 USD",
      "  Expenses:Food:Coffee  23.50 USD",
      "",
      BALANCE,
      "",
    ].join("\n");
    const AT = `main.bean:${MAIN.split("\n").indexOf(BALANCE) + 1}`;
    const COFFEE = [
      '2026-08-20 * "qa-20261127-coffee"',
      "  Assets:Cash  -1.00 USD",
      "  Expenses:Food:Coffee  1.00 USD",
    ].join("\n");
    const UNOPENED = COFFEE.replace("Food:Coffee", "Nope").replace(
      "qa-20261127-coffee",
      "qa-unopened",
    );

    /** The stand-in engine: the coffee breaks the assertion; Expenses:Nope is unopened. */
    const errorsOf = (files: ReadonlyMap<string, string>) => {
      const coffee = [...files.values()].some((text) =>
        text.includes("qa-20261127-coffee"),
      );
      return [...files].flatMap(([filename, text]) =>
        text.split("\n").flatMap((line, index) => {
          const source = { filename, lineno: index + 1 };
          if (line === BALANCE && coffee) return [{ message: FAILED, source }];
          if (line.includes("Expenses:Nope"))
            return [{ message: NEVER, source }];
          return [];
        }),
      );
    };

    async function ledger(route?: string) {
      // Its own caller, so these calls spend no other test's write budget.
      const f = await fixture({
        ...identity,
        userId: `usr_text_error_lines_${surface}`,
      });
      f.state.files = new Map([
        ["main.bean", MAIN],
        ["prices.bean", ""],
      ]);
      f.state.errorsOf = errorsOf;
      if (route) {
        // The routed file is new, so the entry point gains its include.
        f.state.routeTransactionsTo = route;
        f.state.sourceFiles = ["main.bean", "prices.bean"];
      }
      return f;
    }
    const newErrorsOf = (res: { ok: boolean; data?: unknown }) => {
      expect(res.ok).toBe(true);
      const data = res.ok ? (res.data as Record<string, unknown>) : {};
      return ((data.validation ?? data) as { newErrors: unknown[] }).newErrors;
    };
    const refusedAt = (res: { ok: boolean; error?: unknown }) => {
      expect(res.ok).toBe(false);
      const { message } = (res as { error: { message: string } }).error;
      return message.match(/main\.bean:\d+/g);
    };

    it("previews and refuses an error below the inserted text at its current line", async () => {
      const f = await ledger();
      try {
        expect(
          newErrorsOf(await f.call(surface, { text: COFFEE, dryRun: true })),
        ).toEqual([{ message: FAILED, source: AT }]);
        expect(refusedAt(await f.call(surface, { text: COFFEE }))).toEqual([
          AT,
        ]);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("maps past the include line a routed write adds above the error", async () => {
      const f = await ledger("txns/2026.bean");
      try {
        const preview = await f.call(surface, { text: COFFEE, dryRun: true });
        expect(newErrorsOf(preview)).toEqual([{ message: FAILED, source: AT }]);
        expect(refusedAt(await f.call(surface, { text: COFFEE }))).toEqual([
          AT,
        ]);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("keeps the written line of an error inside the new text", async () => {
      const f = await ledger();
      try {
        const preview = newErrorsOf(
          await f.call(surface, { text: UNOPENED, dryRun: true }),
        );
        const forced = newErrorsOf(
          await f.call(surface, { text: UNOPENED, allowInvalid: true }),
        );
        const written = f.state.files.get("main.bean")!.split("\n");
        const line = written.indexOf("  Expenses:Nope  1.00 USD") + 1;
        expect(line).toBeGreaterThan(0);
        expect(preview).toEqual([
          { message: NEVER, source: `main.bean:${line}` },
        ]);
        expect(forced).toEqual(preview);
      } finally {
        await f.close();
      }
    });

    it("reports the line after the write on a commit allowInvalid lets through", async () => {
      const f = await ledger();
      try {
        const forced = newErrorsOf(
          await f.call(surface, { text: COFFEE, allowInvalid: true }),
        );
        const written = f.state.files.get("main.bean")!.split("\n");
        const line = written.indexOf(BALANCE) + 1;
        expect(`main.bean:${line}`).not.toBe(AT);
        expect(forced).toEqual([
          { message: FAILED, source: `main.bean:${line}` },
        ]);
      } finally {
        await f.close();
      }
    });
  },
);

describe("requestId on appended text", () => {
  beforeEach(() => fakeRedisIdempotencyState.reset());

  it.each(["rest", "gql", "mcp"] as const)(
    "returns the first result to a retry and commits once via %s",
    async (surface) => {
      const f = await fixture({
        ...identity,
        userId: `usr_text_request_id_${surface}`,
      });
      try {
        const first = await f.call(surface, { text: TXN, requestId: "t-1" });
        const retry = await f.call(surface, { text: TXN, requestId: "t-1" });

        expect(first.ok).toBe(true);
        expect(retry.ok).toBe(true);
        expect(f.commits).toHaveLength(1);
        const {
          summary: _a,
          validation: _b,
          ...firstWrite
        } = (first.ok ? first.data : {}) as Record<string, unknown>;
        const {
          summary: _c,
          validation: _d,
          ...retryWrite
        } = (retry.ok ? retry.data : {}) as Record<string, unknown>;
        expect(retryWrite).toEqual(firstWrite);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "refuses a whitespace-only requestId on preview and commit via %s without touching Redis (w31/044)",
    async (surface) => {
      const f = await fixture({
        ...identity,
        userId: `usr_text_blank_request_id_${surface}`,
      });
      try {
        for (const requestId of ["   ", "\t\n"]) {
          for (const dryRun of [true, false]) {
            const res = await f.call(surface, {
              text: TXN,
              dryRun,
              requestId,
            });
            expect(res.ok).toBe(false);
            if (!res.ok) {
              if (surface === "gql") {
                const gqlError = res.error as {
                  toJSON: () => { message: string };
                };
                const formatted = formatError(gqlError.toJSON(), gqlError);
                expect(formatted.extensions).toMatchObject({
                  code: "VALIDATION_FAILED",
                  field: "requestId",
                });
              } else if (surface === "rest") {
                expect(res.error).toMatchObject({
                  code: "VALIDATION_FAILED",
                  metadata: { field: "requestId" },
                });
              } else {
                expect(res.error).toMatchObject({
                  code: "VALIDATION_FAILED",
                  message: expect.stringContaining("requestId"),
                });
              }
            }
          }
        }
        expect(f.commits).toHaveLength(0);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        expect(fakeRedisIdempotencyState.records.size).toBe(0);
      } finally {
        await f.close();
      }
    },
  );
});

// w31/067: models spell shell-style `./main.bean` on MCP; normalize only at the
// MCP adapter so REST and GraphQL stay strict behind assertSafeRepoPath.
describe("dot-prefix path normalization on appendLedgerText (w31/067)", () => {
  it.each([
    ["./main.bean", "main.bean"],
    ["././imports/2026.bean", "imports/2026.bean"],
  ])(
    "normalizes %j to %j on MCP for preview and commit, returning canonical paths",
    async (inputPath, canonicalPath) => {
      const f = await fixture();
      if (canonicalPath !== "main.bean") {
        f.state.files.set(canonicalPath, "");
      }
      try {
        const preview = await f.call("mcp", {
          text: TXN,
          path: inputPath,
          dryRun: true,
        });
        expect(preview.ok).toBe(true);
        const previewData = preview.ok
          ? (preview.data as Record<string, unknown>)
          : {};
        expect(previewData.diff).toEqual([
          expect.objectContaining({ path: canonicalPath }),
        ]);
        expect(String(previewData.summary)).toContain(canonicalPath);
        expect(String(previewData.summary)).not.toContain("./");
        expect(f.commits).toHaveLength(0);

        const commit = await f.call("mcp", { text: TXN, path: inputPath });
        expect(commit.ok).toBe(true);
        const commitData = commit.ok
          ? (commit.data as Record<string, unknown>)
          : {};
        expect(commitData.wrote).toEqual([
          expect.objectContaining({ path: canonicalPath }),
        ]);
        expect(String(commitData.summary)).toContain(canonicalPath);
        expect(String(commitData.summary)).not.toContain("./");
        expect(f.commits[0].files[0]).toMatchObject({ path: canonicalPath });
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    "",
    ".",
    "./",
    "../x.bean",
    "./../x.bean",
    "a/../b.bean",
    "/main.bean",
    ".\\main.bean",
  ])("still refuses unsafe path %j on MCP with BAD_USER_INPUT", async (bad) => {
    const f = await fixture();
    try {
      const res = await f.call("mcp", { text: TXN, path: bad, dryRun: true });
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.error).toMatchObject({
        code: "BAD_USER_INPUT",
      });
      expect(f.commits).toHaveLength(0);
    } finally {
      await f.close();
    }
  });

  it.each(["rest", "gql"] as const)(
    "still refuses ./main.bean on %s with BAD_USER_INPUT",
    async (surface) => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: TXN,
          path: "./main.bean",
          dryRun: true,
        });
        expect(res.ok).toBe(false);
        if (!res.ok) {
          if (surface === "rest") {
            expect(res.error).toMatchObject({ code: "BAD_USER_INPUT" });
          } else {
            const gqlError = res.error as {
              toJSON: () => { message: string };
            };
            expect(
              formatError(gqlError.toJSON(), gqlError).extensions,
            ).toMatchObject({ code: "BAD_USER_INPUT" });
          }
        }
        expect(f.commits).toHaveLength(0);
      } finally {
        await f.close();
      }
    },
  );
});

// w31/094: `custom "budget"` for an unopened account must match addLedgerEntries
// across MCP, REST, and GraphQL: invalid on preview, refused on commit unless
// allowInvalid, and accepted for opened accounts, parents, or same-call opens.
describe.each(["rest", "gql", "mcp"] as const)(
  'custom "budget" account check via %s (w31/094)',
  (surface) => {
    const budget = (account: string) =>
      `2026-08-30 custom "budget" ${account} "monthly" 100.00 USD`;

    it("previews an unopened budget account as valid: false naming nearest accounts", async () => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: budget("Expenses:NoSuchAccount"),
          dryRun: true,
        });
        expect(res.ok).toBe(true);
        const data = res.ok ? (res.data as Record<string, unknown>) : {};
        const validation = (data.validation ?? data) as {
          valid: boolean;
          errorsBefore: number;
          errorsAfter: number;
          newErrors: { message: string }[];
        };
        expect(validation.valid).toBe(false);
        expect(validation.errorsBefore).toBe(0);
        expect(validation.errorsAfter).toBe(1);
        expect(validation.newErrors).toEqual([
          {
            message: expect.stringContaining(
              "budget account Expenses:NoSuchAccount is not opened in this ledger, nor is any account under it; nearest: Expenses:Food:Coffee, Expenses:Food:Groceries",
            ),
          },
        ]);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("refuses committing an unopened budget account with VALIDATION_FAILED", async () => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: budget("Expenses:NoSuchAccount"),
        });
        expect(res.ok).toBe(false);
        const expectedMessage = expect.stringContaining(
          "budget account Expenses:NoSuchAccount is not opened in this ledger, nor is any account under it; nearest: Expenses:Food:Coffee, Expenses:Food:Groceries",
        );
        if (!res.ok) {
          if (surface === "gql") {
            const gqlError = res.error as {
              originalError?: {
                category?: string;
                message?: string;
                metadata?: { hint?: string };
              };
            };
            expect(gqlError.originalError).toMatchObject({
              category: "VALIDATION_FAILED",
              message: expectedMessage,
              metadata: expect.objectContaining({
                hint: expect.stringContaining("allowInvalid: true"),
              }),
            });
          } else if (surface === "mcp") {
            expect(res.error).toMatchObject({
              code: "VALIDATION_FAILED",
              message: expectedMessage,
              hint: expect.stringContaining("allowInvalid: true"),
            });
          } else {
            expect(res.error).toMatchObject({
              code: "VALIDATION_FAILED",
              message: expectedMessage,
              metadata: expect.objectContaining({
                hint: expect.stringContaining("allowInvalid: true"),
              }),
            });
          }
        }
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("commits an unopened budget account when allowInvalid is true without reading accounts", async () => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: budget("Expenses:NoSuchAccount"),
          allowInvalid: true,
        });
        expect(res.ok).toBe(true);
        expect(f.getLedgerAccounts).not.toHaveBeenCalled();
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });

    it.each([
      ["an opened leaf account", budget("Expenses:Food:Coffee")],
      ["an opened parent account", budget("Expenses:Food")],
      [
        "same-call open + custom budget",
        `2026-01-01 open Expenses:Travel USD\n${budget("Expenses:Travel")}`,
      ],
    ])("accepts %s", async (_label, text) => {
      const f = await fixture();
      try {
        const res = await f.call(surface, { text });
        expect(res.ok).toBe(true);
        const data = res.ok ? (res.data as Record<string, unknown>) : {};
        const validation = (data.validation ?? data) as {
          valid: boolean;
          newErrors: unknown[];
        };
        expect(validation.valid).toBe(true);
        expect(validation.newErrors).toEqual([]);
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });

    it("leaves non-budget custom directives untouched without reading accounts", async () => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: '2026-08-30 custom "fava-option" "default-file" "main.bean"',
        });
        expect(res.ok).toBe(true);
        expect(f.getLedgerAccounts).not.toHaveBeenCalled();
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
      } finally {
        await f.close();
      }
    });
  },
);

// w31/095: 28-digit engine decimal checks must catch expressions, balance
// tolerances, and compound lot costs while accepting escaped-quote strings
// across MCP, REST, and GraphQL.
describe.each(["rest", "gql", "mcp"] as const)(
  "engine decimal scanner parity via %s (w31/095)",
  (surface) => {
    it.each([
      [
        "arithmetic expression",
        [
          '2026-08-01 * "Cafe" "expr"',
          "  Expenses:Food:Groceries   (1.0000000000000000000000000001 + 0) USD",
          "  Assets:Cash",
        ].join("\n"),
        "1.0000000000000000000000000001",
      ],
      [
        "balance assertion with tolerance",
        "2026-01-02 balance Assets:Cash 200.00000000000000000000000001 ~ 0.01 USD",
        "200.00000000000000000000000001",
      ],
      [
        "compound lot cost",
        [
          '2026-08-01 * "Buy" "lot"',
          "  Assets:Cash 10.00 USD {1.0000000000000000000000000001 # 0 USD}",
          "  Expenses:Food:Groceries",
        ].join("\n"),
        "1.0000000000000000000000000001",
      ],
    ])(
      "refuses %s past 28 digits with BAD_USER_INPUT on dryRun and commit",
      async (_label, text, literal) => {
        const f = await fixture();
        try {
          for (const dryRun of [true, false]) {
            const res = await f.call(surface, { text, dryRun });
            expect(res.ok).toBe(false);
            if (!res.ok) {
              const error = res.error as {
                code?: string;
                message?: string;
                originalError?: { category?: string; message?: string };
              };
              expect(error.code ?? error.originalError?.category).toBe(
                "BAD_USER_INPUT",
              );
              expect(error.message ?? error.originalError?.message).toContain(
                `amount ${literal} has more than 28 significant digits`,
              );
            }
          }
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        } finally {
          await f.close();
        }
      },
    );

    it("accepts a narration with an escaped quote before 30 digits and USD", async () => {
      const f = await fixture();
      try {
        const res = await f.call(surface, {
          text: [
            '2026-08-01 * "Cafe" "ref \\" 123456789012345678901234567890 USD"',
            "  Expenses:Food:Groceries 10.00 USD",
            "  Assets:Cash",
          ].join("\n"),
          dryRun: true,
        });
        expect(res.ok).toBe(true);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

// w31/098: inserting into an existing file containing multiline quoted strings
// must never split the string, misread inner date/keyword lines as directives,
// or inject spurious pushtag/pushmeta wrappers on any surface.
describe.each(["rest", "gql", "mcp"] as const)(
  "multiline strings in existing files via %s (w31/098)",
  (surface) => {
    const plainMultilineExisting = [
      'option "title" "T"',
      "",
      '2026-08-29 * "Earlier" "note"',
      "  Expenses:Food:Groceries  2.00 USD",
      "  Assets:Cash",
      "",
      '2026-08-30 * "Landlord" "Monthly rent',
      "line two at column 0",
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Cash",
      "",
    ].join("\n");

    const keywordMultilineExisting = [
      'option "title" "T"',
      "",
      '2026-08-29 * "Earlier" "note"',
      "  Expenses:Food:Groceries  2.00 USD",
      "  Assets:Cash",
      "",
      '2026-08-30 * "Landlord" "Monthly rent',
      "line two at column 0",
      "2020-01-01 open Assets:Fake USD",
      "pushtag #fake",
      'pushmeta fake: "x"',
      'end of memo"',
      "  Expenses:Food:Groceries  1.00 USD",
      "  Assets:Cash",
      "",
    ].join("\n");

    const coffeeTxn = [
      '2026-08-31 * "Coffee" "Latte"',
      "  Expenses:Food:Groceries  5.00 USD",
      "  Assets:Cash",
    ].join("\n");

    it.each([
      ["plain multiline narration", plainMultilineExisting],
      [
        "multiline narration with date and push lines",
        keywordMultilineExisting,
      ],
    ])(
      "inserts cleanly after a %s on dryRun and commit",
      async (_label, existingFile) => {
        const f = await fixture();
        f.state.files.set("main.bean", existingFile);
        try {
          const dry = await f.call(surface, { text: coffeeTxn, dryRun: true });
          expect(dry.ok).toBe(true);
          const preview = dry.ok ? (dry.data as Record<string, never>) : {};
          const [{ diff }] = preview.diff as { path: string; diff: string }[];
          expect(diff).toContain('+2026-08-31 * "Coffee" "Latte"\n');
          expect(diff).not.toMatch(/^[+-](push|pop)(tag|meta)/m);
          // The appended block must land after the existing entry's postings,
          // never before the closing quote.
          expect(diff.indexOf('end of memo"')).toBeLessThan(
            diff.indexOf('+2026-08-31 * "Coffee" "Latte"'),
          );
          expect(preview.appendedUnsorted).toEqual([]);
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();

          const res = await f.call(surface, { text: coffeeTxn });
          expect(res.ok).toBe(true);
          const data = res.ok ? (res.data as Record<string, never>) : {};
          expect(data.appendedUnsorted).toEqual([]);
          const written = f.state.files.get("main.bean")!;
          expect(written).toBe(`${existingFile}\n${coffeeTxn}\n`);
          const lines = written.split("\n");
          expect(
            (data.wrote as { line: number }[]).map(
              ({ line }) => lines[line - 1],
            ),
          ).toEqual(['2026-08-31 * "Coffee" "Latte"']);
        } finally {
          await f.close();
        }
      },
    );

    it.each(["#", ":", "!", "&", "?", "%"])(
      "keeps date order past a skipped %s line with an unmatched quote (w31/099)",
      async (start) => {
        const existingFile = [
          'option "title" "T"',
          "",
          '2026-08-29 * "Earlier" "note"',
          "  Expenses:Food:Groceries  2.00 USD",
          "  Assets:Cash",
          `${start} a 5" ruler`,
          '2026-08-30 * "Later" "note"',
          "  Expenses:Food:Groceries  1.00 USD",
          "  Assets:Cash",
          "",
        ].join("\n");
        const f = await fixture();
        f.state.files.set("main.bean", existingFile);
        try {
          const dry = await f.call(surface, { text: coffeeTxn, dryRun: true });
          expect(dry.ok).toBe(true);
          const preview = dry.ok ? (dry.data as Record<string, never>) : {};
          const [{ diff }] = preview.diff as { path: string; diff: string }[];
          expect(diff.indexOf('2026-08-30 * "Later" "note"')).toBeLessThan(
            diff.indexOf('+2026-08-31 * "Coffee" "Latte"'),
          );
          expect(preview.appendedUnsorted).toEqual([]);
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();

          const res = await f.call(surface, { text: coffeeTxn });
          expect(res.ok).toBe(true);
          expect(f.state.files.get("main.bean")).toBe(
            `${existingFile}\n${coffeeTxn}\n`,
          );
        } finally {
          await f.close();
        }
      },
    );

    it("inserts cleanly before a multiline-narration entry without corrupting date order", async () => {
      const f = await fixture();
      f.state.files.set("main.bean", keywordMultilineExisting);
      const earlierTxn = [
        '2026-08-29 * "Bakery" "Bread"',
        "  Expenses:Food:Groceries  3.00 USD",
        "  Assets:Cash",
      ].join("\n");
      try {
        const res = await f.call(surface, { text: earlierTxn });
        expect(res.ok).toBe(true);
        const data = res.ok ? (res.data as Record<string, never>) : {};
        expect(data.appendedUnsorted).toEqual([]);
        const written = f.state.files.get("main.bean")!;
        expect(written.indexOf('2026-08-29 * "Bakery" "Bread"')).toBeLessThan(
          written.indexOf('2026-08-30 * "Landlord" "Monthly rent'),
        );
        expect(written).not.toContain("poptag #fake");
        expect(written).not.toContain("popmeta fake:");
      } finally {
        await f.close();
      }
    });
  },
);

// w31/100: the engine reads a file past a leading byte-order mark. In front of
// line 1 it hid that line's `pushtag` and date, so an append was stored with
// a tag nobody wrote, or out of date order. The committed file keeps the mark.
describe.each(["rest", "gql", "mcp"] as const)(
  "appending to a file that starts with a byte-order mark via %s (w31/100)",
  (surface) => {
    const BOM = String.fromCharCode(0xfeff);
    const txn = (date: string, narration: string) =>
      [
        `${date} * "qa payee" "${narration}"`,
        "  Expenses:Food:Coffee   3.00 USD",
        "  Assets:Cash",
      ].join("\n");

    it("keeps the entry out of a first-line pushtag scope on preview and commit", async () => {
      const scoped = [
        "pushtag #qa-trip",
        txn("2026-09-02", "scoped A"),
        "",
        txn("2026-09-05", "scoped B"),
        "poptag #qa-trip",
        "",
      ].join("\n");
      const text = `${txn("2026-09-03", "appended")}\n`;
      const f = await fixture();
      f.state.files.set("main.bean", `${BOM}${scoped}`);
      try {
        const dry = await f.call(surface, { text, dryRun: true });
        expect(dry.ok).toBe(true);
        const preview = dry.ok ? (dry.data as Record<string, never>) : {};
        const [{ diff }] = preview.diff as { path: string; diff: string }[];
        expect(diff).toMatch(/^\+poptag #qa-trip$/m);
        expect(diff).toMatch(/^\+pushtag #qa-trip$/m);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();

        const result = await f.call(surface, { text });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        const written = f.state.files.get("main.bean")!;
        expect(written).toBe(
          [
            `${BOM}pushtag #qa-trip`,
            txn("2026-09-02", "scoped A"),
            "",
            "poptag #qa-trip",
            txn("2026-09-03", "appended"),
            "pushtag #qa-trip",
            "",
            txn("2026-09-05", "scoped B"),
            "poptag #qa-trip",
            "",
          ].join("\n"),
        );
        const lines = written.split("\n");
        expect(
          (data.wrote as { line: number }[]).map(({ line }) => lines[line - 1]),
        ).toEqual(['2026-09-03 * "qa payee" "appended"']);
      } finally {
        await f.close();
      }
    });

    it("puts an entry dated before line 1's entry above it on preview and commit", async () => {
      const file = [
        txn("2026-09-10", "ten"),
        "",
        txn("2026-09-20", "twenty"),
        "",
      ].join("\n");
      const text = `${txn("2026-09-08", "eight")}\n`;
      const f = await fixture();
      f.state.files.set("main.bean", `${BOM}${file}`);
      try {
        const dry = await f.call(surface, { text, dryRun: true });
        expect(dry.ok).toBe(true);
        const preview = dry.ok ? (dry.data as Record<string, never>) : {};
        expect(preview.appendedUnsorted).toEqual([]);
        const [{ diff }] = preview.diff as { path: string; diff: string }[];
        // The mark stays the file's first character, so line 1 shows as
        // changed: the new entry takes the mark, and the old line 1 moves down.
        expect(
          diff.indexOf(`+${BOM}2026-09-08 * "qa payee" "eight"`),
        ).toBeGreaterThan(-1);
        expect(
          diff.indexOf(`+${BOM}2026-09-08 * "qa payee" "eight"`),
        ).toBeLessThan(diff.indexOf('+2026-09-10 * "qa payee" "ten"'));
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();

        const result = await f.call(surface, { text });
        expect(result.ok).toBe(true);
        const data = result.ok ? (result.data as Record<string, never>) : {};
        expect(data.appendedUnsorted).toEqual([]);
        expect(data.wrote).toEqual([{ path: "main.bean", line: 1 }]);
        const written = f.state.files.get("main.bean")!;
        expect(
          written.startsWith(`${BOM}2026-09-08 * "qa payee" "eight"`),
        ).toBe(true);
        expect(written.slice(BOM.length).indexOf(BOM)).toBe(-1);
        expect(written.indexOf('2026-09-08 * "qa payee" "eight"')).toBeLessThan(
          written.indexOf('2026-09-10 * "qa payee" "ten"'),
        );
      } finally {
        await f.close();
      }
    });
  },
);

// w31/108: posting units with no currency, a number flush against its
// currency, and a `custom` value under an unpadded date are all amounts the
// engine reads back rounded. Each is refused on every surface, preview and
// commit alike, and each still commits with 28 digits.
describe.each(["rest", "gql", "mcp"] as const)(
  "amounts written without a spaced currency via %s (w31/108)",
  (surface) => {
    const BIG = "1.0000000000000000000000000000001";
    const FITS = "1.000000000000000000000000001";
    const forms = (amount: string): [string, string, string][] => [
      [
        "posting units with no currency",
        [
          '2026-09-02 * "qa" "no currency"',
          `  Assets:Cash  -${amount}`,
          "  Expenses:Food:Coffee  1.00 USD",
        ].join("\n"),
        `-${amount}`,
      ],
      [
        "a price flush against its currency",
        `2026-09-02 price EUR ${amount}USD`,
        amount,
      ],
      [
        "a custom value under an unpadded date",
        `2026-9-1 custom "qa" ${amount}`,
        amount,
      ],
    ];

    it.each(forms(BIG))(
      "refuses %s with BAD_USER_INPUT on dryRun and commit",
      async (_label, text, literal) => {
        const f = await fixture();
        try {
          for (const dryRun of [true, false]) {
            const res = await f.call(surface, { text, dryRun });
            expect(res.ok).toBe(false);
            const error = (res.ok ? {} : res.error) as {
              code?: string;
              message?: string;
              originalError?: { category?: string; message?: string };
            };
            expect(error.code ?? error.originalError?.category).toBe(
              "BAD_USER_INPUT",
            );
            expect(error.message ?? error.originalError?.message).toContain(
              `amount ${literal} has more than 28 significant digits`,
            );
          }
          expect(f.changeLedgerFiles).not.toHaveBeenCalled();
        } finally {
          await f.close();
        }
      },
    );

    // appendLedgerText reads only `YYYY-MM-DD` heads (w23/240), so it refuses
    // the unpadded `custom` as not a directive whatever its value; the other
    // file writes commit it (file-write-size-parity, source-slice-parity).
    it.each(forms(FITS).filter(([label]) => !label.includes("unpadded")))(
      "still commits %s with 28 digits",
      async (_label, text) => {
        const f = await fixture();
        try {
          const res = await f.call(surface, { text });
          expect(res.ok).toBe(true);
          expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
          expect(f.state.files.get("main.bean")).toContain(FITS);
        } finally {
          await f.close();
        }
      },
    );
  },
);
