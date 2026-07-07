import { selectNetWorthHeaderSeries } from "../select-net-worth-header";
import { BalanceSheetQuery } from "@/generated-graphql/graphql";

function createBalanceSheet(
  netWorthData: Array<{
    date: string;
    balance: Record<string, number | string>;
  }>,
): BalanceSheetQuery {
  return {
    getLedgerBalanceSheet: { netWorthData },
  } as unknown as BalanceSheetQuery;
}

describe("selectNetWorthHeaderSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectNetWorthHeaderSeries("USD", undefined)).toEqual([]);
  });

  it("returns an empty array when there is no net-worth data", () => {
    expect(selectNetWorthHeaderSeries("USD", createBalanceSheet([]))).toEqual(
      [],
    );
  });

  it("converts net-worth data to a series in the active currency", () => {
    const data = createBalanceSheet([
      { date: "2025-01-01", balance: { USD: 1000 } },
      { date: "2025-02-01", balance: { USD: 1500 } },
    ]);
    expect(selectNetWorthHeaderSeries("USD", data)).toEqual([
      { date: "2025-01-01", value: 1000 },
      { date: "2025-02-01", value: 1500 },
    ]);
  });

  it("handles multi-currency balances and negative net worth", () => {
    const data = createBalanceSheet([
      { date: "2025-01-01", balance: { EUR: -200, USD: 50 } },
    ]);
    // Active currency EUR is present and kept signed.
    expect(selectNetWorthHeaderSeries("EUR", data)).toEqual([
      { date: "2025-01-01", value: -200 },
    ]);
  });
});
