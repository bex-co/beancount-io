import fs from "fs";
import path from "path";
import {
  buildMerchantWeightTotalsBql,
  mapMerchantCurrencyTotals,
  pricedTotals,
} from "../screens/merchant-detail-screen/selectors/merchant-stats";
import { formatMerchantTotals } from "../screens/merchant-detail-screen/selectors/format-merchant-total";

/**
 * w21/725: a merchant paid in euros by a dollar card read "€150.00" over rows
 * of −$110.00 and −$55.00. The header keeps the Expenses net (w2/041) and says
 * what the rows add up to, at the rates the entries recorded.
 */
const table = (rows: [string, string][]) => ({
  types: [
    { name: "currency", dtype: "str" },
    { name: "total", dtype: "Decimal" },
  ],
  rows,
});

describe("a merchant whose legs were priced into another currency", () => {
  it("asks for the legs' totals by weight, by currency", () => {
    const bql = buildMerchantWeightTotalsBql("Paris Cafe");
    expect(
      bql.startsWith(
        "SELECT currency(weight) as currency, sum(number(weight)) as total ",
      ),
    ).toBe(true);
    expect(bql.includes("GROUP BY currency(weight)")).toBe(true);
    expect(bql.includes("account ~ '^Expenses'")).toBe(true);
  });

  it("shows the rows' total beside the euro one", () => {
    // The engine's rows for the note's fixture.
    const units = mapMerchantCurrencyTotals(table([["EUR", "150.00"]]));
    const weights = mapMerchantCurrencyTotals(table([["USD", "165.0000"]]));
    expect(formatMerchantTotals(pricedTotals(units, weights), "USD")).toEqual([
      "$165.00",
    ]);
  });

  it("adds nothing when no leg was priced into another currency", () => {
    const same = mapMerchantCurrencyTotals(
      table([
        ["EUR", "40.00"],
        ["USD", "12.50"],
      ]),
    );
    expect(pricedTotals(same, [...same].reverse())).toEqual([]);
    expect(pricedTotals([], [])).toEqual([]);
  });

  it("is a line under the header's totals", () => {
    const screen = fs
      .readFileSync(
        path.join(
          __dirname,
          "../screens/merchant-detail-screen/merchant-detail-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes("query:weightsBql")).toBe(true);
    expect(
      screen.includes('t("merchantTotalAtRates",{amount:isolateLtr(line)})'),
    ).toBe(true);
  });
});
