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
} from "@/features/ledger/service/ledger-entry-service";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { DirectiveAppendWorkflow } from "@/features/ledger/workflow/directive-append-workflow";
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
    routeTransactionsTo: null as string | null,
    /** The ledger's include closure; every fixture file unless narrowed. */
    sourceFiles: undefined as string[] | undefined,
  };
  const commits: Commit[] = [];

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
    async (_o, _n, body: { files: unknown[] }) =>
      // No overlay is the baseline read; an overlay is the projection.
      envelope(body.files.length === 0 ? [] : state.projectedErrors),
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
  };
  return {
    state,
    commits,
    changeLedgerFiles,
    checkProjectedErrors,
    getProjectedEntryIds,
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
          source: `mutation { appendLedgerText(ledgerId: "alice/main", text: ${JSON.stringify(args.text)}${args.path ? `, path: ${JSON.stringify(args.path)}` : ""}${args.dryRun !== undefined ? `, dryRun: ${args.dryRun}` : ""}${args.dry_run !== undefined ? `, dry_run: ${args.dry_run}` : ""}${args.allowInvalid ? ", allowInvalid: true" : ""}) { success message dryRun count wrote { path line } entryHashes diff { path diff } errorsBefore errorsAfter newErrors { message } appendedUnsorted } }`,
          contextValue: {
            identity: caller,
            getCurrentIdentity: () => caller,
            platform: "web",
          },
        });
        return result.errors
          ? { ok: false as const, error: result.errors[0] }
          : {
              ok: true as const,
              data: (result.data as Record<string, unknown>).appendLedgerText,
            };
      }
      const result = await client.callTool({
        name: "appendLedgerText",
        arguments: {
          text: args.text,
          ...(args.path && { path: args.path }),
          ...(raw
            ? {
                ...(args.dryRun !== undefined ? { dryRun: args.dryRun } : {}),
                ...(args.dry_run !== undefined
                  ? { dry_run: args.dry_run }
                  : {}),
              }
            : { ...(args.dryRun && { dry_run: true }) }),
          ...(args.allowInvalid && { allowInvalid: true }),
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
