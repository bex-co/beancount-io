import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w5/035. The file-edit tools promise that a dry run gives "the same refusal as
 * the commit", and describes `create` as a new file. The preview nevertheless
 * approved a `create` over a file that already exists. Driven through the real
 * registry and repo service, with only the ledger client faked.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
// A Windows-1252 export: `E9` is "é" there and invalid UTF-8 (w23/030).
const LATIN1 = Buffer.concat([
  Buffer.from("; qa Caf"),
  Buffer.from([0xe9]),
  Buffer.from(" latin-1 comment\nqa-tail\n"),
]);
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_edit_preview",
};

async function fixture() {
  const existing = new Set([
    "main.bean",
    "accounts.bean",
    "extra.bean",
    "qa-latin1.txt",
    // A legacy name a new file could no longer take (w23/054).
    "aux.bean",
  ]);
  const getLedgerFilesContent = jest.fn(
    async (_owner: string, _name: string, { files }: { files: string[] }) => ({
      data: {
        success: true,
        data: files
          .filter((path) => existing.has(path))
          .map((path) =>
            path === "qa-latin1.txt"
              ? {
                  path,
                  name: path,
                  type: "file",
                  sha: "s1",
                  encoding: "base64",
                  content: LATIN1.toString("base64"),
                }
              : {
                  path,
                  name: path,
                  type: "file",
                  sha: "s1",
                  content: '2026-01-05 * "Cafe"\n2026-02-05 * "Cafe"\n',
                },
          ),
      },
    }),
  );
  const changeLedgerFiles = jest.fn();
  const checkProjectedErrors = jest.fn(async () => ({
    data: { success: true, data: [] },
  }));
  const authorization = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const services = {
    ledgerRepo: new LedgerRepoService(
      {
        getPublicApiClient: async () => ({
          ledgers: {
            getLedgerFilesContent,
            changeLedgerFiles,
            // The repository root, for the portable-name check (w21/770).
            getLedgerDirContent: async () => ({
              data: {
                success: true,
                data: [...existing].map((path) => ({
                  path,
                  name: path,
                  type: "file",
                })),
              },
            }),
          },
          reports: { checkProjectedErrors },
        }),
      } as never,
      authorization,
    ),
  };
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "edit-preview", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    changeLedgerFiles,
    checkProjectedErrors,
    getLedgerFilesContent,
    preview: (path: string) =>
      client.callTool({
        name: "createLedgerFiles",
        arguments: {
          ledger: "alice/main",
          description: "add a file",
          dry_run: true,
          files: [{ path, content: "; new\n" }],
        },
      }),
    client,
    update: (old_string: string) =>
      client.callTool({
        name: "updateLedgerFiles",
        arguments: {
          ledger: "alice/main",
          description: "rename a payee",
          dry_run: true,
          files: [{ path: "main.bean", old_string, new_string: "Bakery" }],
        },
      }),
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("previewing a create over an existing file", () => {
  it("is refused as a conflict that names the file and the way to overwrite it", async () => {
    const f = await fixture();
    try {
      const result = await f.preview("main.bean");
      expect(result.isError).toBe(true);
      const { error } = result.structuredContent as {
        error: { code: string; message: string; hint: string };
      };
      expect(error.code).toBe("CONFLICT");
      expect(error.message).toContain("main.bean already exists");
      expect(error.hint).toContain("replace");
      // The category's fallback hint is about entry editing; it must not win.
      expect(error.hint).not.toContain("getEntryContext");
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/**
 * w23/027. A preview never reaches Gitea, which refuses any `.git` component,
 * so it approved a create that the commit then failed as "malformed path
 * component".
 */
describe("previewing a create inside .git", () => {
  it.each([".git/qa-x.bean", "sub/.git/qa-x.bean", ".Git/qa-x.bean"])(
    "refuses %p as bad input, as the commit would",
    async (path) => {
      const f = await fixture();
      try {
        const result = await f.preview(path);
        expect(result.isError).toBe(true);
        const { error } = result.structuredContent as {
          error: { code: string; message: string };
        };
        expect(error.code).toBe("BAD_USER_INPUT");
        expect(error.message).toContain("inside .git");
        expect(f.getLedgerFilesContent).not.toHaveBeenCalled();
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w1/m38. Splitting `editLedgerFiles` into one tool per kind of change kept
 * the batch: every file a call names lands in the same commit, so a partial
 * write cannot leave the ledger half-restructured.
 */
describe("one call to a file tool", () => {
  const decode = (content?: string) =>
    content === undefined
      ? undefined
      : Buffer.from(content, "base64").toString();

  it.each([
    [
      "createLedgerFiles",
      [
        { path: "a.bean", content: "; a\n" },
        { path: "b.bean", content: "; b\n" },
      ],
      [
        { operation: "create", path: "a.bean", text: "; a\n" },
        { operation: "create", path: "b.bean", text: "; b\n" },
      ],
    ],
    [
      "updateLedgerFiles",
      [
        {
          path: "main.bean",
          old_string: '01-05 * "Cafe"',
          new_string: '01-05 * "Bakery"',
        },
        { path: "accounts.bean", content: "; replaced\n" },
      ],
      [
        {
          operation: "update",
          path: "main.bean",
          text: '2026-01-05 * "Bakery"\n2026-02-05 * "Cafe"\n',
        },
        { operation: "update", path: "accounts.bean", text: "; replaced\n" },
      ],
    ],
    [
      "deleteLedgerFiles",
      // Not main.bean: the entry point cannot be deleted (w23/031).
      [{ path: "extra.bean" }, { path: "accounts.bean" }],
      [
        { operation: "delete", path: "extra.bean", text: undefined },
        { operation: "delete", path: "accounts.bean", text: undefined },
      ],
    ],
  ])(
    "%s commits every file it names in one commit",
    async (name, files, expected) => {
      const f = await fixture();
      f.changeLedgerFiles.mockResolvedValue({
        data: { success: true, data: {} },
      });
      try {
        const result = await f.client.callTool({
          name,
          arguments: {
            ledger: "alice/main",
            description: "restructure",
            files,
          },
        });
        expect(result.isError).toBeFalsy();
        expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
        const [, , body] = f.changeLedgerFiles.mock.calls[0] as [
          string,
          string,
          {
            message: string;
            files: { operation: string; path: string; content?: string }[];
          },
        ];
        expect(body.message).toBe("restructure");
        expect(
          body.files.map(({ operation, path, content }) => ({
            operation,
            path,
            text: decode(content),
          })),
        ).toEqual(expected);
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w23/028. The preview chained edits to one file, but the commit built each
 * from the original text and sent one whole-file write per edit, so only the
 * last landed — under a success that named the file twice.
 */
describe("several changes to one file in one call", () => {
  type Committed = {
    files: {
      operation: string;
      path: string;
      content?: string;
      sha?: string;
    }[];
  };
  const edits = (
    f: Awaited<ReturnType<typeof fixture>>,
    name: string,
    files: Record<string, string>[],
    dry_run: boolean,
  ) =>
    f.client.callTool({
      name,
      arguments: { ledger: "alice/main", description: "edit", dry_run, files },
    });
  const outcome = (result: Awaited<ReturnType<typeof edits>>) =>
    result.structuredContent as {
      result?: {
        summary: string;
        count: number;
        diff: { path: string; diff: string }[];
      };
      error?: { code: string; message: string };
    };

  it("commits every old_string edit to the file, as the preview showed", async () => {
    const f = await fixture();
    f.changeLedgerFiles.mockResolvedValue({
      data: { success: true, data: {} },
    });
    const files = [
      {
        path: "main.bean",
        old_string: '01-05 * "Cafe"',
        new_string: '01-05 * "Bakery"',
      },
      // Matches only the text the first edit produced.
      { path: "main.bean", old_string: '"Bakery"', new_string: '"Bakery Two"' },
      {
        path: "main.bean",
        old_string: '02-05 * "Cafe"',
        new_string: '02-05 * "Diner"',
      },
    ];
    const final = '2026-01-05 * "Bakery Two"\n2026-02-05 * "Diner"\n';
    try {
      const preview = outcome(await edits(f, "updateLedgerFiles", files, true));
      expect(preview.error).toBeUndefined();
      expect(preview.result!.count).toBe(1);
      expect(preview.result!.diff).toHaveLength(1);
      expect(preview.result!.diff[0]!.diff).toContain(
        '+2026-01-05 * "Bakery Two"',
      );
      expect(preview.result!.diff[0]!.diff).toContain('+2026-02-05 * "Diner"');
      // bean-check ran over the text the commit will write.
      expect(f.checkProjectedErrors).toHaveBeenCalledWith("alice", "main", {
        files: [
          { path: "main.bean", content: Buffer.from(final).toString("base64") },
        ],
      });

      const commit = outcome(await edits(f, "updateLedgerFiles", files, false));
      expect(commit.error).toBeUndefined();
      expect(commit.result!.summary).toMatch(
        /^Committed 1 change\(s\) to main\.bean\./,
      );
      const [, , body] = f.changeLedgerFiles.mock.calls[0] as [
        string,
        string,
        Committed,
      ];
      expect(body.files).toHaveLength(1);
      expect(body.files[0]).toMatchObject({
        operation: "update",
        path: "main.bean",
        sha: "s1",
      });
      expect(Buffer.from(body.files[0]!.content!, "base64").toString()).toBe(
        final,
      );
    } finally {
      await f.close();
    }
  });

  it("refuses alike in the preview and the commit an edit that an earlier one made ambiguous", async () => {
    const f = await fixture();
    // The first edit gives `01-05` a second occurrence.
    const files = [
      {
        path: "main.bean",
        old_string: '02-05 * "Cafe"',
        new_string: '01-05 * "Cafe"',
      },
      { path: "main.bean", old_string: "01-05", new_string: "01-06" },
    ];
    try {
      for (const dryRun of [true, false]) {
        expect(
          outcome(await edits(f, "updateLedgerFiles", files, dryRun)).error,
        ).toMatchObject({
          code: "BAD_USER_INPUT",
          message: expect.stringContaining(
            "main.bean: old_string matches 2 times",
          ),
        });
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each([
    [
      "createLedgerFiles",
      [
        { path: "new.bean", content: "; a\n" },
        { path: "new.bean", content: "; b\n" },
      ],
      "created twice",
    ],
    [
      "deleteLedgerFiles",
      [{ path: "accounts.bean" }, { path: "accounts.bean" }],
      "deleted twice",
    ],
  ])(
    "%s refuses one path named twice before any request",
    async (name, files, problem) => {
      const f = await fixture();
      try {
        for (const dryRun of [true, false]) {
          expect(
            outcome(await edits(f, name, files, dryRun)).error,
          ).toMatchObject({
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(problem),
          });
        }
        expect(f.getLedgerFilesContent).not.toHaveBeenCalled();
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w23/030. The file cache decoded leniently, so an `old_string` edit to a
 * Latin-1 file committed U+FFFD over every byte it never touched.
 */
describe("editing a file that is not valid UTF-8", () => {
  const call = (
    f: Awaited<ReturnType<typeof fixture>>,
    name: string,
    file: Record<string, string>,
    dry_run = false,
  ) =>
    f.client.callTool({
      name,
      arguments: {
        ledger: "alice/main",
        description: "edit",
        dry_run,
        files: [{ path: "qa-latin1.txt", ...file }],
      },
    });

  it("refuses an old_string edit in the preview and the commit", async () => {
    const f = await fixture();
    try {
      for (const dryRun of [true, false]) {
        const result = await call(
          f,
          "updateLedgerFiles",
          { old_string: "qa-tail", new_string: "qa-tail2" },
          dryRun,
        );
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining(
              "qa-latin1.txt is not valid UTF-8",
            ),
          },
        });
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each([
    ["updateLedgerFiles", { content: "; now utf-8\n" }, "update"],
    ["deleteLedgerFiles", {}, "delete"],
  ])(
    "still lets %s write the file without reading its text",
    async (name, file, operation) => {
      const f = await fixture();
      f.changeLedgerFiles.mockResolvedValue({
        data: { success: true, data: {} },
      });
      try {
        expect((await call(f, name, file)).isError).toBeFalsy();
        const [, , body] = f.changeLedgerFiles.mock.calls[0] as [
          string,
          string,
          { files: { operation: string; path: string }[] },
        ];
        expect(body.files).toEqual([
          expect.objectContaining({ operation, path: "qa-latin1.txt" }),
        ]);
      } finally {
        await f.close();
      }
    },
  );
});

/**
 * w23/039. A whole-file rewrite or a delete carried the sha the tool fetched
 * just before committing, so it overwrote whatever another writer committed
 * after the agent read the file. The caller's sha now names its base.
 */
describe("a whole-file write or delete with the sha the caller read", () => {
  const write = (
    f: Awaited<ReturnType<typeof fixture>>,
    name: string,
    file: Record<string, string>,
    dry_run = false,
  ) =>
    f.client.callTool({
      name,
      arguments: {
        ledger: "alice/main",
        description: "rewrite",
        dry_run,
        files: [{ path: "main.bean", ...file }],
      },
    });

  it.each([
    ["updateLedgerFiles", { content: "; rewritten\n" }],
    ["deleteLedgerFiles", {}],
  ])("%s refuses a sha the file has moved past", async (name, file) => {
    const f = await fixture();
    try {
      for (const dryRun of [true, false]) {
        const result = await write(f, name, { ...file, sha: "old" }, dryRun);
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: {
            code: "CONFLICT",
            message: expect.stringContaining(
              "main.bean changed since you read it",
            ),
          },
        });
      }
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it.each([
    ["the current sha", { sha: "s1" }],
    ["no sha", {}],
  ])("commits a content rewrite with %s", async (_case, base) => {
    const f = await fixture();
    f.changeLedgerFiles.mockResolvedValue({
      data: { success: true, data: {} },
    });
    try {
      const result = await write(f, "updateLedgerFiles", {
        content: "; rewritten\n",
        ...base,
      });
      expect(result.isError).toBeFalsy();
      const [, , body] = f.changeLedgerFiles.mock.calls[0] as [
        string,
        string,
        { files: { operation: string; sha?: string }[] },
      ];
      expect(body.files).toEqual([
        expect.objectContaining({ operation: "update", sha: "s1" }),
      ]);
    } finally {
      await f.close();
    }
  });
});

/**
 * w23/051. `String.replace` reads `$$`, `$&`, `` $` ``, `$'` and `$1` in its
 * replacement as patterns, so the commit wrote the matched text and its
 * surroundings where the preview showed the literal `new_string`. The fix
 * shipped with w23/028's single fold; this pins it.
 */
describe("a new_string holding replacement patterns", () => {
  it("commits the literal text the preview showed", async () => {
    const f = await fixture();
    f.changeLedgerFiles.mockResolvedValue({
      data: { success: true, data: {} },
    });
    const new_string = '02-05 * "price $$5 and $& and $` and $\' and $1 end"';
    const files = [
      { path: "main.bean", old_string: '02-05 * "Cafe"', new_string },
    ];
    const expected = `2026-01-05 * "Cafe"\n2026-${new_string}\n`;
    try {
      const preview = await f.client.callTool({
        name: "updateLedgerFiles",
        arguments: {
          ledger: "alice/main",
          description: "edit",
          dry_run: true,
          files,
        },
      });
      expect(f.checkProjectedErrors).toHaveBeenCalledWith("alice", "main", {
        files: [
          {
            path: "main.bean",
            content: Buffer.from(expected).toString("base64"),
          },
        ],
      });
      expect(
        (preview.structuredContent as { result: { diff: { diff: string }[] } })
          .result.diff[0]!.diff,
      ).toContain(`+2026-${new_string}`);
      await f.client.callTool({
        name: "updateLedgerFiles",
        arguments: { ledger: "alice/main", description: "edit", files },
      });
      const [, , body] = f.changeLedgerFiles.mock.calls[0] as [
        string,
        string,
        { files: { content: string }[] },
      ];
      expect(Buffer.from(body.files[0]!.content, "base64").toString()).toBe(
        expected,
      );
    } finally {
      await f.close();
    }
  });
});

/** w23/052: small gaps in what updateLedgerFiles accepts and reports. */
describe("updateLedgerFiles edge cases", () => {
  const update = (
    f: Awaited<ReturnType<typeof fixture>>,
    file: Record<string, unknown>,
    dry_run = false,
  ) =>
    f.client.callTool({
      name: "updateLedgerFiles",
      arguments: {
        ledger: "alice/main",
        description: "edit",
        dry_run,
        files: [{ path: "main.bean", ...file }],
      },
    });

  it.each([false, true])(
    "commits nothing when old_string and new_string match (dry run %p)",
    async (dryRun) => {
      const f = await fixture();
      try {
        const result = await update(
          f,
          { old_string: '01-05 * "Cafe"', new_string: '01-05 * "Cafe"' },
          dryRun,
        );
        expect(result.isError).toBeFalsy();
        expect(
          (result.structuredContent as { result: unknown }).result,
        ).toMatchObject({
          summary: "No changes — nothing committed",
          count: 0,
          operations: [],
          diff: [],
        });
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    [
      { old_string: "", new_string: "x" },
      "files.0.old_string: old_string must not be empty",
    ],
    [
      { old_string: '01-05 * "Cafe"', new_string: "x", replace_all: true },
      'files.0: Unrecognized key: "replace_all"',
    ],
  ])("refuses %j naming the problem", async (file, message) => {
    const f = await fixture();
    try {
      const result = await update(f, file);
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: { code: "BAD_USER_INPUT", message },
      });
      expect(f.getLedgerFilesContent).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/** w23/054: a new file's name has to work on every checkout. */
describe("creating a file whose name a checkout cannot hold", () => {
  it.each(["qa\nx.bean", "aux.bean", "a:b.bean", "qa\u202ex.bean"])(
    "refuses %j in the preview and the commit",
    async (path) => {
      const f = await fixture();
      try {
        for (const dryRun of [true, false]) {
          const result = await f.client.callTool({
            name: "createLedgerFiles",
            arguments: {
              ledger: "alice/main",
              description: "add",
              dry_run: dryRun,
              files: [{ path, content: "; x\n" }],
            },
          });
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: "BAD_USER_INPUT" },
          });
        }
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("still deletes an existing file with such a name", async () => {
    const f = await fixture();
    f.changeLedgerFiles.mockResolvedValue({
      data: { success: true, data: {} },
    });
    try {
      const result = await f.client.callTool({
        name: "deleteLedgerFiles",
        arguments: {
          ledger: "alice/main",
          description: "tidy",
          files: [{ path: "aux.bean" }],
        },
      });
      expect(result.isError).toBeFalsy();
      expect(f.changeLedgerFiles).toHaveBeenCalledTimes(1);
    } finally {
      await f.close();
    }
  });
});

/** w5/036: an ambiguous `old_string` is the caller's to fix, in production too. */
describe("an old_string that matches more than once", () => {
  it("is refused as bad input with the count and a way forward", async () => {
    const f = await fixture();
    try {
      const result = await f.update("Cafe");
      expect(result.isError).toBe(true);
      const { error } = result.structuredContent as {
        error: { code: string; message: string; hint: string };
      };
      expect(error.code).toBe("BAD_USER_INPUT");
      expect(error.message).toContain("matches 2 times");
      expect(error.hint).not.toMatch(/retry/i);
      expect(f.changeLedgerFiles).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

/**
 * w5/039. A plain Zod object strips keys it does not name, so a misspelt
 * `dry_run` was dropped, the default of false applied, and the call committed
 * what the caller meant to preview. The `tools/call` boundary now refuses an
 * argument the tool does not declare, on every tool.
 */
describe("an argument the tool does not declare", () => {
  it.each(["dryrun", "dryRun", "bogus"])(
    "refuses %s on createLedgerFiles instead of committing",
    async (typo) => {
      const f = await fixture();
      try {
        const result = await f.client.callTool({
          name: "createLedgerFiles",
          arguments: {
            ledger: "alice/main",
            description: "add a file",
            [typo]: true,
            files: [{ path: "new.bean", content: "x\n" }],
          },
        });
        expect(result.isError).toBe(true);
        const { error } = result.structuredContent as {
          error: { code: string; message: string };
        };
        expect(error.code).toBe("BAD_USER_INPUT");
        expect(error.message).toContain(typo);
        expect(f.changeLedgerFiles).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it.each([
    ["readLedgerFiles", { files: [{ path: "main.bean" }] }],
    ["listLedgerFiles", {}],
    ["refreshBankConnection", { item_id: "pitm_1" }],
    ["syncBankTransactions", { item_id: "pitm_1" }],
  ])(
    "refuses an unknown argument on %s before the tool runs",
    async (name, args) => {
      const f = await fixture();
      try {
        const result = await f.client.callTool({
          name,
          arguments: { ledger: "alice/main", ...args, bogus: 1 },
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          error: {
            code: "BAD_USER_INPUT",
            message: expect.stringContaining("bogus"),
          },
        });
        expect(f.getLedgerFilesContent).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});
