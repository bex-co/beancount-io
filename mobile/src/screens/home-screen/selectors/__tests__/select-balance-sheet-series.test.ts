import {
  selectNetWorthSeries,
  selectAssetsSeries,
  selectLiabilitiesSeries,
} from "../select-balance-sheet-series";
import { BalanceSheetQuery } from "@/generated-graphql/graphql";

type Point = { date: string; balance: Record<string, number | string> };

function createBalanceSheet(sections: {
  netWorthData?: Point[];
  assetsData?: Point[];
  liabilitiesData?: Point[];
}): BalanceSheetQuery {
  return {
    getLedgerBalanceSheet: {
      netWorthData: [],
      assetsData: [],
      liabilitiesData: [],
      ...sections,
    },
  } as unknown as BalanceSheetQuery;
}

describe("selectNetWorthSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectNetWorthSeries("USD", undefined)).toEqual([]);
  });

  it("returns an empty array when the section is empty", () => {
    expect(selectNetWorthSeries("USD", createBalanceSheet({}))).toEqual([]);
  });

  it("converts points to a series in the active currency", () => {
    const data = createBalanceSheet({
      netWorthData: [
        { date: "2025-01-31", balance: { USD: 1000 } },
        { date: "2025-02-28", balance: { USD: 1500 } },
      ],
    });
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: 1000 },
      { date: "2025-02-28", value: 1500 },
    ]);
  });

  it("keeps one (most recent) point per month, sorted ascending", () => {
    const data = createBalanceSheet({
      netWorthData: [
        { date: "2025-02-10", balance: { USD: 1200 } },
        { date: "2025-02-28", balance: { USD: 1500 } },
        { date: "2025-01-31", balance: { USD: 1000 } },
      ],
    });
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: 1000 },
      { date: "2025-02-28", value: 1500 },
    ]);
  });
});

describe("selectAssetsSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectAssetsSeries("USD", undefined)).toEqual([]);
  });

  it("reads the active currency and coerces string amounts", () => {
    const data = createBalanceSheet({
      assetsData: [
        { date: "2025-03-31", balance: { EUR: "2500.50", USD: 10 } },
      ],
    });
    expect(selectAssetsSeries("EUR", data)).toEqual([
      { date: "2025-03-31", value: 2500.5 },
    ]);
  });
});

describe("selectLiabilitiesSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectLiabilitiesSeries("USD", undefined)).toEqual([]);
  });

  // Beancount keeps liabilities negative; the chart plots them as-is so growing
  // debt trends downward.
  it("keeps liabilities signed (negative)", () => {
    const data = createBalanceSheet({
      liabilitiesData: [
        { date: "2025-01-31", balance: { USD: -4000 } },
        { date: "2025-02-28", balance: { USD: -5000 } },
      ],
    });
    expect(selectLiabilitiesSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: -4000 },
      { date: "2025-02-28", value: -5000 },
    ]);
  });

  it("falls back to USD when the active currency is absent", () => {
    const data = createBalanceSheet({
      liabilitiesData: [{ date: "2025-01-31", balance: { USD: -1200 } }],
    });
    expect(selectLiabilitiesSeries("EUR", data)).toEqual([
      { date: "2025-01-31", value: -1200 },
    ]);
  });
});
