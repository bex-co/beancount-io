import {
  selectNetWorthSeries,
  filterSeriesByRange,
  seriesToChartArray,
  SeriesPoint,
} from "../select-net-worth-series";
import { HomeChartsQuery } from "@/generated-graphql/graphql";

function createHomeCharts(
  points: Array<{ date: string; balance: Record<string, number | string> }>,
  label = "Net Worth",
): HomeChartsQuery {
  return {
    homeCharts: {
      success: true,
      data: [{ type: "line", label, data: points }],
    },
  } as unknown as HomeChartsQuery;
}

describe("selectNetWorthSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectNetWorthSeries("USD", undefined)).toEqual([]);
  });

  it("returns an empty array when the Net Worth label is missing", () => {
    const data = createHomeCharts(
      [{ date: "2025-01-01", balance: { USD: 100 } }],
      "Net Profit",
    );
    expect(selectNetWorthSeries("USD", data)).toEqual([]);
  });

  it("extracts values in the active currency, sorted ascending", () => {
    const data = createHomeCharts([
      { date: "2025-01-01", balance: { USD: 1000 } },
      { date: "2025-02-01", balance: { USD: 1100 } },
      { date: "2025-03-01", balance: { USD: 1250 } },
    ]);
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-01", value: 1000 },
      { date: "2025-02-01", value: 1100 },
      { date: "2025-03-01", value: 1250 },
    ]);
  });

  it("deduplicates by month, keeping the most recent entry", () => {
    const data = createHomeCharts([
      { date: "2025-01-01", balance: { USD: 1000 } },
      { date: "2025-01-15", balance: { USD: 1100 } },
      { date: "2025-01-30", balance: { USD: 1200 } },
      { date: "2025-02-01", balance: { USD: 1300 } },
    ]);
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-30", value: 1200 },
      { date: "2025-02-01", value: 1300 },
    ]);
  });

  it("parses string balances and treats missing currency as zero", () => {
    const data = createHomeCharts([
      { date: "2025-01-01", balance: { USD: "1500.50" } },
      { date: "2025-02-01", balance: { EUR: 900 } },
    ]);
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-01", value: 1500.5 },
      { date: "2025-02-01", value: 0 },
    ]);
  });
});

describe("filterSeriesByRange", () => {
  const series: SeriesPoint[] = [
    { date: "2025-01-01", value: 1 },
    { date: "2025-02-01", value: 2 },
    { date: "2025-03-01", value: 3 },
    { date: "2025-04-01", value: 4 },
    { date: "2025-05-01", value: 5 },
    { date: "2025-06-01", value: 6 },
    { date: "2025-07-01", value: 7 },
    { date: "2025-08-01", value: 8 },
    { date: "2025-09-01", value: 9 },
    { date: "2025-10-01", value: 10 },
    { date: "2025-11-01", value: 11 },
    { date: "2025-12-01", value: 12 },
  ];

  it("returns everything for ALL", () => {
    expect(filterSeriesByRange(series, "ALL").length).toBe(12);
  });

  it("returns an empty series unchanged", () => {
    expect(filterSeriesByRange([], "3M")).toEqual([]);
  });

  it("keeps only the latest month for 1M", () => {
    expect(filterSeriesByRange(series, "1M").map((p) => p.date)).toEqual([
      "2025-12-01",
    ]);
  });

  it("keeps the current calendar year for YTD (anchored to the latest point)", () => {
    // Series spans two years; YTD keeps Jan–latest of the latest point's year.
    const acrossYears: SeriesPoint[] = [
      { date: "2024-10-01", value: 1 },
      { date: "2024-11-01", value: 2 },
      { date: "2024-12-01", value: 3 },
      { date: "2025-01-01", value: 4 },
      { date: "2025-02-01", value: 5 },
      { date: "2025-03-01", value: 6 },
    ];
    expect(filterSeriesByRange(acrossYears, "YTD").map((p) => p.date)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
    ]);
  });

  it("keeps the last 3 months for 3M (anchored to the latest point)", () => {
    const result = filterSeriesByRange(series, "3M");
    expect(result.map((p) => p.date)).toEqual([
      "2025-10-01",
      "2025-11-01",
      "2025-12-01",
    ]);
  });

  it("keeps the last 6 months for 6M", () => {
    expect(filterSeriesByRange(series, "6M").length).toBe(6);
    expect(filterSeriesByRange(series, "6M")[0].date).toBe("2025-07-01");
  });

  it("keeps the last 12 months for 1Y", () => {
    expect(filterSeriesByRange(series, "1Y").length).toBe(12);
  });

  it("anchors the window to the latest data point, not today", () => {
    // Latest point is Dec 2025; 3M must include Oct–Dec 2025 regardless of the
    // real current date.
    const stale: SeriesPoint[] = [
      { date: "2025-08-01", value: 1 },
      { date: "2025-09-01", value: 2 },
      { date: "2025-10-01", value: 3 },
      { date: "2025-11-01", value: 4 },
      { date: "2025-12-01", value: 5 },
    ];
    expect(filterSeriesByRange(stale, "3M").map((p) => p.date)).toEqual([
      "2025-10-01",
      "2025-11-01",
      "2025-12-01",
    ]);
  });

  it("steps the year back at the January boundary (month underflow)", () => {
    const acrossYear: SeriesPoint[] = [
      { date: "2025-10-01", value: 1 },
      { date: "2025-11-01", value: 2 },
      { date: "2025-12-01", value: 3 },
      { date: "2026-01-01", value: 4 },
    ];
    // 3M anchored to Jan 2026 → Nov 2025, Dec 2025, Jan 2026
    expect(filterSeriesByRange(acrossYear, "3M").map((p) => p.date)).toEqual([
      "2025-11-01",
      "2025-12-01",
      "2026-01-01",
    ]);
  });

  it("handles a range wider than the available history", () => {
    const short: SeriesPoint[] = [
      { date: "2025-11-01", value: 1 },
      { date: "2025-12-01", value: 2 },
    ];
    expect(filterSeriesByRange(short, "1Y")).toEqual(short);
  });
});

describe("seriesToChartArray", () => {
  it("returns the empty placeholder for an empty series", () => {
    expect(seriesToChartArray([], "No data")).toEqual({
      labels: ["No data"],
      numbers: [0],
    });
  });

  it("maps month labels and values", () => {
    const result = seriesToChartArray(
      [
        { date: "2025-05-01", value: 500 },
        { date: "2025-06-01", value: 600 },
      ],
      "No data",
    );
    expect(result.labels).toEqual(["05", "06"]);
    expect(result.numbers).toEqual([500, 600]);
  });
});
