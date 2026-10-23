import {
  normalizeLedgerFileName,
  buildLedgerFilePath,
  canDeleteLedgerFile,
  sortEntries,
  pushPathStack,
  popPathStack,
} from "../screens/ledger-file-browser-screen/utils";
import { filterFileErrors } from "../screens/ledger-file-editor-screen/utils";
import { isConflictError } from "../common/ledger-conflict";
import { getKeyboardOverlap } from "../components/keyboard-accessory-bar/utils";
import {
  decodeLedgerFileContent,
  encodeLedgerFileContent,
} from "../common/ledger-file-content";
import { isEditableTextFile } from "../common/ledger-file-types";

// ── decodeLedgerFileContent ─────────────────────────────────────────────────

test("decodeLedgerFileContent: leaves plain content unchanged", () => {
  const content = '2026-07-15 * "Coffee"\n';
  const decoded = decodeLedgerFileContent(content, "utf-8");
  if (decoded !== content) throw new Error("plain content should be unchanged");
});

test("decodeLedgerFileContent: decodes wrapped UTF-8 base64", () => {
  const content = '2026-07-15 * "Café 東京"\n  Assets:Cash  -5 USD\n';
  const encoded = Buffer.from(content, "utf8").toString("base64");
  const wrapped = `${encoded.slice(0, 16)}\n${encoded.slice(16)}`;
  const decoded = decodeLedgerFileContent(wrapped, "base64");
  if (decoded !== content) {
    throw new Error(`expected UTF-8 content, got ${JSON.stringify(decoded)}`);
  }
});

test("ledger file content: UTF-8 encode/decode round trip", () => {
  const content = '2026-07-15 * "Crème brûlée 東京"\n  Assets:Cash  -5 USD\n';
  const encoded = encodeLedgerFileContent(content);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("encoded content should be valid base64");
  }
  const decoded = decodeLedgerFileContent(encoded, "base64");
  if (decoded !== content) {
    throw new Error(
      `expected round-trip content, got ${JSON.stringify(decoded)}`,
    );
  }
});

// ── isEditableTextFile ────────────────────────────────────────────────────────

test("isEditableTextFile: .bean files are editable", () => {
  if (!isEditableTextFile("main.bean"))
    throw new Error("main.bean should be editable");
});

test("isEditableTextFile: .beancount files are editable", () => {
  if (!isEditableTextFile("expenses.beancount"))
    throw new Error("expenses.beancount should be editable");
});

test("isEditableTextFile: opens notes, data, configuration, and source files", () => {
  for (const filename of [
    "notes.txt",
    "README.md",
    "statements/transactions.CSV",
    "settings.json",
    "import.yaml",
    "import.yml",
    "pyproject.toml",
    "config.ini",
    "statement.xml",
    "importer.py",
    "script.js",
    "script.ts",
    "sync.sh",
    "MAIN.BEAN",
    "archive.BEANCOUNT",
    "README",
    "LICENSE",
    "Makefile",
    ".gitignore",
    ".env.example",
  ]) {
    if (!isEditableTextFile(filename))
      throw new Error(`${filename} should be editable`);
  }
});

test("isEditableTextFile: excludes binary and directory paths", () => {
  for (const filename of [
    "receipt.pdf",
    "receipt.png",
    "photo.jpg",
    "archive.zip",
    "data.sqlite",
    "spreadsheet.xlsx",
    "notes.txt.zip",
    ".DS_Store",
    "notes.txt/",
    "",
  ]) {
    if (isEditableTextFile(filename))
      throw new Error(`${filename} should not be editable`);
  }
});

// w21/771: a ledger includes files of any name; only listed extensions opened.
test("isEditableTextFile: opens an include of any other name", () => {
  for (const filename of [
    "qa20261020-prices",
    "qa20261020-prices.inc",
    "prices.db.bean",
    "2024",
    "file.unknown",
  ]) {
    if (!isEditableTextFile(filename))
      throw new Error(`${filename} should be editable`);
  }
});

test("normalizeLedgerFileName: appends .bean when omitted", () => {
  const result = normalizeLedgerFileName("investments");
  if (result !== "investments.bean") {
    throw new Error(`expected investments.bean, got ${result}`);
  }
});

