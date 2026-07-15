import {
  formatErrorLocation,
  formatShortSha,
} from "../screens/notifications-screen/formatting";
import {
  classifyDiffLine,
  parseDiff,
} from "../screens/commit-detail-screen/diff-utils";

// ── formatErrorLocation ──────────────────────────────────────────────────────

test("formatErrorLocation: returns message when filename is null", () => {
  const result = formatErrorLocation({
    filename: null,
    lineno: 10,
    message: "bad syntax",
  });
  if (result !== "bad syntax")
    throw new Error(`expected "bad syntax", got ${result}`);
});

test("formatErrorLocation: returns message when filename is undefined", () => {
  const result = formatErrorLocation({
    filename: undefined,
    lineno: 5,
    message: "unknown error",
  });
  if (result !== "unknown error")
    throw new Error(`expected "unknown error", got ${result}`);
});

test("formatErrorLocation: includes filename and lineno", () => {
  const result = formatErrorLocation({
    filename: "main.beancount",
    lineno: 42,
    message: "bad",
  });
  if (result !== "main.beancount:42")
    throw new Error(`expected "main.beancount:42", got ${result}`);
});

test("formatErrorLocation: filename only when lineno is null", () => {
  const result = formatErrorLocation({
    filename: "main.beancount",
    lineno: null,
    message: "bad",
  });
  if (result !== "main.beancount")
    throw new Error(`expected "main.beancount", got ${result}`);
});

test("formatErrorLocation: filename only when lineno is undefined", () => {
  const result = formatErrorLocation({
    filename: "main.beancount",
    lineno: undefined,
    message: "bad",
  });
  if (result !== "main.beancount")
    throw new Error(`expected "main.beancount", got ${result}`);
});

// ── formatShortSha ───────────────────────────────────────────────────────────

test("formatShortSha: returns shortSha when present", () => {
  const result = formatShortSha("abcdef1234567890", "abcdef1");
  if (result !== "abcdef1")
    throw new Error(`expected "abcdef1", got ${result}`);
});

test("formatShortSha: returns first 7 chars of sha when shortSha is null", () => {
  const result = formatShortSha("abcdef1234567890", null);
  if (result !== "abcdef1")
    throw new Error(`expected "abcdef1", got ${result}`);
});

test("formatShortSha: returns first 7 chars of sha when shortSha is undefined", () => {
  const result = formatShortSha("abcdef1234567890", undefined);
  if (result !== "abcdef1")
    throw new Error(`expected "abcdef1", got ${result}`);
});

// ── classifyDiffLine ─────────────────────────────────────────────────────────

test("classifyDiffLine: + line is added", () => {
  const result = classifyDiffLine("+added line");
  if (result.type !== "added")
    throw new Error(`expected "added", got ${result.type}`);
  if (result.content !== "+added line")
    throw new Error(`wrong content: ${result.content}`);
});

test("classifyDiffLine: - line is removed", () => {
  const result = classifyDiffLine("-removed line");
  if (result.type !== "removed")
    throw new Error(`expected "removed", got ${result.type}`);
});

test("classifyDiffLine: context line is context", () => {
  const result = classifyDiffLine(" unchanged line");
  if (result.type !== "context")
    throw new Error(`expected "context", got ${result.type}`);
});

test("classifyDiffLine: +++ header line is context (not added)", () => {
  const result = classifyDiffLine("+++ b/main.beancount");
  if (result.type !== "context")
    throw new Error(`expected "context" for +++ line, got ${result.type}`);
});

test("classifyDiffLine: --- header line is context (not removed)", () => {
  const result = classifyDiffLine("--- a/main.beancount");
  if (result.type !== "context")
    throw new Error(`expected "context" for --- line, got ${result.type}`);
});

test("classifyDiffLine: @@ hunk header is context", () => {
  const result = classifyDiffLine("@@ -1,4 +1,5 @@");
  if (result.type !== "context")
    throw new Error(`expected "context" for @@ line, got ${result.type}`);
});

// ── parseDiff ────────────────────────────────────────────────────────────────

test("parseDiff: splits diff into lines and classifies each", () => {
  const diff = "+added\n-removed\n context";
  const lines = parseDiff(diff);
  if (lines.length !== 3)
    throw new Error(`expected 3 lines, got ${lines.length}`);
  if (lines[0].type !== "added") throw new Error(`line 0 should be added`);
  if (lines[1].type !== "removed") throw new Error(`line 1 should be removed`);
  if (lines[2].type !== "context") throw new Error(`line 2 should be context`);
});

test("parseDiff: empty diff yields one context line", () => {
  const lines = parseDiff("");
  if (lines.length !== 1)
    throw new Error(`expected 1 line for empty diff, got ${lines.length}`);
  if (lines[0].type !== "context") throw new Error(`expected context type`);
});
