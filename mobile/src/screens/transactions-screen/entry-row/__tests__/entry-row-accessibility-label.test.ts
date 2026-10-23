import fs from "fs";
import path from "path";
import { entryRowAccessibilityLabel } from "../entry-row-accessibility-label";

describe("entryRowAccessibilityLabel", () => {
  it("joins name and amount", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Q2 2026 Expenses",
        secondary: null,
        amountStr: "$26,560,000,000.00",
        flagLabel: null,
      }),
    ).toBe("Q2 2026 Expenses, $26,560,000,000.00");
  });

  it("includes the flag badge's word, pending or forecast", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Coffee",
        secondary: null,
        amountStr: "-$7.25",
        flagLabel: "Offen",
      }),
    ).toBe("Coffee, -$7.25, Offen");
  });

  // w21/140: rows told apart only by their narration line sounded the same.
  it("reads the narration line under the payee", () => {
    const label = (secondary: string) =>
      entryRowAccessibilityLabel({
        name: "Grocer",
        secondary,
        amountStr: "-$12.00",
        flagLabel: null,
      });
    expect(label("Weekly shop")).toBe("Grocer, Weekly shop, -$12.00");
    expect(label("Weekly shop") === label("Party snacks")).toBe(false);
  });

  it("omits a missing amount", () => {
    expect(
      entryRowAccessibilityLabel({
        name: "Open Assets:Cash",
        secondary: null,
        amountStr: null,
        flagLabel: null,
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

  it("passes the narration line and the translated Pending", () => {
    expect(source.includes("          secondary,\n")).toBe(true);
    expect(source.includes("          flagLabel,\n")).toBe(true);
    expect(source.includes('badge?.kind === "pending" ? t("pending")')).toBe(
      true,
    );
  });

  it("hides decorative account-type icons from the row announcement", () => {
    expect(
      source.includes('importantForAccessibility="no-hide-descendants"'),
    ).toBe(true);
  });
});