test("normalizeLedgerFileName: preserves .beancount extension", () => {
  const result = normalizeLedgerFileName("  archive.beancount  ");
  if (result !== "archive.beancount") {
    throw new Error(`expected archive.beancount, got ${result}`);
  }
});

test("normalizeLedgerFileName: rejects traversal and unsupported extensions", () => {
  // Folders are allowed, as the server allows them (w21/014); escaping is not.
  if (normalizeLedgerFileName("nested/file") !== "nested/file.bean") {
    throw new Error("a relative path into a folder should be accepted");
  }
  if (normalizeLedgerFileName("../file.bean") !== null) {
    throw new Error("traversal should be rejected");
  }
  if (normalizeLedgerFileName("notes.txt") !== null) {
    throw new Error("unsupported extensions should be rejected");
  }
  if (normalizeLedgerFileName(".bean") !== null) {
    throw new Error("filenames require a non-empty stem");
  }
});

test("buildLedgerFilePath: joins subdirectory and filename", () => {
  const path = buildLedgerFilePath("2026/", "expenses.bean");
  if (path !== "2026/expenses.bean") {
    throw new Error(`expected joined path, got ${path}`);
  }
});

test("buildLedgerFilePath: leaves root filename unprefixed", () => {
  const path = buildLedgerFilePath("", "accounts.bean");
  if (path !== "accounts.bean") {
    throw new Error(`expected root filename, got ${path}`);
  }
});

test("canDeleteLedgerFile: protects main.bean only", () => {
  if (canDeleteLedgerFile("main.bean")) {
    throw new Error("main.bean must be protected");
  }
  if (!canDeleteLedgerFile("accounts.bean")) {
    throw new Error("other ledger files should be deletable");
  }
});

// ── sortEntries ───────────────────────────────────────────────────────────────

test("sortEntries: directories come before files", () => {
  const entries = [
    { name: "main.bean", type: "file", path: "main.bean" },
    { name: "2024", type: "dir", path: "2024" },
  ];
  const sorted = sortEntries(entries);
  if (sorted[0].type !== "dir")
    throw new Error("first sorted entry should be a directory");
});

test("sortEntries: files sorted alphabetically within their group", () => {
  const entries = [
    { name: "z.bean", type: "file", path: "z.bean" },
    { name: "a.bean", type: "file", path: "a.bean" },
  ];
  const sorted = sortEntries(entries);
  if (sorted[0].name !== "a.bean")
    throw new Error(`expected a.bean first, got ${sorted[0].name}`);
});

test("sortEntries: dirs sorted alphabetically within their group", () => {
  const entries = [
    { name: "z", type: "dir", path: "z" },
    { name: "a", type: "dir", path: "a" },
  ];
  const sorted = sortEntries(entries);
  if (sorted[0].name !== "a")
    throw new Error(`expected dir 'a' first, got ${sorted[0].name}`);
});

// ── path stack ────────────────────────────────────────────────────────────────

test("pushPathStack: appends path to stack", () => {
  const result = pushPathStack([""], "2024");
  if (result.length !== 2)
    throw new Error(`expected length 2, got ${result.length}`);
  if (result[1] !== "2024")
    throw new Error(`expected '2024', got ${result[1]}`);
});

test("popPathStack: removes last entry", () => {
  const result = popPathStack(["", "2024"]);
  if (result.length !== 1)
    throw new Error(`expected length 1, got ${result.length}`);
  if (result[0] !== "") throw new Error(`expected root ''`);
});

test("popPathStack: does not pop below root", () => {
  const result = popPathStack([""]);
  if (result.length !== 1)
    throw new Error("should stay at root, length should be 1");
  if (result[0] !== "") throw new Error("root entry should remain");
});

test("pushPathStack: does not mutate original", () => {
  const original = [""];
  pushPathStack(original, "2024");
  if (original.length !== 1)
    throw new Error("original stack should not be mutated");
});

// ── isConflictError ───────────────────────────────────────────────────────────

test("isConflictError: detects 'sha' in message", () => {
  if (!isConflictError("sha mismatch"))
    throw new Error("should detect 'sha' as conflict");
});

test("isConflictError: detects 'conflict' in message", () => {
  if (!isConflictError("merge conflict detected"))
    throw new Error("should detect 'conflict'");
});

