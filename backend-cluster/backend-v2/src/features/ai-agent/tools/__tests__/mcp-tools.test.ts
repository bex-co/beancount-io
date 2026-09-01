import { executeBqlQuery } from "../bql-query-tool";
import { executeListLedgerFiles } from "../list-ledger-files-tool";
import { executeReadLedgerFiles } from "../read-ledger-files-tool";
import { executeEditLedgerFiles } from "../edit-ledger-files-tool";
import type { Identity } from "@/server/api/identity";

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
      queryShellText: jest.fn().mockResolvedValue({ text: "Assets:Cash  100 USD" }),
    };
    const result = await executeBqlQuery(
      { services: { ledgerShell } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
      { services: { ledgerShell } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      { query: "BALANCES" },
    );
    expect(result.ok).toBe(false);
  });
});

describe("executeListLedgerFiles", () => {
  it("narrows service entries to {path, type} for the tool's output schema", async () => {
    const ledgerRepo = {
      listDirContent: jest.fn().mockResolvedValue([
        { path: "main.bean", name: "main.bean", type: "file" },
        { path: "sub", name: "sub", type: "dir" },
      ]),
    };
    const result = await executeListLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      {},
    );
    expect(result).toEqual({
      ok: true,
      result: [
        { path: "main.bean", type: "file" },
        { path: "sub", type: "dir" },
      ],
    });
  });

  it("passes dir_path through to the service", async () => {
    const ledgerRepo = { listDirContent: jest.fn().mockResolvedValue([]) };
    await executeListLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
          content: "line1\nline2\nline3",
        },
      ],
    });
  });

  it("slices to the requested 1-based, inclusive line range", async () => {
    const ledgerRepo = serviceReturning("line1\nline2\nline3\nline4");
    const result = await executeReadLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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

  it("fails the whole call when a requested path is missing from the response", async () => {
    const ledgerRepo = { getFilesContent: jest.fn().mockResolvedValue([]) };
    const result = await executeReadLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      { files: [{ path: "missing.bean" }] },
    );
    expect(result.ok).toBe(false);
  });

  it("de-duplicates requested paths when calling the service", async () => {
    const ledgerRepo = serviceReturning("x");
    await executeReadLedgerFiles(
      {
        services: { ledgerRepo: { getFilesContent: ledgerRepo.getFilesContent } } as any,
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
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
          content: "content",
        },
      ],
    });
  });
});

describe("executeEditLedgerFiles", () => {
  it("create: base64-encodes content and never fetches existing content", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn(),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    const result = await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
          content: Buffer.from("hello").toString("base64"),
        },
      ],
      message: "AI edit: add new file",
    });
    expect(result).toEqual({
      ok: true,
      result: {
        dry_run: false,
        count: 1,
        operations: [{ operation: "create", path: "new.bean" }],
      },
    });
  });

  it("update (str_replace): rejects when old_string is not found", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "main.bean", content: "abc", sha: "sha1" }]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      {
        description: "edit",
        files: [
          { operation: "update", path: "main.bean", old_string: "zzz", new_string: "y" },
        ],
        dry_run: false,
      },
    );
    expect(result.ok).toBe(false);
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("update (str_replace): rejects an ambiguous match (appears more than once)", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "main.bean", content: "aXaXa", sha: "sha1" }]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      {
        description: "edit",
        files: [
          { operation: "update", path: "main.bean", old_string: "X", new_string: "Y" },
        ],
        dry_run: false,
      },
    );
    expect(result.ok).toBe(false);
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("dry_run: validates and previews without committing", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "main.bean", content: "abc", sha: "sha1" }]),
      changeFiles: jest.fn(),
    };
    const result = await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      {
        description: "edit",
        files: [
          { operation: "update", path: "main.bean", old_string: "b", new_string: "B" },
        ],
        dry_run: true,
      },
    );
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      result: {
        dry_run: true,
        count: 1,
        operations: [{ operation: "update", path: "main.bean" }],
      },
    });
  });

  it("delete: requires the file's current sha, fetched first", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "old.bean", content: "x", sha: "sha-to-delete" }]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
      {
        description: "remove file",
        files: [{ operation: "delete", path: "old.bean" }],
        dry_run: false,
      },
    );
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [{ operation: "delete", path: "old.bean", sha: "sha-to-delete" }],
      }),
    );
  });

  it("canonicalizes a shell-style relative path before editing", async () => {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "main.bean", content: "abc", sha: "sha1" }]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
    };
    await executeEditLedgerFiles(
      { services: { ledgerRepo } as any, identity: IDENTITY, ledgerId: LEDGER_ID },
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
