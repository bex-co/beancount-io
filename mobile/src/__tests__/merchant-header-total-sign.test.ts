import fs from "fs";
import path from "path";
import { formatMerchantTotal } from "../screens/merchant-detail-screen/selectors/format-merchant-total";
import { mapMerchantCurrencyTotals } from "../screens/merchant-detail-screen/selectors/merchant-stats";

/**
 * Merchant header totals are signed net Expenses/Income sums. Selector tests
 * alone cannot catch a sign stripped after selection, so this covers the
 * presentation helper and pins the header to it.
 */

const SCREEN = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "screens",
    "merchant-detail-screen",
    "merchant-detail-screen.tsx",
  ),
  "utf8",
);

describe("merchant header totals keep their direction", () => {
  it("keeps the minus on a negative symbol currency (Stock / Broker)", () => {
    expect(formatMerchantTotal({ currency: "USD", total: -2104.35 })).toBe(
      "-$2,104.35",
    );
  });

  it("keeps the minus on a symbol-less commodity, labelled by its code", () => {
    expect(formatMerchantTotal({ currency: "VACHR", total: -355 })).toBe(
      "-355.00 VACHR",
    );
  });

  it("shows positive totals without a plus (Cafe Modagor)", () => {
    expect(formatMerchantTotal({ currency: "USD", total: 1535.16 })).toBe(
      "$1,535.16",
    );
    expect(formatMerchantTotal({ currency: "IRAUSD", total: 54500 })).toBe(
      "54,500.00 IRAUSD",
    );
  });

  it("leaves zero and sub-cent residue unsigned", () => {
    expect(formatMerchantTotal({ currency: "USD", total: 0 })).toBe("$0.00");
    expect(formatMerchantTotal({ currency: "USD", total: -0.001 })).toBe(
      "$0.00",
    );
    expect(formatMerchantTotal({ currency: "MSEK", total: -0 })).toBe(
      "0.00 MSEK",
    );
  });

  it("keeps mixed currencies as separate signed rows (Example / Hoogle)", () => {
    const rows = mapMerchantCurrencyTotals({
      types: [
        { name: "currency", dtype: "str" },
        { name: "total", dtype: "Decimal" },
      ],
      rows: [
        ["VACHR", "-355"],
        ["USD", "-182014.14"],
        ["IRAUSD", "54500.00"],
      ],
    });
    expect(rows.map(formatMerchantTotal)).toEqual([
      "54,500.00 IRAUSD",
      "-$182,014.14",
      "-355.00 VACHR",
    ]);
  });

  it("renders every header total through the signed helper", () => {
    expect(SCREEN.includes("{formatMerchantTotal(row)}")).toBe(true);
    expect(SCREEN.includes("formatMoneyWithCurrency")).toBe(false);
  });
});
