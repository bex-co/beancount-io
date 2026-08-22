import type { BeancountError } from "@rustledger/wasm";
import { reconcileDocumentErrors } from "../document-validation";

function fileNotFound(
  path: string,
  over: Partial<BeancountError> = {},
): BeancountError {
  return {
    message: `Document file not found: ${path}`,
    code: "E8001",
    phase: "validate",
    hint: null,
    file: "main.bean",
    line: null,
    column: null,
    end_line: null,
    end_column: null,
    severity: "error",
    ...over,
  };
}

function rootError(root: string): BeancountError {
  return {
    message: `[E7006] Document root '${root}' does not exist`,
    code: null,
    phase: null,
    hint: null,
    file: null,
    line: null,
    column: null,
    end_line: null,
    end_column: null,
    severity: "error",
  };
}

describe("reconcileDocumentErrors", () => {
  describe("E8001 (explicit `document` directive)", () => {
    it("without repoPaths, drops the always-failing engine error", () => {
      expect(
        reconcileDocumentErrors([fileNotFound("receipts/x.pdf")], undefined),
      ).toEqual([]);
    });

    it("drops the error when the referenced file exists in the repo inventory", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("documents/receipt.pdf")],
        ["main.bean", "documents/receipt.pdf"],
      );
      expect(out).toEqual([]);
    });

    it("keeps the ORIGINAL error (source location preserved) when the file is genuinely missing", () => {
      const original = fileNotFound("typo.pdf", {
        file: "sub/included.bean",
        line: 42,
        column: 3,
      });
      const out = reconcileDocumentErrors(
        [original],
        ["main.bean", "documents/receipt.pdf"],
      );
      // The engine's own error is retained — not rebuilt — so `file`/`line` survive.
      expect(out).toEqual([original]);
      expect(out[0].file).toBe("sub/included.bean");
      expect(out[0].line).toBe(42);
    });
  });

  describe("relative document paths (resolved vs the declaring file, issue #6)", () => {
    it("resolves a relative path against the declaring file's directory", () => {
      // `document "receipts/x.pdf"` in sub/ledger.bean -> sub/receipts/x.pdf.
      const out = reconcileDocumentErrors(
        [fileNotFound("receipts/x.pdf", { file: "sub/ledger.bean" })],
        ["main.bean", "sub/receipts/x.pdf"],
      );
      expect(out).toEqual([]); // exists at the resolved path -> false positive dropped
    });

    it("does NOT match a same-named file at the repo root", () => {
      // The declaring file is in sub/, so a repo-root receipts/x.pdf is NOT it.
      const out = reconcileDocumentErrors(
        [fileNotFound("receipts/x.pdf", { file: "sub/ledger.bean" })],
        ["main.bean", "receipts/x.pdf"], // repo root — not sub/receipts/x.pdf
      );
      expect(out).toHaveLength(1); // genuinely missing at sub/receipts/x.pdf -> kept
    });

    it("treats an absolute path as repo-root-relative", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("/receipts/x.pdf", { file: "sub/ledger.bean" })],
        ["receipts/x.pdf"],
      );
      expect(out).toEqual([]); // /receipts/x.pdf -> receipts/x.pdf at root -> dropped
    });
  });

  describe("POSIX path normalization", () => {
    it("resolves `..` segments (documents/../receipts/x.pdf -> receipts/x.pdf)", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("documents/../receipts/x.pdf")],
        ["receipts/x.pdf"],
      );
      expect(out).toEqual([]); // normalizes to an existing file -> dropped
    });

    it("resolves `.` and collapses duplicate slashes", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("./a//b/./c.pdf")],
        ["a/b/c.pdf"],
      );
      expect(out).toEqual([]);
    });

    it("normalizes the repo-inventory side too", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("a/b.pdf")],
        ["./a//b.pdf"],
      );
      expect(out).toEqual([]);
    });

    it("still flags a genuinely-different path after normalization", () => {
      const out = reconcileDocumentErrors(
        [fileNotFound("documents/../typo.pdf")],
        ["receipts/x.pdf"],
      );
      expect(out).toHaveLength(1); // typo.pdf is not in the repo -> kept
    });
  });

  describe('E7006 (`option "documents"` root)', () => {
    it("without repoPaths, drops the engine error", () => {
      expect(
        reconcileDocumentErrors([rootError("documents")], undefined),
      ).toEqual([]);
    });

    it("drops the error when the root directory exists (has files under it)", () => {
      const out = reconcileDocumentErrors(
        [rootError("documents")],
        ["main.bean", "documents/Assets/2020-01-05 receipt.pdf"],
      );
      expect(out).toEqual([]);
    });

    it.each([".", ""])(
      "treats the repository root %j as an existing documents directory",
      (root) => {
        expect(
          reconcileDocumentErrors([rootError(root)], ["main.bean"]),
        ).toEqual([]);
      },
    );

    it("KEEPS the error when the root directory genuinely does not exist", () => {
      const missing = rootError("missing-dir");
      expect(
        reconcileDocumentErrors([missing], ["main.bean", "documents/x.pdf"]),
      ).toEqual([missing]);
    });

    it("extracts a root name that contains a single quote (docs'archive)", () => {
      // Exists in the repo -> dropped (the whole `docs'archive` is parsed, not `docs`).
      expect(
        reconcileDocumentErrors(
          [rootError("docs'archive")],
          ["main.bean", "docs'archive/2020-01-05 receipt.pdf"],
        ),
      ).toEqual([]);
      // Genuinely missing -> kept.
      const missing = rootError("docs'archive");
      expect(
        reconcileDocumentErrors([missing], ["main.bean", "other/x.pdf"]),
      ).toEqual([missing]);
    });
  });

  it("leaves unrelated errors untouched", () => {
    const balance = fileNotFound("x.pdf", {
      code: "E3001",
      message: "does not balance",
    });
    // Not a document error (code E3001, no document message tag) -> always kept.
    expect(reconcileDocumentErrors([balance], ["main.bean"])).toEqual([
      balance,
    ]);
  });
});
