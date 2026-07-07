import { pointsToMonthlySeries, DateBalancePoint } from "../series-util";

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
