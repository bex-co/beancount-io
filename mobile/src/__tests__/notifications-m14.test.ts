import {
  formatErrorLocation,
  formatShortSha,
} from "../screens/notifications-screen/formatting";
import { parseDiff } from "../screens/commit-detail-screen/diff-utils";

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

// ── parseDiff ────────────────────────────────────────────────────────────────

const diffTypes = (diff: string) =>
  parseDiff(diff)
    .map((line) => line.type)
    .join(" ");

const NOTES_HEADER = [
  "diff --git a/NOTES.md b/NOTES.md",
  "index 1111111..2222222 100644",
  "--- a/NOTES.md",
  "+++ b/NOTES.md",
].join("\n");

function expectDiffTypes(diff: string, want: string) {
  const got = diffTypes(diff);
  if (got !== want) throw new Error(`expected "${want}", got "${got}"`);
}

test("parseDiff: file headers and @@ are context; hunk + and - are added and removed", () => {
  expectDiffTypes(
    `${NOTES_HEADER}\n@@ -1,2 +1,2 @@\n+added line\n-removed line\n unchanged line`,
    "context context context context context added removed context",
  );
});

test("parseDiff: a deleted --- line is removed, not a file header", () => {
  expectDiffTypes(
    `${NOTES_HEADER}\n@@ -1,3 +1,2 @@\n title\n----\n body`,
    "context context context context context context removed context",
  );
});

test("parseDiff: an added ++ line is added, not a file header", () => {
  expectDiffTypes(
    `${NOTES_HEADER}\n@@ -1 +1,2 @@\n title\n+++note`,
    "context context context context context context added",
  );
});

test("parseDiff: the next file's headers stay context after a hunk", () => {
  const diff = [
    "diff --git a/a.bean b/a.bean",
    "--- a/a.bean",
    "+++ b/a.bean",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "\\ No newline at end of file",
    "diff --git a/b.bean b/b.bean",
    "--- a/b.bean",
    "+++ b/b.bean",
    "@@ -0,0 +1 @@",
    "+added",
  ].join("\n");
  expectDiffTypes(
    diff,
    "context context context context removed added context context context context context added",
  );
});

test("parseDiff: empty diff yields one context line", () => {
  const lines = parseDiff("");
  if (lines.length !== 1)
    throw new Error(`expected 1 line for empty diff, got ${lines.length}`);
  if (lines[0].type !== "context") throw new Error(`expected context type`);
});
