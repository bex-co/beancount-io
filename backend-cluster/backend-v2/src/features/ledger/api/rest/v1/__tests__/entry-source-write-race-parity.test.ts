import "reflect-metadata";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerJournalMutationResolver } from "../../../resolvers/ledger-journal-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { formatError } from "@/server/graphql/format-error";
import { FavaApiError } from "@/foundation/fava/api-client";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

/**
 * w31/131 — an entry edit that a concurrent write overtakes, on all three
 * surfaces.
 *
 * The ledger service checks an `updateEntrySource` edit against the files it
 * loaded, then commits it. It used to re-apply the edit at commit time to
 * whatever the file held by then, unchecked: an edit valid on the ledger it
 * read but breaking the one it landed on committed without `allowInvalid`,
 * and REST and GraphQL reported `valid: true` for a ledger that was red. The
 * ledger now commits only onto the content it checked and runs the whole
 * write again when another write lands first, up to 3 attempts, then answers
 * `CONFLICT`. The fake ledger route below keeps that contract over a file it
 * versions by content, with a rival write landing between an attempt's check
 * and its commit. Every case runs the real service and adapters: REST and
 * GraphQL report the ledger's projection, MCP re-checks the ledger around
 * the write, and the three must agree.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

const probe = (amount: string) =>
  [
    '2026-08-30 * "race probe"',
    `  Assets:Cash  -${amount} USD`,
    `  Expenses:Coffee  ${amount} USD`,
  ].join("\n");
const PROBE = probe("1.00");
const PROBE_EDITED = probe("2.00");
const MAIN = [
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Expenses:Coffee USD",
  '2026-08-01 * "seed"',
  "  Assets:Cash  50.75 USD",
  "  Equity:Opening  -50.75 USD",
  PROBE,
  "",
].join("\n");
/** Holds only while the probe takes exactly 1.00 USD out of 50.75. */
const RIVAL = "2026-08-31 balance Assets:Cash  49.75 USD\n";
const BALANCE_FAILED =
  "Balance failed for Assets:Cash: expected 49.75 USD, got 48.75 USD";
const ENTRY = "11".repeat(16);
const ENTRY_EDITED = "33".repeat(16);
/** The ledger service's wording once every attempt lost (w31/131). */
const RACE_LOST =
  "Ledger conflict: concurrent writes changed the files this write touches before each of 3 attempts could commit; nothing was written";
const ATTEMPTS = 3;

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/** bean-check over the fake: each Cash balance against the postings before it. */
function cashErrors(content: string) {
  let date = "";
  let cash = 0;
  const errors: {
    message: string;
    source: { filename: string; lineno: number };
  }[] = [];
  content.split("\n").forEach((line, index) => {
    const head = /^(\d{4}-\d{2}-\d{2}) \*/.exec(line);
    if (head) date = head[1]!;
    const posting = /^\s+Assets:Cash\s+(-?\d+\.\d{2}) USD$/.exec(line);
    if (posting && date) cash += Math.round(Number(posting[1]) * 100);
    const balance =
      /^\d{4}-\d{2}-\d{2} balance Assets:Cash\s+(-?\d+\.\d{2}) USD$/.exec(line);
    if (balance && Math.round(Number(balance[1]) * 100) !== cash)
      errors.push({
        message: `Balance failed for Assets:Cash: expected ${balance[1]} USD, got ${(cash / 100).toFixed(2)} USD`,
        source: { filename: "main.bean", lineno: index + 1 },
      });
  });
  return errors;
}

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

type Surface = "rest" | "gql" | "mcp";
type Validation = {
  errorsBefore: number;
  errorsAfter: number;
  newErrors: { message: string }[];
  valid: boolean;
};
type Outcome =
  | { ok: true; validation: Validation }
  | { ok: false; code?: string; message?: string; hint?: string };

