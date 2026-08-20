import {
  buildMerchantCurrencyTotalsBql,
  buildMerchantMetaBql,
  composeMerchantStats,
  mapMerchantCurrencyTotals,
  mapMerchantMeta,
} from "../screens/merchant-detail-screen/selectors/merchant-stats";
import type { QueryResultTableLike } from "../screens/merchants-screen/selectors/aggregate-payees";

function table(
  types: { name: string; dtype: string }[],
  rows: unknown[][],
): QueryResultTableLike {
  return { types, rows };
}

describe("buildMerchantMetaBql / buildMerchantCurrencyTotalsBql", () => {
  it("interpolates an escaped payee literal into fixed statements", () => {
    const meta = buildMerchantMetaBql('He said "hi"');
    expect(meta.includes('payee = "He said \\"hi\\""')).toBe(true);
    expect(meta.includes("transaction_count")).toBe(true);

    const totals = buildMerchantCurrencyTotalsBql("O'Brien");
    expect(totals.includes('payee = "O\'Brien"')).toBe(true);
    expect(totals.includes("account ~ '^Expenses'")).toBe(true);
    expect(totals.includes("GROUP BY currency")).toBe(true);
  });
});

describe("mapMerchantMeta", () => {
  const types = [
    { name: "transaction_count", dtype: "int" },
    { name: "first_date", dtype: "date" },
    { name: "last_date", dtype: "date" },
  ];

  it("maps the single meta row", () => {
    expect(
      mapMerchantMeta(table(types, [[32, "2022-12-31", "2025-12-31"]])),
    ).toEqual({
      transactionCount: 32,
      firstDate: "2022-12-31",
      lastDate: "2025-12-31",
    });
  });

  it("fails soft on missing columns or empty tables", () => {
    expect(mapMerchantMeta(null)).toBe(null);
    expect(mapMerchantMeta(table(types, []))).toBe(null);
    expect(
      mapMerchantMeta(
        table([{ name: "transaction_count", dtype: "int" }], [[32]]),
      ),
    ).toBe(null);
  });
});

describe("mapMerchantCurrencyTotals", () => {
  const types = [
    { name: "currency", dtype: "str" },
    { name: "total", dtype: "Decimal" },
  ];

  it("maps and sorts per-currency totals without summing across them", () => {
    expect(
      mapMerchantCurrencyTotals(
        table(types, [
          ["USD", "-120.5"],
          ["EUR", "40"],
        ]),
      ),
    ).toEqual([
      { currency: "EUR", total: 40 },
      { currency: "USD", total: -120.5 },
    ]);
  });

  it("skips bad rows and fails soft", () => {
    expect(mapMerchantCurrencyTotals(null)).toEqual([]);
    expect(
      mapMerchantCurrencyTotals(
        table(types, [
          [null, "10"],
          ["USD", "nope"],
          ["JPY", "3"],
        ]),
      ),
    ).toEqual([{ currency: "JPY", total: 3 }]);
  });
});

describe("composeMerchantStats", () => {
  it("returns null without meta, otherwise attaches currency totals", () => {
    expect(composeMerchantStats(null, [{ currency: "USD", total: 1 }])).toBe(
      null,
    );
    expect(
      composeMerchantStats(
        {
          transactionCount: 2,
          firstDate: "2024-01-01",
          lastDate: "2024-02-01",
        },
        [{ currency: "USD", total: -10 }],
      ),
    ).toEqual({
      transactionCount: 2,
      firstDate: "2024-01-01",
      lastDate: "2024-02-01",
      totalsByCurrency: [{ currency: "USD", total: -10 }],
    });
  });
});
