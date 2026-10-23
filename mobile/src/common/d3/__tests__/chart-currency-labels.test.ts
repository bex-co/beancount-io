import fs from "fs";
import path from "path";

/**
 * Static guardrail: chart axes and summaries compose money through
 * `formatShortMoneyWithCurrency`, never by gluing a symbol onto `shortNumber`.
 * That idiom put the sign after the symbol ("$-50") and left a symbol-less
 * commodity as a bare number ("400").
 */
const SRC = path.join(__dirname, "..", "..", "..");
const read = (file: string) => fs.readFileSync(path.join(SRC, file), "utf8");

describe("chart money labels", () => {
  for (const file of [
    "common/d3/bar-chart-d3.tsx",
    "common/d3/scrollable-axis-chart.tsx",
    "common/d3/income-expense-bar-chart.tsx",
    "screens/budget-screen/selectors/budget-labels.ts",
  ]) {
    it(`${file} formats money with its currency code`, () => {
      const source = read(file);
      // Short on an axis; in full where a summary is spoken (w21/821).
      expect(
        /formatShortMoneyWithCurrency\(|formatSignedMoneyWithCurrency\(/.test(
          source,
        ),
      ).toBe(true);
      expect(source.includes("currencySymbol")).toBe(false);
    });
  }

  it("no chart caller passes a bare currency symbol", () => {
    for (const file of [
      "common/d3/budget-bar-chart-d3.tsx",
      "screens/home-screen/components/spending-card.tsx",
      "screens/home-screen/home-screen.tsx",
      "screens/reports-screen/reports-screen.tsx",
      "screens/budget-screen/components/budget-group-card.tsx",
    ]) {
      expect(read(file).includes("currencySymbol")).toBe(false);
    }
  });
});