async function fixture() {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const state = {
    main: MAIN,
    /** Concurrent writes, one landing before each attempt's commit. */
    rivals: [] as (() => void)[],
    attempts: 0,
    commits: 0,
  };

  // The ledger service's source-slice update as it now runs (w31/131): each
  // attempt reads, locates and checks, then commits only onto what it read.
  const updateSourceSlice = jest.fn(
    async (
      _o: string,
      _n: string,
      body: {
        entry_hash: string;
        sha256sum: string;
        new_content: string;
        allowInvalid?: boolean;
        dryRun?: boolean;
      },
    ) => {
      for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        state.attempts += 1;
        const read = state.main;
        if (body.entry_hash !== ENTRY || body.sha256sum !== sha256(PROBE)) {
          const stale =
            "Entry conflict: it has changed since it was loaded; refresh and retry";
          throw new FavaApiError(stale, 409, { error: stale });
        }
        const written = read.replace(PROBE, body.new_content);
        const before = cashErrors(read);
        const after = cashErrors(written);
        const added = after.filter(
          (error) => !before.some((known) => known.message === error.message),
        );
        if (added.length > 0 && body.allowInvalid !== true) {
          const detail = added.map((error) => error.message).join("; ");
          const error = `this edit would introduce ${added.length} new bean-check error: ${detail}`;
          throw new FavaApiError(error, 400, {
            error,
            code: "NEW_LEDGER_ERRORS",
            details: { count: added.length, detail, action: "update" },
          });
        }
        state.rivals.shift()?.();
        // Another write landed first: run the whole write again on it.
        if (state.main !== read) continue;
        state.main = written;
        state.commits += 1;
        return envelope({
          message: "Entry updated successfully",
          entry_hash: ENTRY_EDITED,
          new_entry_hash: ENTRY_EDITED,
          new_sha256sum: sha256(body.new_content),
          unchanged: false,
          files: ["main.bean"],
          commit: `commit-${state.commits}`,
          errors_before: before.length,
          errors_after: after.length,
          new_errors: added,
        });
      }
      throw new FavaApiError(RACE_LOST, 409, { error: RACE_LOST });
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
            envelope({ permission: "write" }),
        },
      },
    }),
    getPublicApiClient: async () => ({ journal: { updateSourceSlice } }),
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
  // What `checkLedger` reads: MCP's post-write verdict comes from here.
  const ledgerData = { getErrors: async () => cashErrors(state.main) };
  resolver = new LedgerJournalMutationResolver(service);
  const rest = await startV1TestServer(
    {
      services: { ledgerJournal: service, ledgerData },
    } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { ledgerJournal: service, ledgerData },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({
    name: "entry-source-write-race-parity",
    version: "1",
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** The probe's edit to 2.00 USD, sent the way each surface spells it. */
  const call = async (
    surface: Surface,
    allowInvalid = false,
  ): Promise<Outcome> => {
    const input = {
      entryHash: ENTRY,
      sha256sum: sha256(PROBE),
      newContent: PROBE_EDITED,
      ...(allowInvalid && { allowInvalid: true }),
    };
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/entry-source`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = await response.json();
      return response.status === 200
        ? {
            ok: true,
            validation: {
              errorsBefore: body.errorsBefore,
              errorsAfter: body.errorsAfter,
              newErrors: body.newErrors,
              valid: body.valid,
            },
          }
        : {
            ok: false,
            code: body.error.code,
            message: body.error.message,
            hint: body.error.metadata?.hint,
          };
    }
    if (surface === "gql") {
      const result = await graphql({
        schema,
        source:
          'mutation($input:UpdateSourceSliceInput!) { updateLedgerEntrySourceSlice(ledgerId:"alice/main",input:$input) { errorsBefore errorsAfter valid newErrors { message } } }',
        variableValues: { input },
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      if (!error) {
        return {
          ok: true,
          validation: result.data?.updateLedgerEntrySourceSlice as Validation,
        };
      }
      const { extensions } = formatError(error.toJSON(), error);
      return {
        ok: false,
        code: extensions?.code as string | undefined,
        message: error.message,
        hint: extensions?.hint as string | undefined,
      };
    }
    const result = await client.callTool({
      name: "updateEntrySource",
      arguments: input,
    });
    const structured = result.structuredContent as {
      result?: { validation: Validation };
      error?: { code: string; message?: string; hint?: string };
    };
    return result.isError
      ? {
          ok: false,
          code: structured.error?.code,
          message: structured.error?.message,
          hint: structured.error?.hint,
        }
      : { ok: true, validation: structured.result!.validation };
  };

  return {
    state,
    call,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const SURFACES = ["rest", "gql", "mcp"] as const;
const appendRival = (state: { main: string }) => () => {
  state.main = `${state.main}${RIVAL}`;
};

describe("updateEntrySource overtaken by a concurrent write (w31/131)", () => {
  it.each(SURFACES)(
    "via %s is refused on what landed, and commits nothing",
    async (surface) => {
      const f = await fixture();
      f.state.rivals = [appendRival(f.state)];
      try {
        const outcome = await f.call(surface);
        expect(outcome).toMatchObject({
          ok: false,
          code: "VALIDATION_FAILED",
        });
        expect((outcome as { message: string }).message).toContain(
          BALANCE_FAILED,
        );
        expect(f.state.commits).toBe(0);
        expect(f.state.main).toBe(`${MAIN}${RIVAL}`);
        expect(cashErrors(f.state.main)).toEqual([]);
      } finally {
        await f.close();
      }
    },
  );

  it.each(SURFACES)(
    "via %s with allowInvalid commits on what landed and reports the error it adds",
    async (surface) => {
      const f = await fixture();
      f.state.rivals = [appendRival(f.state)];
      try {
        const outcome = await f.call(surface, true);
        expect(outcome).toEqual({
          ok: true,
          validation: {
            errorsBefore: 0,
            errorsAfter: 1,
            newErrors: [expect.objectContaining({ message: BALANCE_FAILED })],
            valid: false,
          },
        });
        expect(f.state.commits).toBe(1);
        expect(f.state.main).toContain(PROBE_EDITED);
        expect(f.state.main).toContain(RIVAL);
      } finally {
        await f.close();
      }
    },
  );

  it.each(SURFACES)(
    "via %s is CONFLICT after 3 lost races, with a hint to send the same call again",
    async (surface) => {
      const f = await fixture();
      f.state.rivals = [1, 2, 3].map((n) => () => {
        f.state.main = `${f.state.main}; rival ${n}\n`;
      });
      try {
        const outcome = await f.call(surface);
        expect(outcome).toMatchObject({ ok: false, code: "CONFLICT" });
        const { hint } = outcome as { hint?: string };
        expect(hint).toMatch(/Send the same call again/);
        expect(hint).toMatch(/nothing was written/);
        // Not the file write's `sha`, not the stale-entry re-read: the
        // entry's hash and checksum are still current.
        expect(hint).not.toMatch(/`sha`|getEntryContext/);
        expect(f.state.attempts).toBe(ATTEMPTS);
        expect(f.state.commits).toBe(0);
        expect(f.state.main).not.toContain(PROBE_EDITED);

        // The resend the hint asks for checks the winners' content and commits.
        const resent = await f.call(surface);
        expect(resent).toMatchObject({
          ok: true,
          validation: { errorsAfter: 0, valid: true },
        });
        expect(f.state.main).toContain(PROBE_EDITED);
        expect(f.state.main).toContain("; rival 3\n");
      } finally {
        await f.close();
      }
    },
  );
});
