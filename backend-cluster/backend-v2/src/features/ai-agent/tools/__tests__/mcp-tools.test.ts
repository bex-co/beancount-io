import { executeBqlQuery } from "../bql-query-tool";
import { executeListLedgerFiles } from "../list-ledger-files-tool";
import {
  executeReadLedgerFiles,
  readLedgerFilesInputSchema,
} from "../read-ledger-files-tool";
import { executeEditLedgerFiles } from "../edit-ledger-files-tool";
import { MCP_TOOLS } from "../../api/mcp-tools";
import { VERB_TABLE } from "@/server/api/op-class";
import type { Identity } from "@/server/api/identity";
import { ConflictError } from "@/shared/errors";

/**
 * Direct coverage of the four ADR-0006 tool executors' own logic (line
 * slicing, base64 encoding, error propagation) — the ledger services they
 * call are faked here; the services' own authorization behavior has its own
 * suites (authorize-ledger.test.ts, ledger-repo-service.test.ts).
 */

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const LEDGER_ID = "alice/personal";

describe("executeBqlQuery", () => {
  it("returns the shell service's text on success", async () => {
    const ledgerShell = {
      queryShellText: jest
        .fn()
        .mockResolvedValue({ text: "Assets:Cash  100 USD" }),
    };
    const result = await executeBqlQuery(
      {
        services: { ledgerShell } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { query: "BALANCES" },
    );
    expect(result).toEqual({ ok: true, result: "Assets:Cash  100 USD" });
    expect(ledgerShell.queryShellText).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      query: "BALANCES",
    });
  });

  it("wraps a service rejection as ok:false rather than throwing", async () => {
    const ledgerShell = {
      queryShellText: jest.fn().mockRejectedValue(new Error("forbidden")),
    };
    const result = await executeBqlQuery(
      {
        services: { ledgerShell } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { query: "BALANCES" },
    );
    expect(result.ok).toBe(false);
  });
});

describe("executeListLedgerFiles", () => {
  it("returns the listing's name, size, sha and last commit with each entry", async () => {
    const ledgerRepo = {
      listDirContent: jest.fn().mockResolvedValue([
        {
          path: "main.bean",
          name: "main.bean",
          type: "file",
          size: 12,
          sha: "abc",
          lastCommitSha: "c1",
        },
        {
          path: "sub",
          name: "sub",
          type: "dir",
          size: 0,
          sha: "def",
          lastCommitSha: null,
        },
      ]),
    };
    const result = await executeListLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {},
    );
    expect(result).toEqual({
      ok: true,
      result: [
        {
          path: "main.bean",
          name: "main.bean",
          type: "file",
          size: 12,
          sha: "abc",
          lastCommitSha: "c1",
        },
        {
          path: "sub",
          name: "sub",
          type: "dir",
          size: 0,
          sha: "def",
          lastCommitSha: null,
        },
      ],
    });
  });

  it("passes dir_path through to the service", async () => {
    const ledgerRepo = { listDirContent: jest.fn().mockResolvedValue([]) };
    await executeListLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { dir_path: "subdir" },
    );
    expect(ledgerRepo.listDirContent).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      dirPath: "subdir",
    });
  });

  it("treats a shell-style dot as the repository root", async () => {
    const ledgerRepo = { listDirContent: jest.fn().mockResolvedValue([]) };
    await executeListLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { dir_path: "." },
    );
    expect(ledgerRepo.listDirContent).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      dirPath: undefined,
    });
  });
});

