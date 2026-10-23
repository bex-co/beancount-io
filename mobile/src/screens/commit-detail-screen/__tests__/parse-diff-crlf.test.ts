import { parseDiff } from "../diff-utils";

// w21/272: a CRLF ledger's diff rows kept their `\r` (double-spaced on iOS),
// and every diff ended with an empty row.
describe("parseDiff line endings", () => {
  const crlf = [
    "diff --git a/main.beancount b/main.beancount",
    "--- a/main.beancount",
    "+++ b/main.beancount",
    "@@ -1,2 +1,2 @@",
    " 2024-01-01 open Assets:Cash",
    "-old",
    "+new",
    "",
  ].join("\r\n");

  it("gives one row per line with no carriage return", () => {
    const rows = parseDiff(crlf);
    expect(rows.length).toBe(7);
    expect(rows.some((row) => row.content.includes("\r"))).toBe(false);
    expect(rows[4]).toEqual({
      type: "context",
      content: " 2024-01-01 open Assets:Cash",
    });
    expect(rows[5]).toEqual({ type: "removed", content: "-old" });
    expect(rows[6]).toEqual({ type: "added", content: "+new" });
  });

  it("ends without an empty row, for LF diffs too", () => {
    expect(parseDiff("@@ -1 +1 @@\n-a\n+b\n").length).toBe(3);
    expect(parseDiff("@@ -1 +1 @@\n-a\n+b").length).toBe(3);
  });

  it("keeps an empty diff as one empty line", () => {
    expect(parseDiff("")).toEqual([{ type: "context", content: "" }]);
  });
});

// w21/827: a carriage return inside a line reached the row's Text, which iOS
// lays out as a paragraph break: "+…Order 12" then "34\"" on a row of its own.
describe("a diff line holding a lone carriage return", () => {
  const { diffLineText } = require("../diff-utils");

  it("stays one row, the return drawn as a symbol", () => {
    const lines = parseDiff(
      '@@ -1 +1 @@\n+2026-10-20 * "Qa20261020 Shop" "Order 12\r34"\n',
    );
    expect(lines.map((line) => line.type)).toEqual(["context", "added"]);
    expect(diffLineText(lines[1]!.content)).toBe(
      '+2026-10-20 * "Qa20261020 Shop" "Order 12␍34"',
    );
    expect(diffLineText("+plain line")).toBe("+plain line");
  });

  it("is what the row draws", () => {
    const screen = require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "commit-detail-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      screen.includes("{isolateSourceLine(diffLineText(line.content))}"),
    ).toBe(true);
  });
});