test("isConflictError: detects '409' in message", () => {
  if (!isConflictError("HTTP 409 status"))
    throw new Error("should detect '409' as conflict");
});

test("isConflictError: case-insensitive SHA detection", () => {
  if (!isConflictError("Invalid SHA: abc123"))
    throw new Error("should detect 'SHA' case-insensitively");
});

// w21/387: a substring test read an account named Shares, an amount of 409.00
// and a line main.bean:1409 as a conflict.
test("isConflictError: does not read words that merely contain sha or 409", () => {
  for (const text of [
    "Balance failed for Assets:Brokerage:Shares: expected 409.00 USD (main.bean:1409)",
    "Posting to inactive account Expenses:Marshal",
    "rushed 4090 times",
  ]) {
    if (isConflictError(text)) throw new Error(`flagged: ${text}`);
  }
  for (const text of [
    "sha256sum mismatch: the entry changed",
    "sha does not match [given: a, expected: b]",
    "HTTP 409 Conflict",
    "status code 409",
  ]) {
    if (!isConflictError(text)) throw new Error(`missed: ${text}`);
  }
});

test("isConflictError: returns false for unrelated errors", () => {
  if (isConflictError("Network request failed"))
    throw new Error("unrelated error should not be flagged as conflict");
});

// ── filterFileErrors ──────────────────────────────────────────────────────────

test("filterFileErrors: matches by exact path", () => {
  const errors = [
    { message: "err", filename: "2024/expenses.bean", lineno: 5 },
    { message: "other", filename: "main.bean", lineno: 1 },
  ];
  const filtered = filterFileErrors(errors, "2024/expenses.bean");
  if (filtered.length !== 1)
    throw new Error(`expected 1 error, got ${filtered.length}`);
  if (filtered[0].message !== "err") throw new Error("wrong error returned");
});

// w21/089: a bare or same-named path is another file's error.
test("filterFileErrors: leaves out a same-named file in another folder", () => {
  const errors = [
    { message: "oops", filename: "expenses.bean", lineno: 10 },
    { message: "oops", filename: "2023/expenses.bean", lineno: 12 },
  ];
  const filtered = filterFileErrors(errors, "2024/expenses.bean");
  if (filtered.length !== 0)
    throw new Error(`expected no match by basename, got ${filtered.length}`);
});

test("filterFileErrors: leaves the root main.bean's errors off sub/main.bean", () => {
  const errors = [{ message: "oops", filename: "main.bean", lineno: 3 }];
  if (filterFileErrors(errors, "sub/main.bean").length !== 0)
    throw new Error("root main.bean errors matched sub/main.bean");
  if (filterFileErrors(errors, "main.bean").length !== 1)
    throw new Error("root main.bean lost its own errors");
});

test("filterFileErrors: a path in a null-filename message must be this file's", () => {
  const errors = [
    {
      message: "parse errors in 2023/expenses.bean",
      filename: null,
      lineno: null,
    },
  ];
  if (filterFileErrors(errors, "2024/expenses.bean").length !== 0)
    throw new Error("another folder's path in the message matched");
  if (filterFileErrors(errors, "2023/expenses.bean").length !== 1)
    throw new Error("the file's own path in the message did not match");
});

test("filterFileErrors: ignores a leading ./", () => {
  const errors = [
    { message: "oops", filename: "./2024/expenses.bean", lineno: 1 },
  ];
  if (filterFileErrors(errors, "2024/expenses.bean").length !== 1)
    throw new Error("./-prefixed path did not match");
});

test("filterFileErrors: matches by suffix path", () => {
  const errors = [
    { message: "oops", filename: "/home/user/2024/expenses.bean", lineno: 2 },
  ];
  const filtered = filterFileErrors(errors, "2024/expenses.bean");
  if (filtered.length !== 1)
    throw new Error(`expected 1 match by suffix, got ${filtered.length}`);
});

test("filterFileErrors: returns empty when no match", () => {
  const errors = [{ message: "unrelated", filename: "other.bean", lineno: 1 }];
  const filtered = filterFileErrors(errors, "main.bean");
  if (filtered.length !== 0)
    throw new Error(`expected 0 errors, got ${filtered.length}`);
});

// The live backend returns a null filename and names the file in the message.
// Before this fallback the banner matched nothing and never rendered at all —
// confirmed on a real ledger, where the notifications screen showed "parse
// errors in main.bean" while the editor sat clean.