describe("executeReadLedgerFiles", () => {
  function serviceReturning(content: string) {
    return {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "main.bean", content, sha: "sha1" }]),
    };
  }

  it("returns the full file when no line range is given", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean" }] },
    );
    expect(result).toEqual({
      ok: true,
      result: [
        {
          path: "main.bean",
          startLine: 1,
          endLine: 3,
          totalLines: 3,
          sha: "sha1",
          content: "line1\nline2\nline3",
        },
      ],
    });
  });

  it("refuses a reversed line range before reading anything", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", start_line: 10, end_line: 9 }] },
    );
    expect(result).toMatchObject({
      ok: false,
      errorCode: "BAD_USER_INPUT",
      error: expect.stringContaining("start_line 10 is after end_line 9"),
    });
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
  });

  it("refuses a start past the end of the file, naming its length", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", start_line: 4 }] },
    );
    expect(result).toMatchObject({
      ok: false,
      errorCode: "BAD_USER_INPUT",
      error: expect.stringContaining("past the end of the file (3 lines)"),
    });
  });

  it("clamps an end_line past the end instead of refusing it", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", start_line: 3, end_line: 500 }] },
    );
    expect(result).toEqual({
      ok: true,
      result: [
        {
          path: "main.bean",
          startLine: 3,
          endLine: 3,
          totalLines: 3,
          sha: "sha1",
          content: "line3",
        },
      ],
    });
  });

  it("slices to the requested 1-based, inclusive line range", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3\nline4");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", start_line: 2, end_line: 3 }] },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result[0]).toMatchObject({
        startLine: 2,
        endLine: 3,
        content: "line2\nline3",
        totalLines: 4,
      });
    }
  });

  // w23/141: the result echoes startLine/endLine, so pasting the echo back
  // as input must work — the camelCase twins fold into the snake_case
  // canonicals, and a split pair is refused rather than guessed.
  it("advertises the echoed startLine/endLine spellings as input", () => {
    expect(() =>
      readLedgerFilesInputSchema.parse({
        files: [{ path: "main.bean", startLine: 2, endLine: 3 }],
      }),
    ).not.toThrow();
  });

  it("slices identically when the range arrives in the echoed spelling", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3\nline4");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", startLine: 2, endLine: 3 }] },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result[0]).toMatchObject({
        startLine: 2,
        endLine: 3,
        content: "line2\nline3",
        totalLines: 4,
      });
    }
  });

  it("accepts identical twins and refuses a split pair before reading", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3\nline4");
    const ctx = {
      services: { ledgerRepo } as any,
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
    };
    const same = await executeReadLedgerFiles(ctx, {
      files: [{ path: "main.bean", start_line: 2, startLine: 2, end_line: 3 }],
    });
    expect(same.ok).toBe(true);

    const split = await executeReadLedgerFiles(ctx, {
      files: [{ path: "main.bean", start_line: 2, startLine: 4 }],
    });
    expect(split).toMatchObject({
      ok: false,
      errorCode: "BAD_USER_INPUT",
      error: expect.stringContaining(
        "main.bean: pass start_line or startLine, not two different start lines.",
      ),
    });
    expect(ledgerRepo.getFilesContent).toHaveBeenCalledTimes(1);
  });

  it("refuses a reversed range across mixed spellings", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean", startLine: 10, end_line: 9 }] },
    );
    expect(result).toMatchObject({
      ok: false,
      errorCode: "BAD_USER_INPUT",
      error: expect.stringContaining("start_line 10 is after end_line 9"),
    });
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
  });

  // w23/005: a trailing newline ends the last line; it is not a line of its
  // own. The count matches `wc -l`, and a full read is still byte-identical.
  describe("a file that ends in a newline", () => {
    const TERMINATED = "line1\nline2\nline3\n";
    const read = (file: {
      path: string;
      start_line?: number;
      end_line?: number;
    }) =>
      executeReadLedgerFiles(
        {
          services: { ledgerRepo: serviceReturning(TERMINATED) } as any,
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
        },
        { files: [file] },
      );

    it("counts the lines wc -l counts and returns the bytes unchanged", async () => {
      expect(await read({ path: "main.bean" })).toEqual({
        ok: true,
        result: [
          {
            path: "main.bean",
            startLine: 1,
            endLine: 3,
            totalLines: 3,
            sha: "sha1",
            content: TERMINATED,
          },
        ],
      });
    });

    it("refuses a start on the phantom line after the final newline", async () => {
      expect(await read({ path: "main.bean", start_line: 4 })).toMatchObject({
        ok: false,
        errorCode: "BAD_USER_INPUT",
        error: expect.stringContaining("past the end of the file (3 lines)"),
      });
    });

    it("keeps the terminator only on a slice that reaches the end", async () => {
      const middle = await read({
        path: "main.bean",
        start_line: 2,
        end_line: 2,
      });
      const tail = await read({
        path: "main.bean",
        start_line: 2,
        end_line: 99,
      });
      expect(middle.ok && middle.result[0]).toMatchObject({
        startLine: 2,
        endLine: 2,
        content: "line2",
      });
      expect(tail.ok && tail.result[0]).toMatchObject({
        startLine: 2,
        endLine: 3,
        totalLines: 3,
        content: "line2\nline3\n",
      });
    });
  });

  it("fails the whole call when a requested path is missing from the response", async () => {
    const ledgerRepo = { getFilesContent: jest.fn().mockResolvedValue([]) };
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "missing.bean" }] },
    );
    expect(result.ok).toBe(false);
  });

  it("de-duplicates requested paths when calling the service", async () => {
    const ledgerRepo = serviceReturning("x");
    await executeReadLedgerFiles(
      {
        services: {
          ledgerRepo: { getFilesContent: ledgerRepo.getFilesContent },
        } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "main.bean" }, { path: "main.bean" }] },
    );
    expect(ledgerRepo.getFilesContent).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      paths: ["main.bean", "main.bean"],
    });
  });

  it("canonicalizes a shell-style relative path before reading", async () => {
    const ledgerRepo = serviceReturning("content");
    const result = await executeReadLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      { files: [{ path: "./main.bean" }] },
    );
    expect(ledgerRepo.getFilesContent).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      paths: ["main.bean"],
    });
    expect(result).toEqual({
      ok: true,
      result: [
        {
          path: "main.bean",
          startLine: 1,
          endLine: 1,
          totalLines: 1,
          sha: "sha1",
          content: "content",
        },
      ],
    });
  });
});

