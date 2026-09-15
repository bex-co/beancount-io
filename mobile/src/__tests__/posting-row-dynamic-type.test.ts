import fs from "fs";
import path from "path";

/**
 * Static guardrail: Money flow postings stay identifiable at accessibility
 * text sizes. The unit runner cannot lay out text, so this checks the wiring
 * that restacks PostingRow above the shared `prefersStackedLayout` threshold
 * and keeps its short direction label from breaking mid-word.
 */
const SOURCE = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "screens/transaction-detail-screen/components/posting-row.tsx",
  ),
  "utf8",
);

describe("PostingRow at enlarged text sizes", () => {
  it("stacks the row above the shared Dynamic Type threshold", () => {
    expect(SOURCE.includes("prefersStackedLayout(fontScale)")).toBe(true);
    expect(SOURCE.includes("stacked && styles.rowStacked")).toBe(true);
    expect(SOURCE.includes("stacked && styles.accountColumnStacked")).toBe(
      true,
    );
  });

  it("never breaks the direction label inside a word", () => {
    expect(
      SOURCE.includes("<Text style={styles.direction} numberOfLines={1}>"),
    ).toBe(true);
  });

  it("keeps the middle ellipsis that shows an account's root and leaf", () => {
    expect(SOURCE.includes('numberOfLines={1} ellipsizeMode="middle"')).toBe(
      true,
    );
  });

  it("never truncates the amount", () => {
    const start = SOURCE.indexOf("const amount = (");
    const amount = SOURCE.slice(start, SOURCE.indexOf(");", start));
    expect(start === -1).toBe(false);
    expect(amount.includes("numberOfLines")).toBe(false);
    expect(amount.includes("ellipsizeMode")).toBe(false);
  });

  it("still names the posting in full for screen readers, with or without a direction", () => {
    expect(SOURCE.includes("${posting.account}, ${posting.amount}")).toBe(true);
    expect(SOURCE.includes("{directionLabel ? (")).toBe(true);
  });
});
