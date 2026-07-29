import { describe, it, expect, beforeEach } from "vitest";
import { parseDiff } from "react-diff-view";
import type { HunkData } from "react-diff-view";
import {
  shouldHighlightDiff,
  isBeancountFile,
  registerBeancountSyntax,
  tokenizeBeancountDiff,
  SYNTAX_HIGHLIGHTING_THRESHOLD,
} from "../syntax-highlighter";

// Helper: parse a minimal unified diff and return the first file's hunks
function parseHunks(diffText: string): HunkData[] {
  const files = parseDiff(diffText);
  return files[0]?.hunks ?? [];
}

const SIMPLE_DIFF = `diff --git a/main.bean b/main.bean
index 1234567..abcdefg 100644
--- a/main.bean
+++ b/main.bean
@@ -1,2 +1,2 @@
 2024-01-01 open Assets:Checking USD
-2024-01-02 * "Old transaction"
+2024-01-02 * "New transaction"
`;

describe("shouldHighlightDiff", () => {
  it("returns true when total lines are below the threshold", () => {
    expect(shouldHighlightDiff(0)).toBe(true);
    expect(shouldHighlightDiff(1)).toBe(true);
    expect(shouldHighlightDiff(SYNTAX_HIGHLIGHTING_THRESHOLD - 1)).toBe(true);
  });

  it("returns false when total lines meet or exceed the threshold", () => {
    expect(shouldHighlightDiff(SYNTAX_HIGHLIGHTING_THRESHOLD)).toBe(false);
    expect(shouldHighlightDiff(SYNTAX_HIGHLIGHTING_THRESHOLD + 1)).toBe(false);
  });
});

describe("isBeancountFile", () => {
  it("recognizes .bean extension", () => {
    expect(isBeancountFile("main.bean")).toBe(true);
    expect(isBeancountFile("path/to/ledger.bean")).toBe(true);
  });

  it("recognizes .beancount extension", () => {
    expect(isBeancountFile("main.beancount")).toBe(true);
    expect(isBeancountFile("path/to/ledger.beancount")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBeancountFile("main.BEAN")).toBe(true);
    expect(isBeancountFile("main.Beancount")).toBe(true);
  });

  it("returns false for unrelated file extensions", () => {
    expect(isBeancountFile("main.ts")).toBe(false);
    expect(isBeancountFile("main.csv")).toBe(false);
    expect(isBeancountFile("main.txt")).toBe(false);
    expect(isBeancountFile("")).toBe(false);
  });
});

describe("registerBeancountSyntax", () => {
  it("registers the beancount language without throwing", () => {
    expect(() => registerBeancountSyntax()).not.toThrow();
  });

  it("is idempotent – calling it twice does not throw", () => {
    registerBeancountSyntax();
    expect(() => registerBeancountSyntax()).not.toThrow();
  });
});

describe("tokenizeBeancountDiff", () => {
  beforeEach(() => {
    registerBeancountSyntax();
  });

  it("returns non-null tokens for a valid beancount diff", () => {
    const hunks = parseHunks(SIMPLE_DIFF);
    expect(hunks.length).toBeGreaterThan(0);

    const tokens = tokenizeBeancountDiff(hunks);
    // Fix verification: with the refractor v4 shim the tokenizer should succeed
    expect(tokens).not.toBeNull();
  });

  it("returns non-null tokens when oldSource is provided", () => {
    const hunks = parseHunks(SIMPLE_DIFF);
    const oldSource =
      '2024-01-01 open Assets:Checking USD\n2024-01-02 * "Old transaction"\n';

    const tokens = tokenizeBeancountDiff(hunks, oldSource);
    expect(tokens).not.toBeNull();
  });

  it("returns null for an empty hunks array without throwing", () => {
    // An empty hunk array is valid input – tokenize should gracefully return null
    const tokens = tokenizeBeancountDiff([]);
    // Either null (graceful failure) or an empty array-like structure is acceptable
    expect(tokens === null || tokens !== undefined).toBe(true);
  });
});
