import "reflect-metadata";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "../../../resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { AccountRenameWorkflow } from "@/features/ledger/workflow/account-rename-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
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
 * w31/130 — a rename that loses the race to a concurrent write, on all three
 * surfaces.
 *
 * `renameAccount` and `renameLedgerFile` read the files they touch, then
 * commit against the shas they read, so a write that lands in between refuses
 * the whole rename with `CONFLICT` (the w1/m43 contract). The hint was the
 * file-write one, "retry the write with that `sha`", or the entry one naming
 * `getEntryContext` and `sha256sum`: neither tool takes either. The fake ledger
 * here versions files by content and lands a rival write between a commit's
 * read and its commit, answering the lost race in each wording the ledger
 * service uses. Every case runs the real adapters, workflows and repository
 * service.
 */

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

const MAIN = [
  'option "title" "T"',
  'include "move.bean"',
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Assets:Probe USD",
  "",
].join("\n");
const MOVE = [
  '2026-02-01 * "Top-up"',
  "  Assets:Probe   5 USD",
  "  Assets:Cash",
  "",
].join("\n");
/** Another caller's write: a note on an account the rename does not name. */
const RIVAL_NOTE = '2026-08-31 note Assets:Cash "rival"\n';

/** The two wordings the ledger service gives a commit that lost its race. */
const LOST_RACE = [
  // Its file routes (`src/api/files.ts`).
  "Ledger file conflict: the ledger changed under a concurrent write; re-read it and retry",
  // Its error middleware, for a batch Gitea refused (`conflictMessage`).
  "the ledger changed under a concurrent write; re-read it and retry",
];

const versionOf = (content: string) =>
  createHash("sha1").update(content).digest("hex");
const decode = (base64: string) =>
  Buffer.from(base64.replace(/\s/g, ""), "base64").toString("utf-8");

