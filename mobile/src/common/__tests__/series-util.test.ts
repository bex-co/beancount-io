import {
  pointsToMonthlySeries,
  filterSeriesByRange,
  filterBalanceSeriesByRange,
  balanceSeriesBaseline,
  rangeStartMonth,
  alignMonthlySeries,
  DateBalancePoint,
  SeriesPoint,
} from "../series-util";

describe("pointsToMonthlySeries", () => {
  it("returns an empty array for null/undefined input", () => {
    expect(pointsToMonthlySeries("USD", undefined)).toEqual([]);
    expect(pointsToMonthlySeries("USD", null)).toEqual([]);
    expect(pointsToMonthlySeries("USD", [])).toEqual([]);
  });

  it("converts points in the active currency, ascending by date", () => {
    const points: DateBalancePoint[] = [
      { date: "2025-03-01", balance: { USD: 1250 } },
      { date: "2025-01-01", balance: { USD: 1000 } },
      { date: "2025-02-01", balance: { USD: 1100 } },
    ];
    expect(pointsToMonthlySeries("USD", points)).toEqual([
      { date: "2025-01-01", value: 1000 },
      { date: "2025-02-01", value: 1100 },
      { date: "2025-03-01", value: 1250 },
    ]);
  });

  it("deduplicates by month, keeping the most recent entry", () => {
    const points: DateBalancePoint[] = [
      { date: "2025-01-01", balance: { USD: 1000 } },
      { date: "2025-01-15", balance: { USD: 1100 } },
      { date: "2025-01-30", balance: { USD: 1200 } },
      { date: "2025-02-01", balance: { USD: 1300 } },
    ];
    expect(pointsToMonthlySeries("USD", points)).toEqual([
      { date: "2025-01-30", value: 1200 },
      { date: "2025-02-01", value: 1300 },
    ]);
  });

  it("preserves negative balances (net worth / liabilities can be negative)", () => {
    const points: DateBalancePoint[] = [
      { date: "2025-01-01", balance: { USD: -500.25 } },
    ];
    expect(pointsToMonthlySeries("USD", points)).toEqual([
      { date: "2025-01-01", value: -500.25 },
    ]);
  });

  it("parses string amounts and falls back to USD when the currency is absent", () => {
    const points: DateBalancePoint[] = [
      { date: "2025-01-01", balance: { EUR: "1500.50" } },
      { date: "2025-02-01", balance: { USD: 900 } },
    ];
    // Active currency EUR: first point matches EUR; second falls back to USD.
    expect(pointsToMonthlySeries("EUR", points)).toEqual([
      { date: "2025-01-01", value: 1500.5 },
      { date: "2025-02-01", value: 900 },
    ]);
  });

  it("treats a missing currency with no USD fallback as zero", () => {
    const points: DateBalancePoint[] = [
      { date: "2025-01-01", balance: { EUR: 900 } },
    ];
    expect(pointsToMonthlySeries("USD", points)).toEqual([
      { date: "2025-01-01", value: 0 },
    ]);
  });

  it("skips points without a date", () => {
    const points = [
      { date: "", balance: { USD: 5 } },
      { date: "2025-01-01", balance: { USD: 10 } },
    ] as DateBalancePoint[];
    expect(pointsToMonthlySeries("USD", points)).toEqual([
      { date: "2025-01-01", value: 10 },
    ]);
  });
});

describe("filterBalanceSeriesByRange", () => {
  // Monthly series: one point per month, ascending.
  const monthly: SeriesPoint[] = [
    { date: "2025-04-30", value: 100 },
    { date: "2025-05-31", value: 200 },
    { date: "2025-06-30", value: 300 },
    { date: "2025-07-31", value: 400 },
  ];

  it("borrows the preceding point when the window holds a single month", () => {
    // "1M" anchors on the latest month, so plain filtering yields one point.
    expect(filterSeriesByRange(monthly, "1M").length).toBe(1);
    expect(filterBalanceSeriesByRange(monthly, "1M")).toEqual([
      { date: "2025-06-30", value: 300 },
      { date: "2025-07-31", value: 400 },
    ]);
  });

  it("matches filterSeriesByRange once the window already has two points", () => {
    expect(filterBalanceSeriesByRange(monthly, "3M")).toEqual(
      filterSeriesByRange(monthly, "3M"),
    );
    expect(filterBalanceSeriesByRange(monthly, "ALL")).toEqual(monthly);
  });

  it("returns the single point when there is nothing earlier to borrow", () => {
    const oneMonth: SeriesPoint[] = [{ date: "2025-07-31", value: 400 }];
    expect(filterBalanceSeriesByRange(oneMonth, "1M")).toEqual(oneMonth);
    expect(filterBalanceSeriesByRange(oneMonth, "ALL")).toEqual(oneMonth);
  });

  it("returns an empty array for an empty series", () => {
    expect(filterBalanceSeriesByRange([], "1M")).toEqual([]);
    expect(filterBalanceSeriesByRange([], "ALL")).toEqual([]);
  });
});

