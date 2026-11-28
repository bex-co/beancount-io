import "reflect-metadata";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerMutationResolver } from "@/features/ledger/api/resolvers/ledger-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AccountRenameWorkflow } from "@/features/ledger/workflow/account-rename-workflow";
import type { LedgerBankMapping } from "@/features/ledger/workflow/account-rename-workflow.types";
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

/**
 * A ledger's bank mappings in memory, as `PlaidLedgerBankMappings` keeps them
 * in Postgres: every member's, the caller's own by name. `failing` makes the
 * next update throw, as a database outage would.
 */
function fakeBank(mappings: LedgerBankMapping[] = []) {
  const rows = new Map(mappings.map((mapping) => [mapping.id, { ...mapping }]));
  const bank = {
    failing: false,
    list: async () => [...rows.values()].map((row) => ({ ...row })),
    remap: async (changes: Omit<LedgerBankMapping, "name">[]) => {
      if (bank.failing) throw new Error("database is down");
      for (const change of changes) {
        rows.get(change.id)!.ledgerAccount = change.ledgerAccount;
      }
    },
    /** Each mapping's ledger account, by id. */
    accounts: () =>
      Object.fromEntries(
        [...rows.values()].map((row) => [row.id, row.ledgerAccount]),
      ),
  };
  return bank;
}

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
  status?: number;
  code?: string;
  field?: string;
  message?: string;
  result?: Record<string, unknown>;
};

