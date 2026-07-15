import {
  isEditable,
  sortEntries,
  pushPathStack,
  popPathStack,
} from "../screens/ledger-file-browser-screen/utils";
import {
  decodeLedgerFileContent,
  isConflictError,
  filterFileErrors,
  classifyBeancountChunk,
} from "../screens/ledger-file-editor-screen/utils";

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

// ── isEditable ────────────────────────────────────────────────────────────────

test("isEditable: .bean files are editable", () => {
  if (!isEditable("main.bean")) throw new Error("main.bean should be editable");
});

test("isEditable: .beancount files are editable", () => {
  if (!isEditable("expenses.beancount"))
    throw new Error("expenses.beancount should be editable");
});

test("isEditable: .py files are not editable", () => {
  if (isEditable("script.py")) throw new Error(".py should not be editable");
});

test("isEditable: .txt files are not editable", () => {
  if (isEditable("notes.txt")) throw new Error(".txt should not be editable");
});

test("isEditable: directories are not editable", () => {
  if (isEditable("2024"))
    throw new Error("bare dir name should not be editable");
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

test("filterFileErrors: matches by filename only (no path)", () => {
  const errors = [{ message: "oops", filename: "expenses.bean", lineno: 10 }];
  const filtered = filterFileErrors(errors, "2024/expenses.bean");
  if (filtered.length !== 1)
    throw new Error(`expected 1 match by filename, got ${filtered.length}`);
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

// ── classifyBeancountChunk (tokenizer patterns) ───────────────────────────────

test("classifyBeancountChunk: comments start with semicolon", () => {
  const t = classifyBeancountChunk("; this is a comment");
  if (t !== "comment") throw new Error(`expected 'comment', got '${t}'`);
});

test("classifyBeancountChunk: dates YYYY-MM-DD", () => {
  const t = classifyBeancountChunk("2024-01-15 txn");
  if (t !== "date") throw new Error(`expected 'date', got '${t}'`);
});

test("classifyBeancountChunk: partial date is not a date", () => {
  const t = classifyBeancountChunk("2024-01 balance");
  if (t === "date") throw new Error("partial date should not match");
});

test("classifyBeancountChunk: 'txn' keyword", () => {
  const t = classifyBeancountChunk("txn");
  if (t !== "keyword") throw new Error(`expected 'keyword', got '${t}'`);
});

test("classifyBeancountChunk: 'open' keyword", () => {
  const t = classifyBeancountChunk("open Assets:Checking");
  if (t !== "keyword") throw new Error(`expected 'keyword', got '${t}'`);
});

test("classifyBeancountChunk: 'balance' keyword", () => {
  const t = classifyBeancountChunk("balance Assets:Savings 1000 USD");
  if (t !== "keyword") throw new Error(`expected 'keyword', got '${t}'`);
});

test("classifyBeancountChunk: account name (multi-segment)", () => {
  const t = classifyBeancountChunk("Assets:Checking:Main");
  if (t !== "account") throw new Error(`expected 'account', got '${t}'`);
});

test("classifyBeancountChunk: tag starts with #", () => {
  const t = classifyBeancountChunk("#vacation-2024");
  if (t !== "tag") throw new Error(`expected 'tag', got '${t}'`);
});

test("classifyBeancountChunk: link starts with ^", () => {
  const t = classifyBeancountChunk("^trip-ref");
  if (t !== "link") throw new Error(`expected 'link', got '${t}'`);
});

test("classifyBeancountChunk: currency is uppercase code", () => {
  const t = classifyBeancountChunk("USD");
  if (t !== "currency") throw new Error(`expected 'currency', got '${t}'`);
});

test("classifyBeancountChunk: amount is a number", () => {
  const t = classifyBeancountChunk("1,234.56");
  if (t !== "number") throw new Error(`expected 'number', got '${t}'`);
});

test("classifyBeancountChunk: negative amount", () => {
  const t = classifyBeancountChunk("-100.00");
  if (t !== "number") throw new Error(`expected 'number', got '${t}'`);
});

test("classifyBeancountChunk: transaction flag *", () => {
  const t = classifyBeancountChunk("* txn");
  if (t !== "flag") throw new Error(`expected 'flag', got '${t}'`);
});

test("classifyBeancountChunk: transaction flag !", () => {
  const t = classifyBeancountChunk("! pending");
  if (t !== "flag") throw new Error(`expected 'flag', got '${t}'`);
});

test("classifyBeancountChunk: string opening quote", () => {
  const t = classifyBeancountChunk('"Grocery Store"');
  if (t !== "string") throw new Error(`expected 'string', got '${t}'`);
});

test("classifyBeancountChunk: plain text returns null", () => {
  const t = classifyBeancountChunk("   ");
  if (t !== null) throw new Error(`expected null for whitespace, got '${t}'`);
});