describe("balanceSeriesBaseline", () => {
  // An account dormant until August, overdrawn, then funded in September.
  const dormantThenFunded: SeriesPoint[] = [
    { date: "2026-08-31", value: -1512.42 },
    { date: "2026-09-30", value: 5317.06 },
  ];

  it("starts from zero when the window opens before the first point", () => {
    expect(balanceSeriesBaseline(dormantThenFunded, "6M", 2026)).toBe(0);
    expect(balanceSeriesBaseline(dormantThenFunded, "ALL", 2026)).toBe(0);
    expect(balanceSeriesBaseline(dormantThenFunded, "YTD", 2026)).toBe(0);
  });

  it("starts from the closing balance of the month before the window", () => {
    const monthly: SeriesPoint[] = [
      { date: "2025-04-30", value: 100 },
      { date: "2025-05-31", value: 200 },
      { date: "2025-06-30", value: 300 },
      { date: "2025-07-31", value: 400 },
    ];
    expect(balanceSeriesBaseline(monthly, "3M", 2025)).toBe(100);
    // The same point a one-month window borrows to draw its line.
    expect(balanceSeriesBaseline(monthly, "1M", 2025)).toBe(300);
    expect(filterBalanceSeriesByRange(monthly, "1M", 2025)[0].value).toBe(300);
  });

  it("holds a stale series' YTD at its last balance, a change of zero", () => {
    const stale: SeriesPoint[] = [
      { date: "2017-08-31", value: 5884.67 },
      { date: "2017-09-30", value: 2754.06 },
    ];
    expect(balanceSeriesBaseline(stale, "YTD", 2026)).toBe(2754.06);
  });

  it("is zero for an empty series", () => {
    expect(balanceSeriesBaseline([], "6M", 2026)).toBe(0);
  });
});

describe("rangeStartMonth", () => {
  it("anchors YTD to the current year, even when the latest point is older", () => {
    expect(rangeStartMonth("YTD", "2017-09", 2026)).toBe("2026-01");
    expect(rangeStartMonth("YTD", "2026-07", 2026)).toBe("2026-01");
  });

  it("keeps the rolling ranges anchored to the reference month", () => {
    expect(rangeStartMonth("6M", "2017-09", 2026)).toBe("2017-04");
    expect(rangeStartMonth("1Y", "2017-09", 2026)).toBe("2016-10");
    expect(rangeStartMonth("ALL", "2017-09", 2026)).toBe("");
  });
});

describe("YTD over a series that ended in an earlier year", () => {
  const stale: SeriesPoint[] = [
    { date: "2017-08-31", value: 5884.67 },
    { date: "2017-09-30", value: 2754.06 },
  ];

  it("charts no year-to-date flow", () => {
    expect(filterSeriesByRange(stale, "YTD", 2026)).toEqual([]);
  });

  it("holds the balance flat at its last point, so the change is zero", () => {
    expect(filterBalanceSeriesByRange(stale, "YTD", 2026)).toEqual([
      { date: "2017-09-30", value: 2754.06 },
    ]);
  });

  it("leaves a current-year series' YTD unchanged", () => {
    const current: SeriesPoint[] = [
      { date: "2025-12-31", value: 10 },
      { date: "2026-01-31", value: 20 },
      { date: "2026-02-28", value: 30 },
    ];
    expect(filterSeriesByRange(current, "YTD", 2026)).toEqual(current.slice(1));
  });
});

describe("alignMonthlySeries", () => {
  it("returns empty arrays when all series are empty", () => {
    expect(alignMonthlySeries({ income: [], expense: [], net: [] })).toEqual({
      months: [],
      income: [],
      expense: [],
      net: [],
    });
  });

  it("unions months, sorts ascending, and 0-fills missing months", () => {
    // income has May+Jul, expense has Jun, net has Jul only.
    const income: SeriesPoint[] = [
      { date: "2026-05-31", value: 100 },
      { date: "2026-07-31", value: 300 },
    ];
    const expense: SeriesPoint[] = [{ date: "2026-06-30", value: 50 }];
    const net: SeriesPoint[] = [{ date: "2026-07-31", value: 250 }];
    expect(alignMonthlySeries({ income, expense, net })).toEqual({
      months: ["2026-05", "2026-06", "2026-07"],
      income: [100, 0, 300],
      expense: [0, 50, 0],
      net: [0, 0, 250],
    });
  });

  it("keeps a distinct column per month across a year boundary", () => {
    // A span crossing New Year: two Julys must not collapse.
    const income: SeriesPoint[] = [
      { date: "2025-07-31", value: 10 },
      { date: "2026-07-31", value: 30 },
    ];
    const net: SeriesPoint[] = [
      { date: "2025-07-31", value: 5 },
      { date: "2026-07-31", value: 15 },
    ];
    expect(alignMonthlySeries({ income, expense: [], net })).toEqual({
      months: ["2025-07", "2026-07"],
      income: [10, 30],
      expense: [0, 0],
      net: [5, 15],
    });
  });

  it("keeps signed net values (a loss month stays negative)", () => {
    const net: SeriesPoint[] = [
      { date: "2026-01-31", value: -40 },
      { date: "2026-02-28", value: 20 },
    ];
    const income: SeriesPoint[] = [{ date: "2026-02-28", value: 20 }];
    expect(alignMonthlySeries({ income, expense: [], net })).toEqual({
      months: ["2026-01", "2026-02"],
      income: [0, 20],
      expense: [0, 0],
      net: [-40, 20],
    });
  });
});
