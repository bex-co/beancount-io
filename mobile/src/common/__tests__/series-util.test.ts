import {
  pointsToMonthlySeries,
  filterSeriesByRange,
  filterBalanceSeriesByRange,
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