let resolver: LedgerMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [LedgerMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === LedgerMutationResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

type Surface = "rest" | "gql" | "mcp";
type Tool = "renameAccount" | "renameLedgerFile";
type Outcome = { ok: boolean; code?: string; message?: string; hint?: string };

async function fixture(lostRace: string) {
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const state = {
    files: new Map([
      ["main.bean", MAIN],
      ["move.bean", MOVE],
    ]),
    /** Rival writes still to land, one ahead of each commit. */
    rivals: [] as (() => void)[],
    /** Commits the repository accepted. */
    commits: 0,
  };
  const loaded = () =>
    [...state.files.keys()].filter(
      (path) =>
        path === "main.bean" ||
        new RegExp(`^include "${path}"$`, "m").test(
          state.files.get("main.bean") ?? "",
        ),
    );
  const fileEntry = (path: string) => {
    const content = state.files.get(path);
    return content === undefined
      ? null
      : {
          name: path,
          path,
          type: "file",
          sha: versionOf(content),
          size: content.length,
          content,
          encoding: null,
        };
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
          content?: string | null;
          sha?: string | null;
        }[];
      },
    ) => {
      state.rivals.shift()?.();
      for (const file of body.files) {
        const current = state.files.get(file.path);
        if (file.operation === "create" && current !== undefined) {
          // The ledger service's wording for a create over a path that exists.
          const taken = `${file.path} already exists; update it with its sha, or choose another path`;
          throw new FavaApiError(taken, 409, { error: taken });
        }
        if (
          file.operation !== "create" &&
          (current === undefined || versionOf(current) !== file.sha)
        )
          throw new FavaApiError(lostRace, 409, { error: lostRace });
      }
      for (const file of body.files) {
        if (file.operation === "delete") state.files.delete(file.path);
        else state.files.set(file.path, decode(file.content ?? ""));
      }
      state.commits += 1;
      return envelope({ commit: `commit-${state.commits}` });
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
    getPublicApiClient: async () => ({
      reports: {
        checkProjectedErrors: async () => envelope([]),
        getProjectedSourceFiles: async () => envelope(loaded()),
        getLedgerSourceFiles: async () => envelope(loaded()),
      },
      ledgers: {
        getLedgerFile: async (_o: string, _n: string, q: { path: string }) =>
          envelope(fileEntry(q.path)),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) => envelope(body.files.map(fileEntry).filter(Boolean)),
        getLedgerDirContent: async () =>
          envelope(
            [...state.files.keys()].map((path) => ({
              type: "file",
              path,
              name: path,
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
  const ledgerData = { getErrors: async () => [] };
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization,
    undefined,
    new AccountRenameWorkflow(
      new LedgerRepoService(fava as never, authorization),
      ledgerData,
      authorization,
      // No bank connections on this ledger.
      { list: async () => [], remap: async () => {} },
    ),
  );
  resolver = new LedgerMutationResolver(workflow);
  const rest = await startV1TestServer(
    {
      workflows: { ledger: workflow },
      services: { ledgerData },
    } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
      services: { ledgerData },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "rename-write-race-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const ARGS: Record<Tool, Record<string, unknown>> = {
    renameAccount: { from: "Assets:Probe", to: "Assets:Probe2" },
    renameLedgerFile: {
      oldPath: "move.bean",
      newPath: "move2.bean",
      updateIncludes: true,
    },
  };

  /** The tool's one rename, sent the way each surface spells it. */
  const call = async (tool: Tool, surface: Surface): Promise<Outcome> => {
    const args = ARGS[tool];
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/${tool === "renameAccount" ? "rename-account" : "rename-file"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      const body = await response.json();
      return response.status === 200
        ? { ok: true }
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
          tool === "renameAccount"
            ? 'mutation($from:String!,$to:String!) { renameLedgerAccount(ledgerId:"alice/main",from:$from,to:$to) { message } }'
            : 'mutation($oldPath:String!,$newPath:String!,$updateIncludes:Boolean) { renameLedgerFile(ledgerId:"alice/main",oldPath:$oldPath,newPath:$newPath,updateIncludes:$updateIncludes) { message } }',
        variableValues: args,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      if (!error) return { ok: true };
      const { extensions } = formatError(error.toJSON(), error);
      return {
        ok: false,
        code: extensions?.code as string | undefined,
        message: error.message,
        hint: extensions?.hint as string | undefined,
      };
    }
    const result = await client.callTool({ name: tool, arguments: args });
    const structured = result.structuredContent as {
      error?: { code: string; message?: string; hint?: string };
    };
    return result.isError
      ? {
          ok: false,
          code: structured.error?.code,
          message: structured.error?.message,
          hint: structured.error?.hint,
        }
      : { ok: true };
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

const cases = (["renameAccount", "renameLedgerFile"] as const).flatMap((tool) =>
  (["rest", "gql", "mcp"] as const).flatMap((surface) =>
    LOST_RACE.map((lostRace) => [tool, surface, lostRace]),
  ),
) as [Tool, Surface, string][];

describe("a rename that loses the race to a concurrent write (w31/130)", () => {
  it.each(cases)(
    "%s via %s is CONFLICT, renames nothing, and its hint names no argument the tool lacks (ledger said %p)",
    async (tool, surface, lostRace) => {
      const f = await fixture(lostRace);
      f.state.rivals = [
        () =>
          f.state.files.set(
            "main.bean",
            `${f.state.files.get("main.bean")}${RIVAL_NOTE}`,
          ),
      ];
      try {
        const outcome = await f.call(tool, surface);
        expect(outcome).toMatchObject({ ok: false, code: "CONFLICT" });
        expect(outcome.hint).toMatch(/Another write changed a file/);
        expect(outcome.hint).toMatch(/Send the same call again/);
        expect(outcome.hint).not.toMatch(/sha|getEntryContext/);
        // Nothing renamed: only the rival's note landed.
        expect(f.state.commits).toBe(0);
        expect([...f.state.files]).toEqual([
          ["main.bean", `${MAIN}${RIVAL_NOTE}`],
          ["move.bean", MOVE],
        ]);

        // The resend the hint asks for reads the winner's files and commits.
        expect(await f.call(tool, surface)).toEqual({ ok: true });
        expect(f.state.commits).toBe(1);
        const main = f.state.files.get("main.bean")!;
        expect(main).toContain(RIVAL_NOTE);
        if (tool === "renameAccount") {
          expect(main).toContain("open Assets:Probe2 USD");
          expect(f.state.files.get("move.bean")).toContain("Assets:Probe2");
        } else {
          expect(main).toContain('include "move2.bean"');
          expect(f.state.files.get("move2.bean")).toBe(MOVE);
          expect(f.state.files.has("move.bean")).toBe(false);
        }
      } finally {
        await f.close();
      }
    },
  );

  it.each(["rest", "gql", "mcp"] as const)(
    "renameLedgerFile via %s whose target another write created first keeps the occupied-path refusal",
    async (surface) => {
      const f = await fixture(LOST_RACE[1]!);
      f.state.rivals = [() => f.state.files.set("move2.bean", "; theirs\n")];
      try {
        const outcome = await f.call("renameLedgerFile", surface);
        expect(outcome).toMatchObject({ ok: false, code: "CONFLICT" });
        expect(outcome.message).toMatch(/move2\.bean already exists/);
        expect(outcome.hint).not.toMatch(/Another write changed a file/);
        expect(f.state.commits).toBe(0);
        expect(f.state.files.get("move2.bean")).toBe("; theirs\n");
        expect(f.state.files.get("move.bean")).toBe(MOVE);
      } finally {
        await f.close();
      }
    },
  );
});
