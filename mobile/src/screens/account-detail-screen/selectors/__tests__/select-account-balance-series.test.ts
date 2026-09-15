import {
  selectAccountBalanceDisplay,
  selectAccountBalanceSeries,
  selectAccountUnitsSeries,
} from "../select-account-balance-series";
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

describe("selectAccountBalanceDisplay", () => {
  it("decides from the latest point of both reports", () => {
    const atCost = createReport([
      { date: "2017-07-31", balance: { USD: "48000" } },
      { date: "2017-08-14", balance: { USD: "49049.66613" } },
    ]);
    const units = createReport([
      { date: "2017-07-31", balance: { RGAGX: "585" } },
      { date: "2017-08-14", balance: { RGAGX: "597.748" } },
    ]);
    expect(selectAccountBalanceDisplay("USD", atCost, units)).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      cost: 49049.66613,
    });
  });

  it("is an empty money figure before either report arrives", () => {
    expect(selectAccountBalanceDisplay("USD")).toEqual({
      kind: "money",
      value: 0,
      notInTotal: [],
    });
  });
});

describe("selectAccountUnitsSeries", () => {
  it("charts the commodity's units month by month", () => {
    const data = createReport([
      { date: "2017-07-31", balance: { RGAGX: "585" } },
      { date: "2017-08-14", balance: { RGAGX: "597.748" } },
    ]);
    expect(selectAccountUnitsSeries("RGAGX", data)).toEqual([
      { date: "2017-07-31", value: 585 },
      { date: "2017-08-14", value: 597.748 },
    ]);
  });

  it("reads a month without the commodity as zero, never its cash", () => {
    const data = createReport([{ date: "2017-01-31", balance: { USD: 250 } }]);
    expect(selectAccountUnitsSeries("RGAGX", data)).toEqual([
      { date: "2017-01-31", value: 0 },
    ]);
    // The money series keeps its USD fallback.
    expect(selectAccountBalanceSeries("EUR", data)[0].value).toBe(250);
  });
});
