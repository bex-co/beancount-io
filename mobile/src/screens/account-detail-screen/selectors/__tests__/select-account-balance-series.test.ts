import { selectAccountBalanceSeries } from "../select-account-balance-series";
import { AccountReportQuery } from "@/generated-graphql/graphql";

function createReport(
  linechartData: Array<{
    date: string;
    balance: Record<string, number | string>;
  }>,
): AccountReportQuery {
  return {
    getLedgerAccountReport: { linechartData },
  } as unknown as AccountReportQuery;
}

describe("selectAccountBalanceSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectAccountBalanceSeries("USD", undefined)).toEqual([]);
  });

  it("converts an account's linechart data into a monthly balance series", () => {
    const data = createReport([
      { date: "2025-02-01", balance: { USD: 320 } },
      { date: "2025-01-01", balance: { USD: 300 } },
    ]);
    expect(selectAccountBalanceSeries("USD", data)).toEqual([
      { date: "2025-01-01", value: 300 },
      { date: "2025-02-01", value: 320 },
    ]);
  });
});
