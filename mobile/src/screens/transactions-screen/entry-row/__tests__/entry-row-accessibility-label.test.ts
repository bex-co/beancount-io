import fs from "fs";
import path from "path";
import { entryRowAccessibilityLabel } from "../entry-row-accessibility-label";

describe("entryRowAccessibilityLabel", () => {
  it("joins name and amount", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Q2 2026 Expenses",
        amountStr: "$26,560,000,000.00",
        isPending: false,
      }),
    ).toBe("Q2 2026 Expenses, $26,560,000,000.00");
  });

  it("includes pending state when flagged", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Coffee",
        amountStr: "-$7.25",
        isPending: true,
      }),
    ).toBe("Coffee, -$7.25, Pending");
  });

  it("omits a missing amount", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Open Assets:Cash",
        amountStr: null,
        isPending: false,
      }),
    ).toBe("Open Assets:Cash");
  });
});

describe("EntryRow accessibility wiring", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "index.tsx"),
    "utf8",
  );

  it("exposes actionable rows as buttons with an explicit label", () => {
    expect(source.includes('accessibilityRole="button"')).toBe(true);
    expect(
      source.includes("accessibilityLabel={entryRowAccessibilityLabel("),
    ).toBe(true);
  });

  it("hides decorative account-type icons from the row announcement", () => {
    expect(
      source.includes('importantForAccessibility="no-hide-descendants"'),
    ).toBe(true);
  });
});