test("filterFileErrors: falls back to the message when filename is null", () => {
  const errors = [
    { message: "parse errors in main.bean", filename: null, lineno: null },
  ];
  const filtered = filterFileErrors(errors, "main.bean");
  if (filtered.length !== 1)
    throw new Error(`expected 1 match via message, got ${filtered.length}`);
});

test("filterFileErrors: message fallback still scopes to the open file", () => {
  const errors = [
    { message: "parse errors in other.bean", filename: null, lineno: null },
  ];
  const filtered = filterFileErrors(errors, "main.bean");
  if (filtered.length !== 0)
    throw new Error(`expected 0 matches, got ${filtered.length}`);
});

// w21/310: the engine writes the full repository path, so a bare filename in a
// message can only be a root-level file.
test("filterFileErrors: a bare filename in a message is the root file, not a nested one", () => {
  const errors = [
    { message: "parse errors in expenses.bean", filename: "", lineno: null },
  ];
  if (filterFileErrors(errors, "2024/expenses.bean").length !== 0)
    throw new Error("a bare name matched a file in a folder");
  if (filterFileErrors(errors, "expenses.bean").length !== 1)
    throw new Error("the root file lost its own error");
});

test("filterFileErrors: sub/main.bean shows only its own error beside the root's", () => {
  const errors = [
    { message: "parse errors in main.bean", filename: null, lineno: null },
    { message: "parse errors in sub/main.bean", filename: null, lineno: null },
  ];
  const nested = filterFileErrors(errors, "sub/main.bean");
  if (nested.length !== 1 || !nested[0].message.endsWith("sub/main.bean"))
    throw new Error(`sub/main.bean got ${nested.length} errors`);
  const root = filterFileErrors(errors, "main.bean");
  if (root.length !== 1 || root[0].message !== "parse errors in main.bean")
    throw new Error(`main.bean got ${root.length} errors`);
});

test("filterFileErrors: a present filename never falls back to the message", () => {
  // Otherwise an error attributed to another file would surface here just
  // because this file's name appears in its text.
  const errors = [
    {
      message: "main.bean is included from here",
      filename: "other.bean",
      lineno: 3,
    },
  ];
  const filtered = filterFileErrors(errors, "main.bean");
  if (filtered.length !== 0)
    throw new Error(`expected 0 matches, got ${filtered.length}`);
});

// ── keyboard overlap ─────────────────────────────────────────────────────────

test("getKeyboardOverlap: removes the bottom safe-area gap", () => {
  const overlap = getKeyboardOverlap(291, 34, "ios");
  if (overlap !== 257) {
    throw new Error(`expected 257px overlap, got ${overlap}`);
  }
});

test("getKeyboardOverlap: never returns a negative overlap", () => {
  const overlap = getKeyboardOverlap(20, 34, "ios");
  if (overlap !== 0) {
    throw new Error(`expected zero overlap, got ${overlap}`);
  }
});

// w21/049: a folder's own main.bean was locked because the bare name was
// compared; only the root file is protected.
test("canDeleteLedgerFile: protects the root main.bean only", () => {
  expect(canDeleteLedgerFile("main.bean")).toBe(false);
  expect(canDeleteLedgerFile("/main.bean")).toBe(false);
  expect(canDeleteLedgerFile("qa-20261020/main.bean")).toBe(true);
  expect(canDeleteLedgerFile("/qa-20261020/main.bean")).toBe(true);
  expect(canDeleteLedgerFile("accounts.bean")).toBe(true);
});

test("a Files row that cannot open says why (w21/771)", () => {
  const screen = require("fs")
    .readFileSync(
      require("path").join(
        __dirname,
        "..",
        "screens",
        "ledger-file-browser-screen",
        "index.tsx",
      ),
      "utf8",
    )
    .replace(/\s+/g, "");
  if (
    !screen.includes(
      'accessibilityHint={tappable?undefined:t("ledgerFileNotText")}',
    ) ||
    !screen.includes(
      '{!tappable&&(<Textstyle={styles.rowNote}numberOfLines={1}>{t("ledgerFileNotText")}</Text>)}',
    )
  )
    throw new Error("a dimmed row should say it cannot be opened");
});
