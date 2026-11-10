import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";
import { blobSha, createFakeLedger, type Snapshot } from "./fake-ledger";

/**
 * w23/m39 — a preview and its commit give the same verdict.
 *
 * `write-preview-matrix.test.ts` registers which tests prove each tool's
 * preview rule; it never runs a write twice and compares. That is how
 * `renameLedgerFile` previewed "No new bean-check errors" and then committed
 * with four (w1/236). This runs the same write on two identical ledgers, once
 * with `dry_run` and once to commit, and fails when the verdict, the files it
 * names or the refusal differ.
 *
 * The harness is in-process: the real MCP registry, the real `LedgerWorkflow`
 * and `LedgerRepoService`, and a fake ledger service that is a stateful file
 * map with a rule-based bean-check (a line reading `BAD` is an error in any
 * file the include graph from `main.bean` reaches). It covers the file tools
 * and the rename. It cannot cover what the real engine decides (balance
 * assertions, lot matching) or the entry tools, whose preview and commit
 * share one projection call and are proved by their own parity suites.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

async function fixture(history: Snapshot[], baselineFails = false) {
  const ledger = createFakeLedger(history);
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
      ledger.fava as never,
    ),
  );
  const ledgerData = {
    getErrors: jest.fn(async () => {
      // The ledger's current errors cannot be read (w23/233).
      if (baselineFails) throw new Error("ledger service unavailable");
      return ledger.errors();
    }),
  };
  const workflow = new LedgerWorkflow(
    ledger.fava as never,
    ledger.giteaClientFactory as never,
    {} as never,
    {} as never,
    // The workflow reads the ledger's errors around a rename or revert itself.
    ledgerData as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  const ledgerRepo = new LedgerRepoService(ledger.fava as never, authorization);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
      services: { ledgerData, ledgerRepo },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "preview-commit", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    snapshot: ledger.snapshot,
    call: (name: string, args: Record<string, unknown>) =>
      client.callTool({ name, arguments: args }),
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

/** What a caller reads off a write's answer, minus what must differ (the dry-run echo). */
function verdict(
  result: Awaited<ReturnType<Awaited<ReturnType<typeof fixture>>["call"]>>,
) {
  const content = result.structuredContent as {
    ok?: boolean;
    result?: {
      validation?: unknown;
      notLoaded?: string[];
      count?: number;
      updatedIncludes?: string[];
      files?: { path: string; change: string }[];
    };
    error?: { code?: string };
  };
  if (result.isError) return { refused: content.error?.code };
  return {
    validation: content.result?.validation,
    notLoaded: content.result?.notLoaded ?? [],
    count: content.result?.count,
    updatedIncludes: content.result?.updatedIncludes,
    files: content.result?.files,
  };
}

const MAIN = 'include "broken.bean"\n; BAD\n';
const BROKEN = "BAD\nBAD\nBAD\nBAD\n";

type Case = {
  name: string;
  /** The files, or the repository's commits oldest first: each a snapshot of every file. */
  initial: Snapshot | Snapshot[];
  tool: string;
  args: Record<string, unknown>;
  /** The files the commit leaves behind, to prove it wrote and the preview did not. */
  after?: Record<string, string>;
  /** The ledger's current errors cannot be read, so new cannot be told from existing. */
  baselineFails?: true;
};