describe("executeEditLedgerFiles", () => {
  // w23/017: two agents editing one file at once. The loser used to report
  // SERVICE_UNAVAILABLE; its exact-text edit now lands on the winner's text.
  describe("after losing a concurrent commit", () => {
    function racingRepo(winner: (text: string) => string) {
      let remote = "; a\n; b\n";
      let commits = 0;
      const ledgerRepo = {
        getFilesContent: jest.fn(async () => [
          { path: "race.bean", content: remote, sha: `sha-${remote}` },
        ]),
        changeFiles: jest.fn(
          async ({
            operations,
          }: {
            operations: Array<{ content?: string }>;
          }) => {
            commits += 1;
            if (commits === 1) {
              remote = winner(remote);
              throw new ConflictError(
                "Ledger resource",
                "the ledger changed under a concurrent write; re-read it and retry",
              );
            }
            remote = operations[0]!.content!;
          },
        ),
      };
      const services = {
        ledgerRepo,
        ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
      };
      return { services, ledgerRepo, remote: () => remote };
    }
    const edit = (services: unknown, file: Record<string, unknown>) =>
      executeEditLedgerFiles(
        { services: services as any, identity: IDENTITY, ledgerId: LEDGER_ID },
        { description: "edit", files: [file as any], dry_run: false },
      );

    it("re-reads and re-applies an exact-text edit", async () => {
      const repo = racingRepo((text) => text.replace("; a\n", "; 0\n"));
      const result = await edit(repo.services, {
        operation: "update",
        path: "race.bean",
        old_string: "; b\n",
        new_string: "; 1\n",
      });
      expect(result.ok).toBe(true);
      expect(repo.ledgerRepo.changeFiles).toHaveBeenCalledTimes(2);
      expect(repo.remote()).toBe("; 0\n; 1\n");
    });

    it("reports the edit's own text as gone when the winner removed it", async () => {
      const repo = racingRepo((text) => text.replace("; b\n", "; B\n"));
      const result = await edit(repo.services, {
        operation: "update",
        path: "race.bean",
        old_string: "; b\n",
        new_string: "; 1\n",
      });
      expect(result).toMatchObject({ ok: false, errorCode: "BAD_USER_INPUT" });
      expect(repo.remote()).toBe("; a\n; B\n");
    });

    it("does not re-apply a whole-file replace over the winner's change", async () => {
      const repo = racingRepo((text) => text.replace("; a\n", "; 0\n"));
      const result = await edit(repo.services, {
        operation: "replace",
        path: "race.bean",
        content: "; z\n",
      });
      expect(result).toMatchObject({ ok: false, errorCode: "CONFLICT" });
      expect(repo.ledgerRepo.changeFiles).toHaveBeenCalledTimes(1);
      expect(repo.remote()).toBe("; 0\n; b\n");
    });

    // w23/147: a stale file sha refuses with a file-sha hint, not the
    // entry-hash fallback — an entry hash cannot satisfy a file check.
    it("hints the file re-read on a stale sha", async () => {
      const ledgerRepo = {
        getFilesContent: jest.fn(async () => [
          { path: "main.bean", content: "; a\n", sha: "sha-new" },
        ]),
        changeFiles: jest.fn(),
      };
      const result = await edit(
        {
          ledgerRepo,
          ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
        },
        {
          operation: "replace",
          path: "main.bean",
          content: "; z\n",
          sha: "sha-stale",
        },
      );
      expect(result).toMatchObject({
        ok: false,
        errorCode: "CONFLICT",
        errorHint: expect.stringContaining("`readLedgerFiles`"),
      });
      expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
    });

    it("gives the conflict back after three lost commits", async () => {
      const ledgerRepo = {
        getFilesContent: jest.fn(async () => [
          { path: "race.bean", content: "; a\n", sha: "sha" },
        ]),
        changeFiles: jest.fn(async () => {
          throw new ConflictError("Ledger resource", "concurrent write");
        }),
      };
      const result = await edit(
        {
          ledgerRepo,
          ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
        },
        {
          operation: "update",
          path: "race.bean",
          old_string: "; a\n",
          new_string: "; 1\n",
        },
      );
      expect(result).toMatchObject({ ok: false, errorCode: "CONFLICT" });
      expect(ledgerRepo.changeFiles).toHaveBeenCalledTimes(3);
    });
  });

  // w23/028: the in-product agent's combined tool can mix kinds of change to
  // one path; each path still reaches the commit as a single operation.
  describe("several changes to one path", () => {
    const run = (existing: Record<string, string>, files: unknown[]) => {
      const ledgerRepo = {
        getFilesContent: jest.fn(async ({ paths }: { paths: string[] }) =>
          paths
            .filter((path) => path in existing)
            .map((path) => ({
              path,
              content: existing[path]!,
              sha: `sha-${path}`,
            })),
        ),
        changeFiles: jest.fn().mockResolvedValue(undefined),
      };
      const result = executeEditLedgerFiles(
        {
          services: { ledgerRepo } as any,
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
        },
        { description: "edit", files: files as any, dry_run: false },
      );
      return { ledgerRepo, result };
    };
    const committed = (ledgerRepo: { changeFiles: jest.Mock }) =>
      ledgerRepo.changeFiles.mock.calls[0]![0].operations;

    it("creates a new file with the edits that follow its creation", async () => {
      const { ledgerRepo, result } = run({}, [
        { operation: "create", path: "new.bean", content: "; a\n; b\n" },
        {
          operation: "update",
          path: "new.bean",
          old_string: "; b",
          new_string: "; c",
        },
      ]);
      expect(await result).toMatchObject({ ok: true, result: { count: 1 } });
      expect(committed(ledgerRepo)).toEqual([
        { operation: "create", path: "new.bean", content: "; a\n; c\n" },
      ]);
    });

    it("overwrites an existing file that is deleted and created again", async () => {
      const { ledgerRepo, result } = run({ "main.bean": "; old\n" }, [
        { operation: "delete", path: "main.bean" },
        { operation: "create", path: "main.bean", content: "; new\n" },
      ]);
      expect(await result).toMatchObject({ ok: true });
      expect(committed(ledgerRepo)).toEqual([
        {
          operation: "update",
          path: "main.bean",
          content: "; new\n",
          sha: "sha-main.bean",
        },
      ]);
    });

    it.each([
      [
        [
          { operation: "delete", path: "main.bean" },
          {
            operation: "update",
            path: "main.bean",
            old_string: "a",
            new_string: "b",
          },
        ],
        "changed after it is deleted",
      ],
      [
        [
          { operation: "create", path: "n.bean", content: "x" },
          { operation: "delete", path: "n.bean" },
        ],
        "created and deleted",
      ],
    ])(
      "refuses a sequence that cannot fold, before any request",
      async (files, problem) => {
        const { ledgerRepo, result } = run({ "main.bean": "a" }, files);
        expect(await result).toMatchObject({
          ok: false,
          errorCode: "BAD_USER_INPUT",
          error: expect.stringContaining(problem),
        });
        expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
        expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
      },
    );
  });

  it("create: base64-encodes content and never fetches existing content", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn(),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    const ledgerData = { getErrors: jest.fn().mockResolvedValue([]) };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "add new file",
        files: [{ operation: "create", path: "new.bean", content: "hello" }],
        dry_run: false,
      },
    );
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      operations: [
        {
          operation: "create",
          path: "new.bean",
          content: "hello",
        },
      ],
      message: "add new file",
    });
    expect(result).toEqual({
      ok: true,
      result: {
        summary: "Committed 1 change(s) to new.bean. No new bean-check errors.",
        dry_run: false,
        count: 1,
        operations: [{ operation: "create", path: "new.bean" }],
        diff: [],
        wrote: [{ path: "new.bean" }],
        entryHashes: [],
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
      },
    });
  });

  it("commit: surfaces bean-check's verdict with new errors named", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn(),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    const ledgerData = {
      getErrors: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            message: "Transaction does not balance",
            source: { filename: "new.bean", lineno: 1 },
          },
        ]),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "add unbalanced file",
        files: [{ operation: "create", path: "new.bean", content: "hello" }],
        dry_run: false,
      },
    );
    expect(result).toEqual({
      ok: true,
      result: {
        summary:
          "Committed 1 change(s) to new.bean. 1 new bean-check error: Transaction does not balance (new.bean:1)",
        dry_run: false,
        count: 1,
        operations: [{ operation: "create", path: "new.bean" }],
        diff: [],
        wrote: [{ path: "new.bean" }],
        entryHashes: [],
        validation: {
          errorsBefore: 0,
          errorsAfter: 1,
          newErrors: [
            {
              message: "Transaction does not balance",
              source: "new.bean:1",
            },
          ],
        },
      },
    });
  });

  it("update (str_replace): rejects when old_string is not found", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "zzz",
            new_string: "y",
          },
        ],
        dry_run: false,
      },
    );
    expect(result.ok).toBe(false);
    // The file is there; the argument is what does not match (w5/051).
    expect(result).toMatchObject({
      errorCode: "BAD_USER_INPUT",
      error: expect.stringMatching(/^commit failed: main\.bean: old_string/),
    });
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it.each(["update", "replace", "delete"] as const)(
    "%s: a file that does not exist is NOT_FOUND by category, not by wording",
    async (operation) => {
      const ledgerRepo = {
        getFilesContent: jest.fn().mockResolvedValue([]),
        changeFiles: jest.fn(),
      };
      const result = await executeEditLedgerFiles(
        {
          services: { ledgerRepo } as any,
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
        },
        {
          description: "edit",
          files: [
            {
              operation,
              path: "ghost.bean",
              old_string: "a",
              new_string: "b",
              content: "x",
            } as any,
          ],
          dry_run: false,
        },
      );
      expect(result).toMatchObject({
        ok: false,
        errorCode: "NOT_FOUND",
        error: expect.stringContaining("ghost.bean"),
      });
      expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
    },
  );

  it("dry_run: a refusal says the preview was refused, not that a commit failed", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "zzz",
            new_string: "y",
          },
        ],
        dry_run: true,
      },
    );
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^preview refused: /),
    });
    expect((result as { error: string }).error).not.toContain("commit failed");
  });

  // w23/m9/t002: the dryRun twin previews like dry_run.
  it("update (str_replace): previews under the dryRun twin spelling", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "zzz",
            new_string: "y",
          },
        ],
        dryRun: true,
      },
    );
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^preview refused: /),
    });
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("refuses one true and one false preview flag", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn(),
      changeFiles: jest.fn(),
    };
    await expect(
      executeEditLedgerFiles(
        {
          services: { ledgerRepo } as any,
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
        },
        {
          description: "edit",
          files: [{ operation: "create", path: "new.bean", content: "hi" }],
          dry_run: true,
          dryRun: false,
        },
      ),
    ).rejects.toThrow(/dry_run.*dryRun/);
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("update (str_replace): rejects an ambiguous match (appears more than once)", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "aXaXa", sha: "sha1" },
        ]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "X",
            new_string: "Y",
          },
        ],
        dry_run: false,
      },
    );
    expect(result.ok).toBe(false);
    // Ambiguity is the caller's to fix, not a server fault to retry (w5/036).
    expect(result).toMatchObject({
      errorCode: "BAD_USER_INPUT",
      error: expect.stringContaining("matches 2 times"),
      errorHint: expect.stringContaining("old_string"),
    });
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("dry_run: authorizes through the service and previews without committing", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
      checkProjectedFiles: jest.fn().mockResolvedValue([]),
    };
    const ledgerData = { getErrors: jest.fn().mockResolvedValue([]) };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "b",
            new_string: "B",
          },
        ],
        dry_run: true,
      },
    );
    // One service call, in preview mode: the same write authorization and path
    // validation run, and nothing commits.
    expect(ledgerRepo.changeFiles).toHaveBeenCalledTimes(1);
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    );
    // The projection is checked, not committed: no commit beyond the preview.
    expect(ledgerRepo.checkProjectedFiles).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      overlays: [{ path: "main.bean", content: "aBc" }],
    });
    expect(result).toEqual({
      ok: true,
      result: {
        diff: [
          {
            path: "main.bean",
            diff: "--- a/main.bean\n+++ b/main.bean\n@@ -1,1 +1,1 @@\n-abc\n\\ No newline at end of file\n+aBc\n\\ No newline at end of file\n",
          },
        ],
        summary:
          "Dry run: 1 change(s) previewed (main.bean) — not committed. No new bean-check errors.",
        dry_run: true,
        count: 1,
        operations: [{ operation: "update", path: "main.bean" }],
        wrote: [],
        entryHashes: [],
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
      },
    });
  });

  it("dry_run: reports the projected bean-check errors, not the current ones", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
      checkProjectedFiles: jest.fn().mockResolvedValue([
        {
          message: "Transaction does not balance: residual 5 USD",
          source: { filename: "main.bean", lineno: 1 },
        },
      ]),
    };
    const ledgerData = { getErrors: jest.fn().mockResolvedValue([]) };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "main.bean",
            old_string: "b",
            new_string: "B",
          },
        ],
        dry_run: true,
      },
    );
    expect(result).toEqual({
      ok: true,
      result: {
        diff: [
          {
            path: "main.bean",
            diff: "--- a/main.bean\n+++ b/main.bean\n@@ -1,1 +1,1 @@\n-abc\n\\ No newline at end of file\n+aBc\n\\ No newline at end of file\n",
          },
        ],
        summary:
          "Dry run: 1 change(s) previewed (main.bean) — not committed. 1 new bean-check error: Transaction does not balance: residual 5 USD (main.bean:1)",
        dry_run: true,
        count: 1,
        operations: [{ operation: "update", path: "main.bean" }],
        wrote: [],
        entryHashes: [],
        validation: {
          errorsBefore: 0,
          errorsAfter: 1,
          newErrors: [
            {
              message: "Transaction does not balance: residual 5 USD",
              source: "main.bean:1",
            },
          ],
        },
      },
    });
  });

  it("dry_run: projects a deletion as content null with a removal diff", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn().mockResolvedValue([
        { path: "main.bean", content: "keep", sha: "sha1" },
        { path: "gone.bean", content: "bye", sha: "sha2" },
      ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
      checkProjectedFiles: jest.fn().mockResolvedValue([]),
    };
    const ledgerData = { getErrors: jest.fn().mockResolvedValue([]) };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "drop",
        files: [{ operation: "delete", path: "gone.bean" }],
        dry_run: true,
      },
    );
    expect(ledgerRepo.checkProjectedFiles).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      overlays: [{ path: "gone.bean", content: null }],
    });
    expect(result).toEqual({
      ok: true,
      result: {
        diff: [
          {
            path: "gone.bean",
            diff: "--- a/gone.bean\n+++ b/gone.bean\n@@ -1,1 +0,0 @@\n-bye\n\\ No newline at end of file\n",
          },
        ],
        summary:
          "Dry run: 1 change(s) previewed (gone.bean) — not committed. No new bean-check errors.",
        dry_run: true,
        count: 1,
        operations: [{ operation: "delete", path: "gone.bean" }],
        wrote: [],
        entryHashes: [],
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
      },
    });
  });

  it("dry_run: a write-authorization refusal fails the preview too", async () => {
    // Before the preview ran through the service, a create-only dry run never
    // authorized at all — a read-only caller previewed happily and failed only
    // on the real call.
    const ledgerRepo = {
      getFilesContent: jest.fn(),
      changeFiles: jest.fn().mockRejectedValue(new Error("forbidden")),
    };
    const result = await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "add file",
        files: [{ operation: "create", path: "new.bean", content: "x" }],
        dry_run: true,
      },
    );
    expect(result.ok).toBe(false);
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    );
  });

  it("delete: requires the file's current sha, fetched first", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "old.bean", content: "x", sha: "sha-to-delete" },
        ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "remove file",
        files: [{ operation: "delete", path: "old.bean" }],
        dry_run: false,
      },
    );
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          { operation: "delete", path: "old.bean", sha: "sha-to-delete" },
        ],
      }),
    );
  });

  it("canonicalizes a shell-style relative path before editing", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([
          { path: "main.bean", content: "abc", sha: "sha1" },
        ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    await executeEditLedgerFiles(
      {
        services: { ledgerRepo } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          {
            operation: "update",
            path: "./main.bean",
            old_string: "b",
            new_string: "B",
          },
        ],
        dry_run: false,
      },
    );
    expect(ledgerRepo.getFilesContent).toHaveBeenCalledWith({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      paths: ["main.bean"],
    });
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [expect.objectContaining({ path: "main.bean" })],
      }),
    );
  });
});

