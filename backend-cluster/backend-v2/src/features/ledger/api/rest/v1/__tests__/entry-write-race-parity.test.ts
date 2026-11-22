import "reflect-metadata";
import { createHash } from "node:crypto";
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
import { clearRateLimitShadows } from "@/server/api/rate-limit";
import { FavaApiError } from "@/foundation/fava/api-client";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { DomainError } from "@/shared/errors";
import { fakeRedisIdempotencyState } from "@/foundation/redis/__tests__/fake-redis-idempotency";

jest.mock(
  "@/foundation/redis/redis-idempotency",
  () =>
    jest.requireActual("@/foundation/redis/__tests__/fake-redis-idempotency")
      .fakeRedisIdempotency,
);

/**
 * w31/007 — two entry writes at once, on all three surfaces.
 *
 * `appendLedgerText` and `addLedgerEntries` read the file, check the
 * projection, then commit against the sha they read. A write that landed in
 * between made the ledger refuse the commit, and the loser was told to retry
 * "with that `sha`", an argument neither write takes. The fake ledger here
 * holds real file content, versions it by content, and lands a rival write
 * between a commit's read and its commit, as a concurrent caller would. Every
 * case runs the real service, workflow and writer behind each adapter.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

const MAIN = ['option "title" "T"', "", "2026-01-01 open Assets:Cash", ""].join(
  "\n",
);
const OURS = "Assets:Ours";
const RIVAL = "Assets:Rival";
const openLine = (account: string) => `2026-02-01 open ${account}`;
const LOST_RACE =
  "Ledger file conflict: the ledger changed under a concurrent write; re-read it and retry";

const versionOf = (content: string) =>
  createHash("sha1").update(content).digest("hex");
const decode = (base64: string) => Buffer.from(base64, "base64").toString();
const opened = (content: string) =>
  [...content.matchAll(/^\d{4}-\d{2}-\d{2} open (\S+)/gm)].map(
    (match) => match[1]!,
  );
/** bean-check's verdict over the fake: an account opened twice. */
const duplicateOpens = (contents: Iterable<string>) => {
  const accounts = [...contents].flatMap(opened);
  return [
    ...new Set(
      accounts.filter((account, i) => accounts.indexOf(account) !== i),
    ),
  ].map((account) => ({
    message: `Duplicate open directive for ${account}`,
    source: null,
  }));
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
beforeEach(() => {
  clearRateLimitShadows();
  fakeRedisIdempotencyState.reset();
});

type Surface = "rest" | "gql" | "mcp";
type Tool = "appendLedgerText" | "addLedgerEntries";
type Outcome = { ok: boolean; code?: string; hint?: string };

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const state = {
    files: new Map([["main.bean", MAIN]]),
    /** Accounts concurrent writers open, one landing ahead of each commit. */
    rivals: [] as string[],
    /** Commits that reached the repository, landed or refused. */
    attempts: 0,
  };
  const main = () => state.files.get("main.bean")!;
  // Another caller's append lands between this commit's read and the commit.
  const landRival = () => {
    const account = state.rivals.shift();
    if (account)
      state.files.set("main.bean", `${main()}${openLine(account)}\n`);
  };

  // The ledger service's file commit: Gitea's compare-and-swap on each sha.
  const changeLedgerFiles = jest.fn(
    async (
      _o: string,
      _n: string,
      body: {
        files: {
          operation: string;
          path: string;
          content?: string;
          sha?: string;
        }[];
      },
    ) => {
      state.attempts += 1;
      landRival();
      for (const file of body.files) {
        const current = state.files.get(file.path);
        if (
          file.operation === "update" &&
          (current === undefined || versionOf(current) !== file.sha)
        )
          throw new FavaApiError(LOST_RACE, 409, { error: LOST_RACE });
      }
      for (const file of body.files)
        state.files.set(file.path, decode(file.content ?? ""));
      return envelope({ commit: `commit-${state.attempts}` });
    },
  );

  // The ledger service's bulk route: read, check the projection, commit
  // once against the sha it read (backend-cluster/ledger `addBulkEntries`).
  const addBulkEntries = jest.fn(
    async (
      _o: string,
      _n: string,
      body: {
        entries: { type: string; item: { date: string; account: string } }[];
        allowInvalid?: boolean;
        dryRun?: boolean;
      },
    ) => {
      const read = main();
      const text = body.entries
        .map(({ item }) => `${item.date} open ${item.account}\n`)
        .join("");
      const before = duplicateOpens([read]);
      const after = duplicateOpens([`${read}${text}`]);
      const added = after.length - before.length;
      if (added > 0 && body.allowInvalid !== true) {
        const detail = after.map((error) => error.message).join("; ");
        throw new FavaApiError(detail, 400, {
          error: `adding these entries would introduce ${added} new bean-check error: ${detail}`,
          code: "NEW_LEDGER_ERRORS",
          details: { count: added, detail },
        });
      }
      const projection = {
        errors_before: before.length,
        errors_after: after.length,
        new_errors: after.slice(before.length),
      };
      if (body.dryRun === true)
        return envelope({
          entry_hashes: [],
          included_files: [],
          preview: [{ path: "main.bean", text }],
          ...projection,
        });
      state.attempts += 1;
      landRival();
      if (versionOf(main()) !== versionOf(read))
        throw new FavaApiError(LOST_RACE, 409, { error: LOST_RACE });
      state.files.set("main.bean", `${read}${text}`);
      return envelope({
        entry_hashes: body.entries.map((_entry, i) => `hash-${i}`),
        included_files: [],
        commit: `commit-${state.attempts}`,
        ...projection,
      });
    },
  );

  const project = (files: { path: string; content: string | null }[]) => {
    const projected = new Map(state.files);
    for (const file of files)
      if (file.content !== null) projected.set(file.path, decode(file.content));
    return projected;
  };
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
      entries: { addBulkEntries },
      reports: {
        getLedgerBcioOptions: async () =>
          envelope({ default_file: "main.bean" }),
        checkProjectedErrors: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope(duplicateOpens(project(body.files).values())),
        getProjectedSourceFiles: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope([...project(body.files).keys()]),
        getProjectedEntryIds: async (
          _o: string,
          _n: string,
          body: { locations: { path: string; line: number }[] },
        ) =>
          envelope({
            entry_hashes: body.locations.map(
              ({ path, line }) => `hash-${path}:${line}`,
            ),
          }),
      },
      ledgers: {
        getLedgerFile: async (_o: string, _n: string, q: { path: string }) =>
          envelope(
            state.files.has(q.path)
              ? { path: q.path, sha: versionOf(state.files.get(q.path)!) }
              : null,
          ),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) =>
          envelope(
            body.files
              .filter((path) => state.files.has(path))
              .map((path) => ({
                path,
                sha: versionOf(state.files.get(path)!),
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
      getById: async () => ({ id: identity.userId, ledger_username: "alice" }),
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
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerEntryService: service,
      services: { ledgerData: { getErrors: async () => [] } },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "entry-write-race-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** One write that opens `account`, sent the way each surface spells it. */
  const call = async (
    tool: Tool,
    surface: Surface,
    account: string,
    requestId?: string,
  ): Promise<Outcome> => {
    const text = `${openLine(account)}\n`;
    const entry = { date: "2026-02-01", account };
    const id = requestId === undefined ? {} : { requestId };
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${tool === "appendLedgerText" ? "directives/text" : "entries"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            tool === "appendLedgerText"
              ? { text, ...id }
              : { entries: [{ type: "open", entry }], ...id },
          ),
        },
      );
      const body = await response.json();
      return response.status === 200
        ? { ok: true }
        : {
            ok: false,
            code: body.error.code,
            hint: body.error.metadata?.hint,
          };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source:
          tool === "appendLedgerText"
            ? 'mutation($text:String!,$requestId:String) { appendLedgerText(ledgerId:"alice/main",text:$text,requestId:$requestId) { success } }'
            : 'mutation($entries:[AddEntryInput!]!,$requestId:String) { bulkEntries(ledgerId:"alice/main",entries:$entries,requestId:$requestId) { success } }',
        variableValues: {
          text,
          entries: [{ type: "OPEN", open: entry }],
          ...id,
        },
        contextValue: {
          identity,
          getCurrentIdentity: () => identity,
          platform: "web",
        },
      });
      const error = result.errors?.[0]?.originalError as
        | DomainError
        | undefined;
      return result.errors
        ? {
            ok: false,
            code: error?.category,
            hint: (error?.metadata as { hint?: string } | undefined)?.hint,
          }
        : { ok: true };
    }
    const result = await client.callTool({
      name: tool,
      arguments:
        tool === "appendLedgerText"
          ? { text, ...id }
          : { entries: [{ type: "open", entry }], ...id },
    });
    const structured = result.structuredContent as {
      error?: { code: string; hint?: string };
    };
    return result.isError
      ? {
          ok: false,
          code: structured.error?.code,
          hint: structured.error?.hint,
        }
      : { ok: true };
  };

  return {
    state,
    main,
    call,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const cases = (["appendLedgerText", "addLedgerEntries"] as const).flatMap(
  (tool) => (["rest", "gql", "mcp"] as const).map((surface) => [tool, surface]),
) as [Tool, Surface][];

describe("an entry write that loses the race to a concurrent write", () => {
  it.each(cases)(
    "%s re-reads the file and commits on top of the winner via %s",
    async (tool, surface) => {
      const f = await fixture();
      f.state.rivals = [RIVAL];
      try {
        expect(await f.call(tool, surface, OURS)).toEqual({ ok: true });
        // Both appends landed, the winner's first: nothing was clobbered.
        expect(opened(f.main())).toEqual(["Assets:Cash", RIVAL, OURS]);
        expect(f.state.attempts).toBe(2);
      } finally {
        await f.close();
      }
    },
  );

  it.each(cases)(
    "%s re-checks the fresh content and refuses what it would break via %s",
    async (tool, surface) => {
      const f = await fixture();
      // The winner opened the same account, so this open is now a duplicate.
      f.state.rivals = [OURS];
      try {
        const outcome = await f.call(tool, surface, OURS);
        expect(outcome).toMatchObject({ ok: false, code: "VALIDATION_FAILED" });
        expect(opened(f.main())).toEqual(["Assets:Cash", OURS]);
        // Refused by the check: the second attempt never reached a commit.
        expect(f.state.attempts).toBe(1);
      } finally {
        await f.close();
      }
    },
  );

  it.each(cases)(
    "%s is CONFLICT after 3 lost races, with a hint to resend the call that names no sha, via %s",
    async (tool, surface) => {
      const f = await fixture();
      f.state.rivals = ["Assets:R1", "Assets:R2", "Assets:R3", "Assets:R4"];
      try {
        const outcome = await f.call(tool, surface, OURS);
        expect(outcome).toMatchObject({ ok: false, code: "CONFLICT" });
        expect(outcome.hint).toMatch(/Send the same call again/);
        expect(outcome.hint).toMatch(/`requestId`/);
        expect(outcome.hint).not.toMatch(/sha/);
        expect(f.state.attempts).toBe(3);
        expect(opened(f.main())).not.toContain(OURS);
      } finally {
        await f.close();
      }
    },
  );

  it.each(cases)(
    "%s resent with the same requestId after the attempts ran out writes once via %s",
    async (tool, surface) => {
      const f = await fixture();
      f.state.rivals = ["Assets:R1", "Assets:R2", "Assets:R3"];
      try {
        const refused = await f.call(tool, surface, OURS, "req-race");
        expect(refused).toMatchObject({ ok: false, code: "CONFLICT" });
        // The refusal released the id, so the resend the hint asks for runs.
        expect(await f.call(tool, surface, OURS, "req-race")).toEqual({
          ok: true,
        });
        // And a repeat after that replays it instead of writing again.
        expect(await f.call(tool, surface, OURS, "req-race")).toEqual({
          ok: true,
        });
        expect(opened(f.main()).filter((a) => a === OURS)).toHaveLength(1);
        expect(f.state.attempts).toBe(4);
      } finally {
        await f.close();
      }
    },
  );
});
