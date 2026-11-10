import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import { formatError } from "@/server/graphql/format-error";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";
import { createFakeLedger, type Snapshot } from "./fake-ledger";

/**
 * w23/m42 — undoing a commit answers the same on REST, GraphQL and MCP.
 *
 * The write is the real `LedgerWorkflow` over a fake repository with a commit
 * history (`fake-ledger.ts`). Each surface gets the same four calls: a preview,
 * a commit, an undo a later commit built on, and an unknown commit; and a
 * credential that may not write. What differs between them is only the
 * envelope the answer arrives in.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const writer: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};
const reader: Identity = { ...writer, scopes: new Set(["ledger.read"]) };

const FINE: Snapshot = {
  "main.bean": 'include "ok.bean"\n',
  "ok.bean": "; fine\n",
};
const BROKEN: Snapshot = { ...FINE, "ok.bean": "BAD\n" };
const WORSE: Snapshot = { ...FINE, "ok.bean": "BAD\nBAD\n" };

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

type Answer = {
  ok: boolean;
  code?: string;
  result?: Record<string, unknown>;
};

async function fixture(history: Snapshot[], caller: Identity = writer) {
  const ledger = createFakeLedger(history);
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
      ledger.fava as never,
    ),
  );
  const ledgerData = {
    getErrors: jest.fn(async () => ledger.errors()),
  };
  const workflow = new LedgerWorkflow(
    ledger.fava as never,
    ledger.giteaClientFactory as never,
    {} as never,
    {} as never,
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  resolver = new LedgerMutationResolver(workflow);
  const ledgerRepo = new LedgerRepoService(ledger.fava as never, authorization);
  const rest = await startV1TestServer(
    {
      workflows: { ledger: workflow },
      services: { ledgerRepo, ledgerData },
    } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(caller);
  const server = assembleMcpRegistry(
    {
      identity: caller,
      ledgerWorkflow: workflow,
      services: { ledgerData, ledgerRepo },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "revert-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  const call = async (
    surface: string,
    args: { sha: string; dryRun?: boolean; message?: string },
  ): Promise<Answer> => {
    if (surface === "rest") {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main/revert-commit`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(args),
        },
      );
      const body = await response.json();
      return response.status === 200
        ? { ok: true, result: body }
        : { ok: false, code: body.error?.code };
    }
    if (surface === "gql") {
      const response = await graphql({
        schema,
        source:
          'mutation($sha:String!,$message:String,$dryRun:Boolean) { revertLedgerCommit(ledgerId:"alice/main",sha:$sha,message:$message,dryRun:$dryRun) { sha subject message files { path change } dryRun commit errorsBefore errorsAfter newErrors { message source } valid } }',
        variableValues: args,
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform: "web",
        },
      });
      const error = response.errors?.[0];
      return error
        ? {
            ok: false,
            code: formatError(error.toJSON(), error).extensions?.code as string,
          }
        : {
            ok: true,
            result: JSON.parse(
              JSON.stringify(response.data?.revertLedgerCommit),
            ),
          };
    }
    const response = await client.callTool({
      name: "revertCommit",
      arguments: {
        sha: args.sha,
        ...(args.message && { message: args.message }),
        ...(args.dryRun !== undefined && { dry_run: args.dryRun }),
      },
    });
    const content = response.structuredContent as {
      ok?: boolean;
      result?: Record<string, unknown>;
      error?: { code?: string };
    };
    return response.isError
      ? { ok: false, code: content.error?.code }
      : { ok: true, result: content.result };
  };
  return {
    call,
    snapshot: ledger.snapshot,
    shas: ledger.shas,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

/**
 * What every surface agrees on, leaving out each one's own envelope. GraphQL
 * answers an absent `commit` as `null`, as it does every nullable field.
 */
const common = (answer: Answer) => {
  const { sha, subject, message, files, commit, ...rest } = answer.result ?? {};
  // MCP nests the verdict under `validation`; REST and GraphQL publish it flat
  // (w23/233).
  const validation =
    rest.validation ??
    (answer.ok
      ? {
          errorsBefore: rest.errorsBefore,
          errorsAfter: rest.errorsAfter,
          newErrors: rest.newErrors,
          valid: rest.valid,
        }
      : undefined);
  return {
    ok: answer.ok,
    code: answer.code,
    sha,
    subject,
    message,
    files,
    commit: commit ?? undefined,
    validation,
  };
};

describe.each(["rest", "gql", "mcp"])("revertCommit via %s", (surface) => {
  it("previews the files it would restore and writes nothing", async () => {
    const f = await fixture([FINE, BROKEN]);
    try {
      const answer = await f.call(surface, { sha: "c1", dryRun: true });
      expect(common(answer)).toEqual({
        ok: true,
        code: undefined,
        sha: "c1",
        subject: "Commit 1",
        message: 'Revert "Commit 1"\n\nThis reverts commit c1.',
        files: [{ path: "ok.bean", change: "updated" }],
        commit: undefined,
        // The projection of the files the revert would leave.
        validation: {
          errorsBefore: 1,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      });
      expect(f.snapshot()).toEqual(BROKEN);
      expect(f.shas()).toEqual(["c0", "c1"]);
    } finally {
      await f.close();
    }
  });

  it("commits the undo as one new commit and returns its sha", async () => {
    const f = await fixture([FINE, BROKEN]);
    try {
      const answer = await f.call(surface, { sha: "main", message: "Undo it" });
      expect(common(answer)).toEqual({
        ok: true,
        code: undefined,
        sha: "c1",
        subject: "Commit 1",
        message: "Undo it",
        files: [{ path: "ok.bean", change: "updated" }],
        commit: "c2",
        // Read back after the commit: the revert fixed the file's one error.
        validation: {
          errorsBefore: 1,
          errorsAfter: 0,
          newErrors: [],
          valid: true,
        },
      });
      expect(f.snapshot()).toEqual(FINE);
      expect(f.shas()).toEqual(["c0", "c1", "c2"]);
    } finally {
      await f.close();
    }
  });

  it("refuses a commit a later commit built on, writing nothing", async () => {
    const f = await fixture([FINE, BROKEN, WORSE]);
    try {
      expect(common(await f.call(surface, { sha: "c1" }))).toMatchObject({
        ok: false,
        code: "CONFLICT",
      });
      expect(f.snapshot()).toEqual(WORSE);
      expect(f.shas()).toEqual(["c0", "c1", "c2"]);
    } finally {
      await f.close();
    }
  });

  it("refuses a commit that does not exist, and a root commit", async () => {
    const f = await fixture([FINE, BROKEN]);
    try {
      expect(common(await f.call(surface, { sha: "nope" })).code).toBe(
        "NOT_FOUND",
      );
      expect(common(await f.call(surface, { sha: "c0" })).code).toBe(
        "BAD_USER_INPUT",
      );
    } finally {
      await f.close();
    }
  });

  it("refuses a credential that may not write, writing nothing", async () => {
    const f = await fixture([FINE, BROKEN], reader);
    try {
      expect(common(await f.call(surface, { sha: "c1" })).code).toBe(
        "FORBIDDEN",
      );
      expect(f.snapshot()).toEqual(BROKEN);
    } finally {
      await f.close();
    }
  });
});