/**
 * Tool-annotation guard (w2/m27:t002).
 *
 * Clients decide what to auto-approve from the four hints, so a descriptor
 * without them — or a `readOnlyHint` that disagrees with the tool's op-class —
 * fails CI here rather than misleading a client in production.
 */
describe("MCP tool annotations", () => {
  type Verb = (typeof VERB_TABLE)[number];
  /** A lookup: a read, or an admin-authority GraphQL query. */
  const changesNothing = (entry: Verb) =>
    entry.class === "read" ||
    (entry.class === "admin" && entry.verb.startsWith("Query."));
  const verbsByTool = new Map<string, Verb[]>();
  for (const entry of VERB_TABLE) {
    if (!entry.mcp) continue;
    verbsByTool.set(entry.mcp, [...(verbsByTool.get(entry.mcp) ?? []), entry]);
  }

  it("declares all four hints on every tool", () => {
    for (const tool of MCP_TOOLS) {
      expect(typeof tool.annotations.readOnlyHint).toBe("boolean");
      expect(typeof tool.annotations.destructiveHint).toBe("boolean");
      expect(typeof tool.annotations.idempotentHint).toBe("boolean");
      expect(typeof tool.annotations.openWorldHint).toBe("boolean");
    }
  });

  it("marks a tool read-only exactly when every verb it carries changes nothing", () => {
    // Both directions: a read-only hint on a write would let hosts
    // auto-approve it, and a pure read left unmarked makes every host ask
    // before a lookup. Both directories require the hint to match the
    // behavior (ADR 019, 2026-10-09 amendment), so an admin-authority lookup
    // (a GraphQL Query in the admin class, like bank connections) is
    // read-only too. Write-class queries consume quota and are not.
    for (const tool of MCP_TOOLS) {
      const verbs = verbsByTool.get(tool.name) ?? [];
      expect(verbs.length).toBeGreaterThan(0);
      expect({
        tool: tool.name,
        readOnly: tool.annotations.readOnlyHint,
      }).toEqual({
        tool: tool.name,
        readOnly: verbs.every(changesNothing),
      });
    }
  });

  // w23/149: file writes commit-invalid until the owner gates them; the
  // tools say so, so no surface stays silent about it.
  it("says on every file tool that writes commit-invalid", () => {
    const byName = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
    for (const name of [
      "createLedgerFiles",
      "updateLedgerFiles",
      "deleteLedgerFiles",
    ]) {
      expect(byName.get(name)?.description).toContain(
        "commit even when they introduce new bean-check errors",
      );
    }
  });

  it("never mixes a lookup and a state change in one tool", () => {
    // Claude's review rejects a single tool that accepts both safe and unsafe
    // operations (ADR 019, 2026-10-09 amendment); `manageApiKeys`' `list`
    // branch was the last one.
    for (const [tool, verbs] of verbsByTool) {
      const n = verbs.filter(changesNothing).length;
      expect({ tool, mixed: n > 0 && n < verbs.length }).toEqual({
        tool,
        mixed: false,
      });
    }
  });

  it("marks every tool that can delete, overwrite, or revoke as destructive", () => {
    const destructive = new Map(
      MCP_TOOLS.map((tool) => [tool.name, tool.annotations.destructiveHint]),
    );
    for (const name of [
      "deleteLedger",
      "updateLedger",
      "setLedgerCollaborator",
      "removeLedgerCollaborator",
      "leaveLedger",
      "mergePullRequest",
      "rejectPullRequest",
      "discardStagedBankTransactions",
      "reconcileBankAccounts",
      "mapBankAccount",
      "setBankAccountCurrency",
      "unlinkBankConnection",
      "updateLedgerFiles",
      "deleteLedgerFiles",
      "updateEntrySource",
      "deleteEntrySource",
      "deleteEntrySources",
    ]) {
      expect(destructive.get(name)).toBe(true);
    }
  });

  it("gives each per-operation tool the hints ADR 019 decided on 2026-10-18", () => {
    // The amendment's table: overwriting, deleting, merging, closing, and
    // revoking access are destructive; a tool that reaches the bank, or can
    // publish a ledger to anyone (w1/174), is open world. Directory reviewers check these against the behavior, so a hint
    // changes only with the decision.
    const decided: [string, { destructive: boolean; openWorld: boolean }][] = [
      ["createLedgerFiles", { destructive: false, openWorld: false }],
      ["updateLedgerFiles", { destructive: true, openWorld: false }],
      ["deleteLedgerFiles", { destructive: true, openWorld: false }],
      ["updateEntrySource", { destructive: true, openWorld: false }],
      ["deleteEntrySource", { destructive: true, openWorld: false }],
      ["deleteEntrySources", { destructive: true, openWorld: false }],
      ["syncBankTransactions", { destructive: false, openWorld: true }],
      [
        "importStagedBankTransactions",
        { destructive: false, openWorld: false },
      ],
      [
        "discardStagedBankTransactions",
        { destructive: true, openWorld: false },
      ],
      ["reconcileBankAccounts", { destructive: true, openWorld: true }],
      ["mapBankAccount", { destructive: true, openWorld: false }],
      ["setBankAccountCurrency", { destructive: true, openWorld: false }],
      ["refreshBankConnection", { destructive: false, openWorld: true }],
      ["unlinkBankConnection", { destructive: true, openWorld: true }],
      ["createPullRequest", { destructive: false, openWorld: false }],
      ["mergePullRequest", { destructive: true, openWorld: false }],
      ["rejectPullRequest", { destructive: true, openWorld: false }],
      ["createLedger", { destructive: false, openWorld: true }],
      ["updateLedger", { destructive: true, openWorld: true }],
      ["deleteLedger", { destructive: true, openWorld: false }],
      ["setLedgerCollaborator", { destructive: true, openWorld: false }],
      ["removeLedgerCollaborator", { destructive: true, openWorld: false }],
      ["leaveLedger", { destructive: true, openWorld: false }],
    ];
    const served = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
    expect(
      decided.map(([name]) => {
        const hints = served.get(name)?.annotations;
        return [
          name,
          {
            destructive: hints?.destructiveHint,
            openWorld: hints?.openWorldHint,
          },
        ];
      }),
    ).toEqual(decided);
    // Refreshing re-reads the bank's status: repeating it changes nothing.
    expect(
      served.get("refreshBankConnection")?.annotations.idempotentHint,
    ).toBe(true);
  });
});
