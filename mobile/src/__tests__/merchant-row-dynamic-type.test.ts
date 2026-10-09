import fs from "fs";
import path from "path";

/**
 * Static guardrail: a recurring merchant row keeps its whole trailing block
 * readable at accessibility text sizes. Above the shared `prefersStackedLayout`
 * threshold the amount and the next-payment line move under the name; both
 * must then wrap rather than ellipsize — a one-line limit cut "Next Aug 31,
 * 2027" to "Next Aug 31, 20…". The unit runner cannot lay out text, so this
 * checks the props each trailing Text passes. The threshold itself is covered
 * by `dynamic-type.test.ts`.
 */

const ROW = fs.readFileSync(
  path.join(__dirname, "..", "screens", "merchants-screen", "merchant-row.tsx"),
  "utf8",
);

/** The opening `<Text` tag whose style list contains `usage`. */
function textTagUsing(usage: string): string {
  const at = ROW.indexOf(usage);
  const start = at === -1 ? -1 : ROW.lastIndexOf("<Text", at);
  const end = at === -1 ? -1 : ROW.indexOf("\n        >", at);
  if (start === -1 || end === -1) {
    throw new Error(`Text using ${usage} not found`);
  }
  return ROW.slice(start, end);
}

describe("MerchantRow at enlarged text sizes", () => {
  it("decides the layout from the shared Dynamic Type threshold", () => {
    expect(ROW.includes("prefersStackedLayout(fontScale)")).toBe(true);
    expect(ROW.includes("stacked && styles.trailingStacked")).toBe(true);
  });

  it("lets the stacked recurring amount wrap", () => {
    const tag = textTagUsing("stacked && styles.amountStacked");
    expect(tag.includes("numberOfLines={stacked ? undefined : 1}")).toBe(true);
  });

  it("lets the stacked next-payment line wrap so its year stays visible", () => {
    const tag = textTagUsing("stacked && styles.metaStacked");
    expect(tag.includes("trailingOverdue && styles.overdueMeta")).toBe(true);
    expect(tag.includes("numberOfLines={stacked ? undefined : 1}")).toBe(true);
    expect(tag.includes("numberOfLines={1}")).toBe(false);
    expect(tag.includes("ellipsizeMode")).toBe(false);
  });
});
