import {
  buildMerchantDailyMetaBql,
  buildMerchantDailyTotalsBql,
  buildMerchantDailyWeightsBql,
  composeMerchantStats,
  mapMerchantDailyMeta,
  mapMerchantDailyTotals,
  splitMerchantMeta,
  splitMerchantTotals,
} from "../screens/merchant-detail-screen/selectors/merchant-stats";

// w21/918: a statement carrying today's date changed its cache key every day,
// so a merchant opened offline the next day showed its load error over cached rows.
describe("the merchant header's statements", () => {
  it("name no day, so they read the same tomorrow", () => {
    for (const bql of [
      buildMerchantDailyMetaBql("Blue Bottle"),
      buildMerchantDailyTotalsBql("Blue Bottle"),
      buildMerchantDailyWeightsBql("Blue Bottle"),
    ]) {
      expect(/\d{4}-\d{2}-\d{2}/.test(bql)).toBe(false);
      expect(bql.includes("GROUP BY date")).toBe(true);
    }
  });
});

describe("splitting the daily rows at today", () => {
  const table = (types: string[], rows: unknown[][]) => ({
    types: types.map((name) => ({ name, type: "str" })),
    rows,
  });
  const today = "2026-10-23";

  it("counts what was paid apart from what is pre-entered, as two statements did", () => {
    const days = mapMerchantDailyMeta(
      table(
        ["date", "transaction_count"],
        [
          ["2026-10-05", 2],
          ["2026-10-23", 1],
          ["2026-11-02", 1],
        ],
      ) as never,
    );
    const { paid, scheduled } = splitMerchantMeta(days, today);
    expect(paid).toEqual({
      transactionCount: 3,
      firstDate: "2026-10-05",
      lastDate: "2026-10-23",
    });
    expect(scheduled).toEqual({
      transactionCount: 1,
      firstDate: "2026-11-02",
      lastDate: "2026-11-02",
    });
  });

  it("totals each currency on either side of today", () => {
    const days = mapMerchantDailyTotals(
      table(
        ["date", "currency", "total"],
        [
          ["2026-10-05", "USD", "12.00"],
          ["2026-10-06", "USD", "3.00"],
          ["2026-11-02", "EUR", "4.00"],
        ],
      ) as never,
    );
    expect(splitMerchantTotals(days, today)).toEqual({
      paid: [{ currency: "USD", total: 15 }],
      scheduled: [{ currency: "EUR", total: 4 }],
    });
  });

  it("composes the same header from them", () => {
    const meta = splitMerchantMeta(
      [
        { date: "2026-10-05", count: 1 },
        { date: "2026-11-02", count: 1 },
      ],
      today,
    );
    const stats = composeMerchantStats(meta.paid, [], {
      meta: meta.scheduled,
      totals: [],
    });
    expect(stats?.transactionCount).toBe(1);
    expect(stats?.lastDate).toBe("2026-11-02");
  });

  it("has no stats from a failed read", () => {
    expect(splitMerchantMeta(null, today)).toEqual({
      paid: null,
      scheduled: null,
    });
  });
});
