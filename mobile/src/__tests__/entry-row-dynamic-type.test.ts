import fs from "fs";
import path from "path";

/**
 * Static guardrail: transaction rows stay identifiable at accessibility text
 * sizes. The unit runner cannot lay out text, so this checks the wiring that
 * makes EntryRow (and its loading skeleton) restack above the shared
 * `prefersStackedLayout` threshold instead of cutting the payee to "Q2…" beside
 * a 19-character amount. The threshold itself is covered by
 * `dynamic-type.test.ts`.
 */

const SRC_ROOT = path.join(__dirname, "..");
const read = (file: string) =>
  fs.readFileSync(path.join(SRC_ROOT, file), "utf8");

const ENTRY_ROW = read("screens/transactions-screen/entry-row/index.tsx");
const SKELETON = read(
  "screens/transactions-screen/transactions-list-skeleton.tsx",
);

const count = (source: string, needle: string) =>
  source.split(needle).length - 1;

describe("EntryRow at enlarged text sizes", () => {
  it("decides the layout from the shared Dynamic Type threshold", () => {
    expect(ENTRY_ROW.includes("prefersStackedLayout(fontScale)")).toBe(true);
    expect(count(ENTRY_ROW, "stacked && styles.rowStacked")).toBe(2);
  });

  it("lets the payee wrap once the row is stacked", () => {
    expect(ENTRY_ROW.includes("numberOfLines={stacked ? undefined : 1}")).toBe(
      true,
    );
    expect(
      ENTRY_ROW.includes("<Text style={styles.name} numberOfLines={1}>"),
    ).toBe(false);
  });

  it("moves the amount under the name without truncating it", () => {
    const start = ENTRY_ROW.indexOf("const content = (");
    const amountBlock = ENTRY_ROW.slice(
      start,
      ENTRY_ROW.indexOf("if (onPress)"),
    );
    expect(start === -1).toBe(false);
    expect(count(amountBlock, "stacked && styles.amountStacked")).toBe(2);
    expect(amountBlock.includes("numberOfLines")).toBe(false);
    expect(amountBlock.includes("ellipsizeMode")).toBe(false);
  });

  it("restacks the loading skeleton the same way so the list does not jump", () => {
    expect(SKELETON.includes("prefersStackedLayout(fontScale)")).toBe(true);
    expect(SKELETON.includes("stacked && styles.rowStacked")).toBe(true);
    expect(SKELETON.includes("stacked && styles.amountTileStacked")).toBe(true);
  });
});
