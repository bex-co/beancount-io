import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { posix } from "node:path";
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

type Files = Map<string, { content: string; sha: string }>;

const ERROR_MESSAGE = "Account Expenses:Nope was never opened";

/** What an `include` line names, resolved from the file that declares it. */
function includedBy(path: string, line: string): string | undefined {
  const target = /^include\s+"([^"]+)"/.exec(line)?.[1];
  return target && posix.normalize(posix.join(posix.dirname(path), target));
}

/** The files bean-check loads: `main.bean` and what its includes reach. */
function loadedFiles(files: ReadonlyMap<string, string>): string[] {
  const loaded: string[] = [];
  const visit = (path: string) => {
    if (loaded.includes(path) || !files.has(path)) return;
    loaded.push(path);
    for (const line of (files.get(path) ?? "").split("\n")) {
      const resolved = includedBy(path, line);
      if (!resolved) continue;
      if (resolved.includes("*")) {
        const pattern = new RegExp(
          `^${resolved.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`,
        );
        for (const candidate of files.keys()) {
          if (pattern.test(candidate)) visit(candidate);
        }
      } else {
        visit(resolved);
      }
    }
  };
  visit("main.bean");
  return loaded;
}

/** The ledger service's `errors`: a `BAD` line, or an include that names nothing. */
function errorsOf(files: ReadonlyMap<string, string>) {
  const errors: {
    message: string;
    source: { filename: string; lineno: number };
  }[] = [];
  for (const path of loadedFiles(files)) {
    (files.get(path) ?? "").split("\n").forEach((line, index) => {
      const source = { filename: path, lineno: index + 1 };
      if (line.includes("BAD")) errors.push({ message: ERROR_MESSAGE, source });
      const resolved = includedBy(path, line);
      if (resolved && !resolved.includes("*") && !files.has(resolved)) {
        errors.push({ message: `File "${resolved}" does not exist`, source });
      }
    });
  }
  return errors;
}

const decode = (content: string) =>
  Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");

async function fixture(initial: Record<string, string>) {
  const files: Files = new Map(
    Object.entries(initial).map(([path, content], index) => [
      path,
      { content, sha: `sha-${index}-${path}` },
    ]),
  );
  const plain = () =>
    new Map([...files].map(([path, file]) => [path, file.content]));
  const withOverlays = (
    overlays: { path: string; content: string | null }[],
  ) => {
    const projected = plain();
    for (const overlay of overlays) {
      if (overlay.content === null) projected.delete(overlay.path);
      else projected.set(overlay.path, decode(overlay.content));
    }
    return projected;
  };
  const envelope = (data: unknown) => ({ data: { success: true, data } });
  const toPublic = (path: string) => {
    const entry = files.get(path);
    if (!entry) return null;
    return {
      name: path.split("/").pop(),
      path,
      type: "file",
      sha: entry.sha,
      size: entry.content.length,
      content: entry.content,
      encoding: null,
    };
  };
  const change = jest.fn(
    async (
      _owner: string,
      _name: string,
      options: {
        files: {
          operation: string;
          path: string;
          content?: string | null;
        }[];
      },
    ) => {
      for (const op of options.files) {
        if (op.operation === "delete") files.delete(op.path);
        else
          files.set(op.path, {
            content: decode(op.content ?? ""),
            sha: `sha-new-${op.path}`,
          });
      }
      return envelope({});
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
        checkProjectedErrors: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope(errorsOf(withOverlays(body.files))),
        getProjectedSourceFiles: async (
          _o: string,
          _n: string,
          body: { files: { path: string; content: string | null }[] },
        ) => envelope(loadedFiles(withOverlays(body.files))),
      },
      ledgers: {
        changeLedgerFiles: change,
        getLedgerFile: async (_o: string, _n: string, q: { path: string }) =>
          envelope(toPublic(q.path)),
        getLedgerFilesContent: async (
          _o: string,
          _n: string,
          body: { files: string[] },
        ) => envelope(body.files.map(toPublic).filter(Boolean)),
        getLedgerDirContent: async (
          _o: string,
          _n: string,
          query?: { dir_path?: string | null },
        ) => {
          const prefix = query?.dir_path ? `${query.dir_path}/` : "";
          const seen = new Map<
            string,
            { type: string; path: string; name: string }
          >();
          for (const path of files.keys()) {
            if (!path.startsWith(prefix)) continue;
            const rest = path.slice(prefix.length);
            const slash = rest.indexOf("/");
            if (slash === -1) {
              seen.set(path, { type: "file", path, name: rest });
            } else {
              const sub = prefix + rest.slice(0, slash);
              seen.set(sub, {
                type: "dir",
                path: sub,
                name: rest.slice(0, slash),
              });
            }
          }
          return envelope([...seen.values()]);
        },
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
  const workflow = new LedgerWorkflow(
    fava as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config,
    authorization,
  );
  const ledgerRepo = new LedgerRepoService(fava as never, authorization);
  const ledgerData = { getErrors: jest.fn(async () => errorsOf(plain())) };
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
    snapshot: () => Object.fromEntries(plain()),
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
    };
    error?: { code?: string };
  };
  if (result.isError) return { refused: content.error?.code };
  return {
    validation: content.result?.validation,
    notLoaded: content.result?.notLoaded ?? [],
    count: content.result?.count,
    updatedIncludes: content.result?.updatedIncludes,
  };
}

const MAIN = 'include "broken.bean"\n; BAD\n';
const BROKEN = "BAD\nBAD\nBAD\nBAD\n";

type Case = {
  name: string;
  initial: Record<string, string>;
  tool: string;
  args: Record<string, unknown>;
  /** The files the commit leaves behind, to prove it wrote and the preview did not. */
  after?: Record<string, string>;
};

const CASES: Case[] = [
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
        { path: "broken.bean", content: "; fixed\n", sha: "sha-1-broken.bean" },
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
      files: [{ path: "ok.bean", content: "BAD\n", sha: "sha-1-ok.bean" }],
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
      files: [{ path: "broken.bean", sha: "sha-1-broken.bean" }],
    },
    after: { "main.bean": "; BAD\n" },
  },
  {
    name: "deleting an included file is refused the same way",
    initial: { "main.bean": MAIN, "broken.bean": BROKEN },
    tool: "deleteLedgerFiles",
    args: {
      description: "drop",
      files: [{ path: "broken.bean", sha: "sha-1-broken.bean" }],
    },
  },
];

describe.each(CASES)("$tool: $name", (c) => {
  it("previews what it commits", async () => {
    const preview = await fixture(c.initial);
    const commit = await fixture(c.initial);
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
      // A preview writes nothing; the commit writes what the case says.
      expect(preview.snapshot()).toEqual(c.initial);
      if (c.after) expect(commit.snapshot()).toEqual(c.after);
      else expect(commit.snapshot()).toEqual(c.initial);
    } finally {
      await preview.close();
      await commit.close();
    }
  });
});