async function fixture(
  history: Snapshot[],
  caller: Identity = writer,
  bank = fakeBank(),
) {
  const ledger = createFakeLedger(history);
  const getUserApiClient = jest.spyOn(
    ledger.giteaClientFactory,
    "getUserApiClient",
  );
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
  const ledgerRepo = new LedgerRepoService(ledger.fava as never, authorization);
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
    undefined,
    new AccountRenameWorkflow(ledgerRepo, ledgerData, authorization, bank),
  );
  resolver = new LedgerMutationResolver(workflow);
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
        ? { ok: true, status: response.status, result: body }
        : {
            ok: false,
            status: response.status,
            code: body.error?.code,
            field: body.error?.metadata?.field,
            message: body.error?.message,
          };
    }
    if (surface === "gql") {
      const response = await graphql({
        schema,
        source:
          'mutation($sha:String!,$message:String,$dryRun:Boolean) { revertLedgerCommit(ledgerId:"alice/main",sha:$sha,message:$message,dryRun:$dryRun) { sha subject message files { path change } bankMappings { plaidAccount from to updated } dryRun commit errorsBefore errorsAfter newErrors { message source } valid } }',
        variableValues: args,
        contextValue: {
          identity: caller,
          getCurrentIdentity: () => caller,
          platform: "web",
        },
      });
      const error = response.errors?.[0];
      if (error) {
        const formatted = formatError(error.toJSON(), error);
        return {
          ok: false,
          code: formatted.extensions?.code as string,
          field: formatted.extensions?.field as string | undefined,
          message: formatted.message,
        };
      }
      return {
        ok: true,
        result: JSON.parse(JSON.stringify(response.data?.revertLedgerCommit)),
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
      error?: { code?: string; message?: string };
    };
    return response.isError
      ? {
          ok: false,
          code: content.error?.code,
          message: content.error?.message,
        }
      : { ok: true, result: content.result };
  };
  return {
    call,
    /** A real renameAccount commit, as any surface makes one. */
    rename: (from: string, to: string) =>
      workflow.renameAccount({
        identity: caller,
        ledgerId: "alice/main",
        input: { from, to },
      }),
    /** A commit pushed some other way, with its own message. */
    push: async (message: string, files: Snapshot) => {
      const client = await ledger.fava.getPublicApiClient();
      await client.ledgers.changeLedgerFiles("alice", "main", {
        message,
        files: Object.entries(files).map(([path, content]) => ({
          operation: "update",
          path,
          content: Buffer.from(content, "utf-8").toString("base64"),
        })),
      });
    },
    getUserApiClient,
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
  const { sha, subject, message, files, bankMappings, commit, ...rest } =
    answer.result ?? {};
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
    bankMappings,
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
        // Not a rename: no bank mapping moves.
        bankMappings: [],
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
        bankMappings: [],
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

  // w31/024, w31/056, w31/061: the host answers a ref with a space it cannot
  // find with a 500, and leading/trailing spaces, bare `{…}` groups, and
  // non-leading-`:/` colon refs must never bypass validation or be silently
  // trimmed; refuse upfront with BAD_USER_INPUT before acquiring a Gitea
  // client.
  it.each([
    ["c1 c0", false],
    [" main ", true],
    [" main ", false],
    ["main ", true],
    ["main ", false],
    [" main", true],
    [" main", false],
    ["   ", true],
    ["main{ }", true],
    ["main:path with space.bean", true],
    [": ", false],
  ])(
    "refuses sha=%j (dryRun=%s) as BAD_USER_INPUT without calling Gitea",
    async (sha, dryRun) => {
      const f = await fixture([FINE, BROKEN]);
      try {
        const answer = await f.call(surface, {
          sha,
          ...(dryRun && { dryRun: true }),
        });
        expect(answer.ok).toBe(false);
        expect(answer.code).toBe("BAD_USER_INPUT");
        expect(answer.message).toContain("sha must not contain a space");
        if (surface === "rest") {
          expect(answer.status).toBe(400);
          expect(answer.field).toBe("sha");
        } else if (surface === "gql") {
          expect(answer.field).toBe("sha");
        }
        expect(f.getUserApiClient).not.toHaveBeenCalled();
        expect(f.snapshot()).toEqual(BROKEN);
        expect(f.shas()).toEqual(["c0", "c1"]);
      } finally {
        await f.close();
      }
    },
  );

  // w31/062: Gitea's line-oriented git ref lookup splits on `\n` and resolves
  // the first line (e.g. "main\nfoo" -> "main"). Refuse any line break upfront
  // with BAD_USER_INPUT before acquiring a Gitea client.
  it.each([
    ["main\nfoo", true],
    ["main\nfoo", false],
    ["b6d69fd\n", true],
    ["main\r\nfoo", true],
    ["main\rfoo", true],
    ["main@{1\nfoo}", true],
    [":/restore\nfoo", true],
    ["\n", true],
    ["\r\n", true],
  ])(
    "refuses line-break sha=%j (dryRun=%s) as BAD_USER_INPUT without calling Gitea",
    async (sha, dryRun) => {
      const f = await fixture([FINE, BROKEN]);
      try {
        const answer = await f.call(surface, {
          sha,
          ...(dryRun && { dryRun: true }),
        });
        expect(answer.ok).toBe(false);
        expect(answer.code).toBe("BAD_USER_INPUT");
        expect(answer.message).toContain("sha must not contain a line break");
        if (surface === "rest") {
          expect(answer.status).toBe(400);
          expect(answer.field).toBe("sha");
        } else if (surface === "gql") {
          expect(answer.field).toBe("sha");
        }
        expect(f.getUserApiClient).not.toHaveBeenCalled();
        expect(f.snapshot()).toEqual(BROKEN);
        expect(f.shas()).toEqual(["c0", "c1"]);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["", "\t"])(
    "refuses empty or blank sha=%j as BAD_USER_INPUT without calling Gitea",
    async (sha) => {
      const f = await fixture([FINE, BROKEN]);
      try {
        const answer = await f.call(surface, { sha, dryRun: true });
        expect(answer.ok).toBe(false);
        expect(answer.code).toBe("BAD_USER_INPUT");
        expect(answer.message).toBe("sha is required");
        if (surface === "rest") {
          expect(answer.status).toBe(400);
          expect(answer.field).toBe("sha");
        } else if (surface === "gql") {
          expect(answer.field).toBe("sha");
        }
        expect(f.getUserApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("refuses a credential that may not write, writing nothing", async () => {
    const f = await fixture([FINE, BROKEN], reader);
    try {
      expect(common(await f.call(surface, { sha: "c1" })).code).toBe(
        "FORBIDDEN",
      );
      expect(common(await f.call(surface, { sha: " main " })).code).toBe(
        "FORBIDDEN",
      );
      expect(f.getUserApiClient).not.toHaveBeenCalled();
      expect(f.snapshot()).toEqual(BROKEN);
    } finally {
      await f.close();
    }
  });

  // w31/088: reverting a commit that deleted a file must run
  // assertNoPortableTwin before returning a dry-run preview or committing,
  // refusing case/Unicode/invisible-character twins and file-vs-folder
  // collisions with CONFLICT (HTTP 409 on REST) across all three surfaces.
  describe("portable-twin and file-vs-folder conflict guards (w31/088)", () => {
    it.each([
      [
        "case twin",
        { ...FINE, "notes.bean": "; v1\n" },
        FINE,
        { ...FINE, "Notes.bean": "; v2\n" },
        "notes.bean already exists as Notes.bean",
      ],
      [
        "Unicode NFD twin",
        { ...FINE, "café.bean": "; v1\n" },
        FINE,
        { ...FINE, "cafe\u0301.bean": "; v2\n" },
        "café.bean already exists as cafe\u0301.bean",
      ],
      [
        "invisible-character twin",
        { ...FINE, "notes.bean": "; v1\n" },
        FINE,
        { ...FINE, "notes\u200b.bean": "; v2\n" },
        "notes.bean already exists as notes\u200b.bean",
      ],
      [
        "nested file beneath existing regular file",
        { ...FINE, "reports/sub.bean": "; v1\n" },
        FINE,
        { ...FINE, reports: "; now a file\n" },
        "reports/sub.bean cannot be created: reports is a file, not a folder",
      ],
      [
        "nested file beneath case-colliding folder",
        { ...FINE, "Reports/sub.bean": "; v1\n" },
        FINE,
        { ...FINE, "reports/other.bean": "; v2\n" },
        "Reports/sub.bean already exists as reports",
      ],
    ])(
      "refuses %s with CONFLICT on dryRun=true and dryRun=false, writing nothing",
      async (_label, c0, c1, c2, expectedMessage) => {
        for (const dryRun of [true, false]) {
          const f = await fixture([c0, c1, c2]);
          try {
            const answer = await f.call(surface, { sha: "c1", dryRun });
            expect(answer.ok).toBe(false);
            expect(answer.code).toBe("CONFLICT");
            expect(answer.message).toContain(expectedMessage);
            if (surface === "rest") {
              expect(answer.status).toBe(409);
            }
            expect(f.snapshot()).toEqual(c2);
            expect(f.shas()).toEqual(["c0", "c1", "c2"]);
          } finally {
            await f.close();
          }
        }
      },
    );

    it("allows reverting a case-only file rename commit on dryRun=true and dryRun=false", async () => {
      const before: Snapshot = { ...FINE, "notes.bean": "; notes\n" };
      const after: Snapshot = { ...FINE, "Notes.bean": "; notes\n" };
      const f = await fixture([before, after]);
      try {
        const preview = await f.call(surface, { sha: "c1", dryRun: true });
        expect(common(preview)).toMatchObject({
          ok: true,
          sha: "c1",
          files: expect.arrayContaining([
            { path: "notes.bean", change: "created" },
            { path: "Notes.bean", change: "deleted" },
          ]),
          commit: undefined,
        });
        expect(f.snapshot()).toEqual(after);

        const committed = await f.call(surface, { sha: "c1", dryRun: false });
        expect(common(committed)).toMatchObject({
          ok: true,
          sha: "c1",
          commit: "c2",
        });
        expect(f.snapshot()).toEqual(before);
      } finally {
        await f.close();
      }
    });

    it("allows reverting a case-only folder rename when emptied, and refuses when another file remains", async () => {
      const before: Snapshot = { ...FINE, "Reports/sub.bean": "; sub\n" };
      const renamed: Snapshot = { ...FINE, "reports/sub.bean": "; sub\n" };
      const withSibling: Snapshot = {
        ...renamed,
        "reports/other.bean": "; other\n",
      };

      const emptyDirFixture = await fixture([before, renamed]);
      try {
        const committed = await emptyDirFixture.call(surface, {
          sha: "c1",
          dryRun: false,
        });
        expect(common(committed)).toMatchObject({
          ok: true,
          sha: "c1",
          commit: "c2",
        });
        expect(emptyDirFixture.snapshot()).toEqual(before);
      } finally {
        await emptyDirFixture.close();
      }

      const survivingDirFixture = await fixture([before, renamed, withSibling]);
      try {
        const answer = await survivingDirFixture.call(surface, {
          sha: "c1",
          dryRun: true,
        });
        expect(answer.ok).toBe(false);
        expect(answer.code).toBe("CONFLICT");
        expect(answer.message).toContain(
          "Reports/sub.bean already exists as reports",
        );
        if (surface === "rest") {
          expect(answer.status).toBe(409);
        }
        expect(survivingDirFixture.snapshot()).toEqual(withSibling);
      } finally {
        await survivingDirFixture.close();
      }
    });

    it("refuses read-only credentials with FORBIDDEN before checking twins", async () => {
      const f = await fixture(
        [
          { ...FINE, "notes.bean": "; v1\n" },
          FINE,
          { ...FINE, "Notes.bean": "; v2\n" },
        ],
        reader,
      );
      try {
        const answer = await f.call(surface, { sha: "c1", dryRun: true });
        expect(answer.ok).toBe(false);
        expect(answer.code).toBe("FORBIDDEN");
        if (surface === "rest") {
          expect(answer.status).toBe(403);
        }
        expect(f.getUserApiClient).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  });

  // w31/150: a rename moves the ledger's bank mappings with the account, so
  // undoing it puts them back, or the next sync posts to an account that no
  // ledger file opens any more.
  describe("reverting a renameAccount commit (w31/150)", () => {
    const BANK: Snapshot = {
      "main.bean":
        'include "bank.bean"\n2026-01-01 open Assets:Bank:Checking USD\n2026-01-01 open Assets:Bank:Checking:Joint USD\n2026-01-01 open Expenses:Coffee USD\n',
      "bank.bean": "2026-02-01 balance Assets:Bank:Checking 0 USD\n",
    };
    const RENAMED: Snapshot = {
      "main.bean":
        'include "bank.bean"\n2026-01-01 open Assets:Bank:Main USD\n2026-01-01 open Assets:Bank:Main:Joint USD\n2026-01-01 open Expenses:Coffee USD\n',
      "bank.bean": "2026-02-01 balance Assets:Bank:Main 0 USD\n",
    };
    /** The caller's checking account, a member's joint one, and an unrelated card. */
    const MAPPINGS: LedgerBankMapping[] = [
      {
        id: "pa_own",
        plaidItemId: "pi_alice",
        ledgerAccount: "Assets:Bank:Checking",
        name: "Chase Checking ••1234",
      },
      {
        id: "pa_joint",
        plaidItemId: "pi_bob",
        ledgerAccount: "Assets:Bank:Checking:Joint",
        name: null,
      },
      {
        id: "pa_card",
        plaidItemId: "pi_alice",
        ledgerAccount: "Expenses:Coffee",
        name: "Chase Card ••9876",
      },
    ];
    const BEFORE = {
      pa_own: "Assets:Bank:Checking",
      pa_joint: "Assets:Bank:Checking:Joint",
      pa_card: "Expenses:Coffee",
    };
    const AFTER = {
      pa_own: "Assets:Bank:Main",
      pa_joint: "Assets:Bank:Main:Joint",
      pa_card: "Expenses:Coffee",
    };
    const movedBack = (updated: boolean) => [
      {
        plaidAccount: "Chase Checking ••1234",
        from: "Assets:Bank:Main",
        to: "Assets:Bank:Checking",
        updated,
      },
      {
        plaidAccount: null,
        from: "Assets:Bank:Main:Joint",
        to: "Assets:Bank:Checking:Joint",
        updated,
      },
    ];
    const SUBJECT = "Rename Assets:Bank:Checking to Assets:Bank:Main";

    it("previews the mappings it moves back, then moves them with the files", async () => {
      const bank = fakeBank(MAPPINGS);
      const f = await fixture([BANK], writer, bank);
      try {
        const renamed = await f.rename(
          "Assets:Bank:Checking",
          "Assets:Bank:Main",
        );
        expect(renamed.commit).toBe("c1");
        expect(bank.accounts()).toEqual(AFTER);

        const preview = await f.call(surface, { sha: "c1", dryRun: true });
        expect(common(preview)).toMatchObject({
          ok: true,
          subject: SUBJECT,
          files: [
            { path: "main.bean", change: "updated" },
            { path: "bank.bean", change: "updated" },
          ],
          bankMappings: movedBack(false),
          commit: undefined,
        });
        expect(bank.accounts()).toEqual(AFTER);
        expect(f.snapshot()).toEqual(RENAMED);

        const committed = await f.call(surface, { sha: "c1" });
        expect(common(committed)).toMatchObject({
          ok: true,
          subject: SUBJECT,
          bankMappings: movedBack(true),
          commit: "c2",
          validation: { newErrors: [], valid: true },
        });
        expect(f.snapshot()).toEqual(BANK);
        expect(bank.accounts()).toEqual(BEFORE);
      } finally {
        await f.close();
      }
    });

    it("renames them again when the revert itself is reverted", async () => {
      const bank = fakeBank(MAPPINGS);
      const f = await fixture([BANK], writer, bank);
      try {
        await f.rename("Assets:Bank:Checking", "Assets:Bank:Main");
        await f.call(surface, { sha: "c1" });
        expect(bank.accounts()).toEqual(BEFORE);

        const redone = await f.call(surface, { sha: "c2" });
        expect(common(redone)).toMatchObject({
          ok: true,
          subject: `Revert "${SUBJECT}"`,
          bankMappings: [
            {
              plaidAccount: "Chase Checking ••1234",
              from: "Assets:Bank:Checking",
              to: "Assets:Bank:Main",
              updated: true,
            },
            {
              plaidAccount: null,
              from: "Assets:Bank:Checking:Joint",
              to: "Assets:Bank:Main:Joint",
              updated: true,
            },
          ],
          commit: "c3",
        });
        expect(f.snapshot()).toEqual(RENAMED);
        expect(bank.accounts()).toEqual(AFTER);
      } finally {
        await f.close();
      }
    });

    it("keeps the revert and names each mapping it could not move back", async () => {
      const bank = fakeBank(MAPPINGS);
      const f = await fixture([BANK], writer, bank);
      try {
        await f.rename("Assets:Bank:Checking", "Assets:Bank:Main");
        bank.failing = true;
        const answer = await f.call(surface, { sha: "c1" });
        expect(common(answer)).toMatchObject({
          ok: true,
          bankMappings: movedBack(false),
          commit: "c2",
        });
        expect(f.snapshot()).toEqual(BANK);
        expect(bank.accounts()).toEqual(AFTER);
        if (surface === "mcp") {
          expect(answer.result?.summary).toContain(
            "; 2 bank mappings were not moved: map Assets:Bank:Main to Assets:Bank:Checking, Assets:Bank:Main:Joint to Assets:Bank:Checking:Joint with mapBankAccount",
          );
        }
      } finally {
        await f.close();
      }
    });

    it("moves no mapping for a commit whose message names a rename it did not make", async () => {
      const bank = fakeBank(
        MAPPINGS.map((mapping) =>
          mapping.id === "pa_own"
            ? { ...mapping, ledgerAccount: "Assets:Bank:Main" }
            : mapping,
        ),
      );
      const f = await fixture([BANK], writer, bank);
      try {
        // Opens a second account rather than renaming the first one.
        await f.push(SUBJECT, {
          "main.bean": `${BANK["main.bean"]}2026-01-01 open Assets:Bank:Main USD\n`,
        });
        for (const dryRun of [true, false]) {
          const answer = await f.call(surface, { sha: "c1", dryRun });
          expect(common(answer)).toMatchObject({
            ok: true,
            subject: SUBJECT,
            bankMappings: [],
          });
        }
        expect(f.snapshot()).toEqual(BANK);
        expect(bank.accounts().pa_own).toBe("Assets:Bank:Main");
      } finally {
        await f.close();
      }
    });
  });
});