const CASES: Case[] = [
  {
    // w23/233: the gate read an unreadable baseline as "no errors", so every
    // error the ledger already had read as new: the preview said invalid with
    // errors it did not add, and the commit refused a write that added none.
    name: "updating a file that keeps its errors, with no baseline to read",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "updateLedgerFiles",
    args: {
      description: "keep",
      files: [
        { path: "broken.bean", content: "BAD\nBAD\n", sha: blobSha(BROKEN) },
      ],
    },
    after: { "main.bean": MAIN, "broken.bean": "BAD\nBAD\n" },
    baselineFails: true,
  },
  {
    name: "creating a file, with no baseline to read",
    initial: { "main.bean": 'include "extra/*.bean"\n; BAD\n' },
    tool: "createLedgerFiles",
    args: {
      description: "add",
      files: [{ path: "extra/new.bean", content: "; fine\n" }],
    },
    after: {
      "main.bean": 'include "extra/*.bean"\n; BAD\n',
      "extra/new.bean": "; fine\n",
    },
    baselineFails: true,
  },
  {
    // w1/236: every error in the moved file read as new on commit, and the
    // preview never looked.
    name: "renaming a file that carries errors adds none",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "renameLedgerFile",
    args: {
      oldPath: "broken.bean",
      newPath: "broken2.bean",
      updateIncludes: true,
    },
    after: {
      "main.bean": 'include "broken2.bean"\n; BAD\n',
      "broken2.bean": BROKEN,
    },
  },
  {
    name: "renaming a clean file adds none",
    initial: { "main.bean": 'include "ok.bean"\n', "ok.bean": "; fine\n" },
    tool: "renameLedgerFile",
    args: { oldPath: "ok.bean", newPath: "ok2.bean", updateIncludes: true },
    after: { "main.bean": 'include "ok2.bean"\n', "ok2.bean": "; fine\n" },
  },
  {
    name: "creating a file a loaded glob includes adds an error",
    initial: { "main.bean": 'include "extra/*.bean"\n' },
    tool: "createLedgerFiles",
    args: {
      description: "add",
      allow_invalid: true,
      files: [{ path: "extra/new.bean", content: "BAD\n" }],
    },
    after: {
      "main.bean": 'include "extra/*.bean"\n',
      "extra/new.bean": "BAD\n",
    },
  },
  {
    // w1/227: the file counts nowhere, so the verdict names it.
    name: "creating a file nothing includes is reported as not loaded",
    initial: { "main.bean": "; empty\n" },
    tool: "createLedgerFiles",
    args: {
      description: "add",
      files: [{ path: "orphan.bean", content: "BAD\n" }],
    },
    after: { "main.bean": "; empty\n", "orphan.bean": "BAD\n" },
  },
  {
    name: "updating a loaded file to fix its errors adds none",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "updateLedgerFiles",
    args: {
      description: "fix",
      files: [
        { path: "broken.bean", content: "; fixed\n", sha: blobSha(BROKEN) },
      ],
    },
    after: { "main.bean": MAIN, "broken.bean": "; fixed\n" },
  },
  {
    name: "updating a loaded file to add an error is previewed as invalid",
    initial: { "main.bean": 'include "ok.bean"\n', "ok.bean": "; fine\n" },
    tool: "updateLedgerFiles",
    args: {
      description: "break",
      allow_invalid: true,
      files: [{ path: "ok.bean", content: "BAD\n", sha: blobSha("; fine\n") }],
    },
    after: { "main.bean": 'include "ok.bean"\n', "ok.bean": "BAD\n" },
  },
  {
    name: "deleting a loaded file with its include adds none",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "deleteLedgerFiles",
    args: {
      description: "drop",
      remove_includes: true,
      files: [{ path: "broken.bean", sha: blobSha(BROKEN) }],
    },
    after: { "main.bean": "; BAD\n" },
  },
  {
    name: "deleting an included file is refused the same way",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "deleteLedgerFiles",
    args: {
      description: "drop",
      files: [{ path: "broken.bean", sha: blobSha(BROKEN) }],
    },
  },
  {
    // w23/m42: undoing the commit that broke a file restores it.
    name: "reverting the commit that broke a file adds no errors",
    initial: [
      { "main.bean": 'include "ok.bean"\n', "ok.bean": "; fine\n" },
      { "main.bean": 'include "ok.bean"\n', "ok.bean": "BAD\n" },
    ],
    tool: "revertCommit",
    args: { sha: "c1" },
    after: { "main.bean": 'include "ok.bean"\n', "ok.bean": "; fine\n" },
  },
  {
    name: "reverting the commit that added a file deletes it",
    initial: [
      { "main.bean": "; empty\n" },
      { "main.bean": "; empty\n", "new.bean": "BAD\n" },
    ],
    tool: "revertCommit",
    args: { sha: "main" },
    after: { "main.bean": "; empty\n" },
  },
  {
    // A later commit built on the file: reverting would discard it.
    name: "reverting a commit a later commit built on is refused the same way",
    initial: [
      { "main.bean": 'include "ok.bean"\n', "ok.bean": "; fine\n" },
      { "main.bean": 'include "ok.bean"\n', "ok.bean": "BAD\n" },
      { "main.bean": 'include "ok.bean"\n', "ok.bean": "BAD\nBAD\n" },
    ],
    tool: "revertCommit",
    args: { sha: "c1" },
  },
];

const historyOf = (initial: Snapshot | Snapshot[]): Snapshot[] =>
  Array.isArray(initial) ? initial : [initial];

describe.each(CASES)("$tool: $name", (c) => {
  it("previews what it commits", async () => {
    const history = historyOf(c.initial);
    const preview = await fixture(history, c.baselineFails);
    const commit = await fixture(history, c.baselineFails);
    try {
      const previewed = await preview.call(c.tool, {
        ...c.args,
        dry_run: true,
      });
      const committed = await commit.call(c.tool, {
        ...c.args,
        dry_run: false,
      });

      expect(verdict(previewed)).toEqual(verdict(committed));
      // The same verdict says why nothing was checked, and refuses nothing on it.
      if (c.baselineFails) {
        expect(verdict(previewed)).toMatchObject({
          validation: { checked: false, valid: false, newErrors: [] },
        });
      }
      // A preview writes nothing; the commit writes what the case says.
      expect(preview.snapshot()).toEqual(history.at(-1));
      if (c.after) expect(commit.snapshot()).toEqual(c.after);
      else expect(commit.snapshot()).toEqual(history.at(-1));
    } finally {
      await preview.close();
      await commit.close();
    }
  });
});
