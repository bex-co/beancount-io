import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { createHash } from "node:crypto";
import { LedgerJournalMutationResolver } from "../../../resolvers/ledger-journal-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { FavaApiError } from "@/foundation/fava/api-client";
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

/**
 * w1/m45/t003 — `moveEntrySources` (MCP), `POST …/entries/move` (REST) and
 * `moveLedgerEntrySources` (GraphQL) through the real adapters, the real
 * journal service and the real authorization, over a ledger service that
 * answers as `moveSourceSlices` does: the same inputs, previews, refusals and
 * results on every surface.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
let resolver: LedgerJournalMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerJournalMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerJournalMutationResolver
          ? resolver
          : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const TEA = '2026-08-04 * "Tea"\n  Expenses:Food  4.00 USD\n  Assets:Cash';
const CAKE = '2026-08-09 * "Cake"\n  Expenses:Food  4.00 USD\n  Assets:Cash';
const BTC_PRICE = "2026-08-01 price BTC 60000 USD";
const BALANCE_FAILED =
  "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD";

type MoveBody = {
  entries: { entry_hash: string; sha256sum: string }[];
  to_path: string;
  include_from?: string | null;
  allowInvalid?: boolean;
  dryRun?: boolean;
};

async function fixture(options: { readOnly?: boolean; breaks?: boolean } = {}) {
  const slices = new Map([
    ["tea", TEA],
    ["cake", CAKE],
    ["btc", BTC_PRICE],
  ]);
  const loaded = ["main.bean", "2026.bean", "prices/btc.bean"];
  const commits: MoveBody[] = [];
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  // The ledger service's move (w1/m45/t002), reduced to its contract.
  const moveSourceSlices = jest.fn(
    async (_owner: string, _name: string, body: MoveBody) => {
      const reached = loaded.includes(body.to_path);
      if (body.include_from && !loaded.includes(body.include_from)) {
        const error = `includeFrom ${body.include_from} is not a file the ledger loads; name one, such as main.bean`;
        throw new FavaApiError(error, 400, { error });
      }
      for (const ref of body.entries) {
        const text = slices.get(ref.entry_hash);
        if (ref.entry_hash === "btc") {
          const error =
            "Operation 'edit managed price source' not allowed: prices/btc.bean is a managed price feed resolved from a URL include and is read-only; declare a price directive in your own ledger file to override it";
          throw new FavaApiError(error, 403, { error });
        }
        if (text === undefined || hash(text) !== ref.sha256sum) {
          const error = `Entry ${ref.entry_hash} changed since it was read; read its source again`;
          throw new FavaApiError(error, 409, { error });
        }
      }
      if (body.to_path === "main.bean") {
        const error =
          "an entry already lives in main.bean; move only entries from other files";
        throw new FavaApiError(error, 400, { error });
      }
      if (!reached && !body.include_from) {
        const error = `${body.to_path} is not included by the ledger (main.bean does not reach it), so moved entries would count nowhere; pass includeFrom (for example main.bean) to add its include in the same commit`;
        throw new FavaApiError(error, 400, { error });
      }
      const projection =
        options.breaks === true
          ? {
              errors_before: 0,
              errors_after: 1,
              new_errors: [
                {
                  message: BALANCE_FAILED,
                  source: { filename: "main.bean", lineno: 3 },
                },
              ],
            }
          : { errors_before: 0, errors_after: 0, new_errors: [] };
      if (options.breaks === true && body.allowInvalid !== true) {
        const error = `moving these entries would introduce 1 new bean-check error: ${BALANCE_FAILED}`;
        throw new FavaApiError(error, 400, {
          error,
          code: "NEW_LEDGER_ERRORS",
          details: { count: 1, detail: BALANCE_FAILED, action: "move" },
        });
      }
      const includeAdded = !reached && Boolean(body.include_from);
      const hashes = [...new Set(body.entries.map((ref) => ref.entry_hash))];
      if (body.dryRun !== true) commits.push(body);
      return envelope({
        message: `${body.dryRun ? "Would move" : "Moved"} ${hashes.length} entries to ${body.to_path}`,
        moved_hashes: hashes,
        include_added: includeAdded,
        files: [
          "main.bean",
          body.to_path,
          ...(includeAdded ? [body.include_from] : []),
        ],
        preview: hashes.map((h) => ({
          path: "main.bean",
          text: slices.get(h),
        })),
        ...projection,
        ...(body.dryRun !== true && { commit: "c0ffee1" }),
      });
    },
  );
  const fava = {
    getAdminClient: () => ({
      ledgers: { getLedger: async () => envelope({ id: 42, private: true }) },
    }),
    getApiContext: async () => ({
      favaApiClient: {
        collaborators: {
          getLedgerCollaboratorPermission: async () =>
            envelope({ permission: options.readOnly ? "read" : "write" }),
        },
      },
    }),
    getPublicApiClient: async () => ({ journal: { moveSourceSlices } }),
  };
  const models = {
    user: {
      getUserByUsername: async () => ({ id: "usr_owner" }),
      getById: async () => ({ id: identity.userId, ledger_username: "alice" }),
    },
  };
  const service = new LedgerJournalService(
    fava as never,
    new AuthorizationService(
      new SourceBackedRelationshipEvaluator(
        {} as never,
        models as never,
        {} as never,
        fava as never,
      ),
    ),
  );
  resolver = new LedgerJournalMutationResolver(service);
  const rest = await startV1TestServer(
    { services: { ledgerJournal: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { ledgerJournal: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "move-entry-sources", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** Calls one surface with camelCase flags; MCP gets its snake_case twins. */
  const call = async (surface: string, args: Record<string, unknown>) => {
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/entries/move`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      const body = (await response.json()) as Record<string, unknown> & {
        error?: { code?: string; message?: string };
      };
      return {
        success: response.status === 200,
        result: body,
        code: body.error?.code,
        message: body.error?.message,
      };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source:
          'mutation($input:MoveEntrySourcesInput!) { moveLedgerEntrySources(ledgerId:"alice/main",input:$input) { message dryRun movedHashes toPath includeAdded preview { path text } errorsBefore errorsAfter newErrors { message } valid commit } }',
        variableValues: { input: args },
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      return {
        success: !result.errors,
        result: result.data?.moveLedgerEntrySources as
          | Record<string, unknown>
          | undefined,
        code: error
          ? formatError(error.toJSON(), error).extensions?.code
          : undefined,
        message: error?.message,
      };
    }
    // MCP's own spellings, unless the call already sends them (a twin test).
    const { dryRun, allowInvalid, ...others } = args;
    const respell = (camel: unknown, snake: string) =>
      camel === undefined
        ? {}
        : snake in others
          ? {
              [snake.replace(/_(\w)/g, (_m, c: string) => c.toUpperCase())]:
                camel,
            }
          : { [snake]: camel };
    const result = await client.callTool({
      name: "moveEntrySources",
      arguments: {
        ...others,
        ...respell(dryRun, "dry_run"),
        ...respell(allowInvalid, "allow_invalid"),
      },
    });
    const structured = result.structuredContent as {
      result?: Record<string, unknown>;
      error?: { code?: string; message?: string };
    };
    return {
      success: !result.isError,
      result: structured?.result,
      code: structured?.error?.code,
      message: structured?.error?.message,
    };
  };
  return {
    moveSourceSlices,
    commits,
    call,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const SURFACES = ["rest", "gql", "mcp"] as const;
const ENTRIES = [
  { entryHash: "cake", sha256sum: hash(CAKE) },
  // The list spelling, as listLedgerEntries returns it.
  { entry_hash: "tea", sha256sum: hash(TEA) },
];
const MOVE = {
  entries: ENTRIES,
  toPath: "2026/08.bean",
  includeFrom: "main.bean",
};
/** MCP nests the verdict under validation; REST and GraphQL flatten it. */
const verdict = (result: Record<string, unknown> | undefined) =>
  (result?.valid as boolean | undefined) ??
  (result?.validation as { valid: boolean } | undefined)?.valid;

describe.each(SURFACES)("moveEntrySources on %s (w1/m45)", (surface) => {
  it("moves the entries and adds the include in one commit, returning its sha", async () => {
    const env = await fixture();
    try {
      const { success, result } = await env.call(surface, MOVE);
      expect(success).toBe(true);
      // One ledger call, every spelling resolved to the wire's.
      expect(env.moveSourceSlices).toHaveBeenCalledTimes(1);
      expect(env.commits).toEqual([
        {
          entries: [
            { entry_hash: "cake", sha256sum: hash(CAKE) },
            { entry_hash: "tea", sha256sum: hash(TEA) },
          ],
          to_path: "2026/08.bean",
          include_from: "main.bean",
        },
      ]);
      expect(result).toMatchObject({
        message: "Moved 2 entries to 2026/08.bean",
        movedHashes: ["cake", "tea"],
        toPath: "2026/08.bean",
        includeAdded: true,
        commit: "c0ffee1",
        preview: [
          { path: "main.bean", text: CAKE },
          { path: "main.bean", text: TEA },
        ],
      });
      expect(verdict(result)).toBe(true);
      if (surface === "mcp") {
        expect(result).toMatchObject({
          dry_run: false,
          wrote: [
            { path: "main.bean" },
            { path: "2026/08.bean" },
            // main.bean gained the include; it is listed once.
          ],
          entryHashes: ["cake", "tea"],
        });
      } else {
        expect(result).toMatchObject({ dryRun: false });
      }
    } finally {
      await env.close();
    }
  });

  it("previews a move with the verdict and writes nothing", async () => {
    const env = await fixture();
    try {
      const { success, result } = await env.call(surface, {
        ...MOVE,
        dryRun: true,
      });
      expect(success).toBe(true);
      expect(env.commits).toHaveLength(0);
      // A preview asks the ledger for the verdict instead of a refusal.
      expect(env.moveSourceSlices.mock.calls[0][2]).toMatchObject({
        dryRun: true,
        allowInvalid: true,
      });
      expect(result).toMatchObject({
        message: "Would move 2 entries to 2026/08.bean",
        includeAdded: true,
        preview: [
          { path: "main.bean", text: CAKE },
          { path: "main.bean", text: TEA },
        ],
      });
      // GraphQL selects the nullable field as null; the others omit it.
      expect(result?.commit ?? undefined).toBeUndefined();
      expect(verdict(result)).toBe(true);
      if (surface === "mcp") expect(result).toMatchObject({ wrote: [] });
    } finally {
      await env.close();
    }
  });

  it("previews a breaking move as invalid, and refuses its commit unless allowInvalid", async () => {
    const env = await fixture({ breaks: true });
    try {
      const preview = await env.call(surface, { ...MOVE, dryRun: true });
      expect(preview.success).toBe(true);
      expect(verdict(preview.result)).toBe(false);
      const refused = await env.call(surface, MOVE);
      expect(refused).toMatchObject({
        success: false,
        code: "VALIDATION_FAILED",
      });
      // The refusal names the move, not the structured add it used to read as.
      expect(refused.message).toMatch(
        /^Validation failed for entries: moving these entries would introduce 1 new bean-check error: Balance failed/,
      );
      expect(env.commits).toHaveLength(0);
      const forced = await env.call(surface, { ...MOVE, allowInvalid: true });
      expect(forced.success).toBe(true);
      expect(env.commits).toHaveLength(1);
      // REST and GraphQL report the ledger's projection; MCP re-reads the
      // committed ledger instead (w23/161), which this fixture does not stub.
      if (surface !== "mcp") expect(verdict(forced.result)).toBe(false);
    } finally {
      await env.close();
    }
  });

  it("refuses an unloaded target without includeFrom, and a stale checksum, by the same codes", async () => {
    const env = await fixture();
    try {
      await expect(
        env.call(surface, { entries: ENTRIES, toPath: "2026/08.bean" }),
      ).resolves.toMatchObject({ success: false, code: "BAD_USER_INPUT" });
      await expect(
        env.call(surface, {
          ...MOVE,
          entries: [{ entryHash: "tea", sha256sum: "0".repeat(64) }],
        }),
      ).resolves.toMatchObject({ success: false, code: "CONFLICT" });
      expect(env.commits).toHaveLength(0);
    } finally {
      await env.close();
    }
  });

  it.each([
    [
      "an includeFrom the ledger does not load",
      { ...MOVE, includeFrom: "nowhere.bean" },
      "BAD_USER_INPUT",
    ],
    [
      "a target an entry already lives in",
      { entries: ENTRIES, toPath: "main.bean" },
      "BAD_USER_INPUT",
    ],
    [
      "an entry in a managed price include",
      { ...MOVE, entries: [{ entryHash: "btc", sha256sum: hash(BTC_PRICE) }] },
      "OPERATION_NOT_ALLOWED",
    ],
  ])(
    "refuses %s by the same code, writing nothing",
    async (_case, args, code) => {
      const env = await fixture();
      try {
        await expect(env.call(surface, args)).resolves.toMatchObject({
          success: false,
          code,
        });
        expect(env.commits).toHaveLength(0);
      } finally {
        await env.close();
      }
    },
  );

  it("refuses more than 1000 entries before reaching the ledger", async () => {
    const env = await fixture();
    try {
      const entries = Array.from({ length: 1001 }, () => ENTRIES[0]);
      const refused = await env.call(surface, { ...MOVE, entries });
      // REST refuses a body its schema rejects as VALIDATION_FAILED, as the
      // batch delete's cap does (w23/103); the others read the service's cap.
      expect(refused).toMatchObject({
        success: false,
        code: surface === "rest" ? "VALIDATION_FAILED" : "BAD_USER_INPUT",
      });
      expect(refused.message).toMatch(/1000/);
      expect(env.moveSourceSlices).not.toHaveBeenCalled();
    } finally {
      await env.close();
    }
  });

  it("refuses the two spellings of a flag disagreeing, before reaching the ledger", async () => {
    const env = await fixture();
    try {
      await expect(
        env.call(surface, { ...MOVE, dryRun: true, dry_run: false }),
      ).resolves.toMatchObject({ success: false, code: "BAD_USER_INPUT" });
      expect(env.moveSourceSlices).not.toHaveBeenCalled();
    } finally {
      await env.close();
    }
  });

  it("refuses a read-only collaborator before reaching the ledger", async () => {
    const env = await fixture({ readOnly: true });
    try {
      await expect(env.call(surface, MOVE)).resolves.toMatchObject({
        success: false,
        code: "FORBIDDEN",
      });
      expect(env.moveSourceSlices).not.toHaveBeenCalled();
    } finally {
      await env.close();
    }
  });
});
