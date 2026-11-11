import fs from "fs";
import path from "path";
import { prefersStackedLayout } from "../../../../common/theme/dynamic-type";

/**
 * At AX2 a Budget card's account shared its row with Update Budget and was
 * middle-ellipsized to "Ex…ing" / "Ex…ries" (w21/027). From the shared stacking
 * threshold the account takes its own lines, head-ellipsized so the leaf
 * survives, and Update Budget moves under it. Checked on the source: the card
 * runs queries the unit runner cannot execute.
 */
const source = fs.readFileSync(
  path.join(__dirname, "..", "budget-group-card.tsx"),
  "utf8",
);
const block = (name: string) => {
  const start = source.indexOf(`    ${name}: {`);
  return start < 0 ? "" : source.slice(start, source.indexOf("},", start));
};

describe("Budget card title at large text sizes", () => {
  it("stacks from the shared threshold, which AX2 crosses", () => {
    expect(
      source.includes("const stacked = prefersStackedLayout(fontScale);"),
    ).toBe(true);
    // AX2 (accessibility-large) is about 2x body text.
    expect(prefersStackedLayout(2)).toBe(true);
    expect(prefersStackedLayout(1)).toBe(false);
  });

  it("gives the account its own lines and keeps its leaf", () => {
    expect(block("titleStacked").includes('flexDirection: "column"')).toBe(
      true,
    );
    expect(
      source.includes("[styles.titleRow, stacked && styles.titleStacked]"),
    ).toBe(true);
    expect(source.includes("numberOfLines={stacked ? 2 : 1}")).toBe(true);
    expect(source.includes('ellipsizeMode={stacked ? "head" : "middle"}')).toBe(
      true,
    );
    // A flex: 1 title would collapse to nothing in the column.
    expect(block("accountStacked").includes("flex: 0")).toBe(true);
  });

  it("moves Update Budget under the account and remeasures live", () => {
    expect(source.includes("stacked && styles.updateButtonStacked")).toBe(true);
    expect(source.includes("key={`account-${fontScale}`}")).toBe(true);
  });
});

/**
 * The stat row is three `flex: 1` columns, a third of the card each. At AX2 a
 * label wider than that ("Abweichung", "Отклонение", "Відхилення") broke by
 * character ("Abweich" / "ung") and pushed its amount a line lower than the
 * other two (w22/034). From the same stacking threshold the stats take a line
 * each, label above amount, so a label has the card's whole width.
 */
describe("Budget card stats at large text sizes", () => {
  it("lays the three stats out as a column from the shared threshold", () => {
    expect(block("statsStacked").includes('flexDirection: "column"')).toBe(
      true,
    );
    expect(
      source.includes(
        "<View style={[styles.stats, stacked && styles.statsStacked]}>",
      ),
    ).toBe(true);
    // Budget, Actual and Variance each get the stacked variant.
    expect(
      source.split(
        "<View style={[styles.stat, stacked && styles.statStacked]}>",
      ).length,
    ).toBe(4);
    // A flex: 1 stat would collapse to nothing in the column.
    expect(block("statStacked").includes("flex: 0")).toBe(true);
  });

  it("keeps three columns at ordinary sizes", () => {
    for (const scale of [1, 1.235, 1.353]) {
      expect(prefersStackedLayout(scale)).toBe(false);
    }
  });
});
