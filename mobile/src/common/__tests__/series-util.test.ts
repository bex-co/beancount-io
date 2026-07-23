import {
  pointsToMonthlySeries,
  filterSeriesByRange,
  filterBalanceSeriesByRange,
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
