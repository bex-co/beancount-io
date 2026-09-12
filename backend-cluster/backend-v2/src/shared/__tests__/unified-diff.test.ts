import { unifiedDiff } from "@/shared/unified-diff";

describe("unifiedDiff", () => {
  it("renders a creation as all additions", () => {
    expect(unifiedDiff("new.bean", null, "a\nb\n")).toBe(
      "--- a/new.bean\n+++ b/new.bean\n@@ -0,0 +1,3 @@\n+a\n+b\n+\n",
    );
  });

  it("renders a deletion as all removals", () => {
    expect(unifiedDiff("old.bean", "a\nb", null)).toBe(
      "--- a/old.bean\n+++ b/old.bean\n@@ -1,2 +0,0 @@\n-a\n-b\n",
    );
  });

  it("renders a one-line change with context and hunk header", () => {
    const before = ["1", "2", "3", "4", "5", "6", "7"].join("\n");
    const after = ["1", "2", "3", "FOUR", "5", "6", "7"].join("\n");
    expect(unifiedDiff("main.bean", before, after)).toBe(
      "--- a/main.bean\n" +
        "+++ b/main.bean\n" +
        "@@ -1,7 +1,7 @@\n" +
        " 1\n 2\n 3\n-4\n+FOUR\n 5\n 6\n 7\n",
    );
  });

  it("returns an empty string when nothing changed", () => {
    expect(unifiedDiff("same.bean", "a\nb", "a\nb")).toBe("");
  });

  it("splits distant changes into separate hunks", () => {
    const before = Array.from({ length: 20 }, (_, i) => `line${i}`).join("\n");
    const afterLines = before.split("\n");
    afterLines[1] = "CHANGED-ONE";
    afterLines[18] = "CHANGED-TWO";
    const diff = unifiedDiff("big.bean", before, afterLines.join("\n"));
    expect(diff.match(/@@/g)).toHaveLength(4); // two headers × "@@" pairs
    expect(diff).toContain("-line1\n+CHANGED-ONE");
    expect(diff).toContain("-line18\n+CHANGED-TWO");
  });

  it("falls back gracefully on oversized inputs", () => {
    const big = Array.from({ length: 11_000 }, () => "x").join("\n");
    expect(unifiedDiff("big.bean", big, `${big}\ny`)).toContain(
      "too large to preview",
    );
  });
});
