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
  // Assets:US:Vanguard:RGAGX in `open_ledger/example`, whose last change is on
  // 2017-08-14; the ledger's prices run to 2017-09-08.
  const market = createReport([
    { date: "2017-07-31", balance: { USD: "49331.926" } },
    { date: "2017-08-14", balance: { USD: "48656.6872" } },
  ]);
  const units = createReport([
    { date: "2017-07-31", balance: { RGAGX: "585" } },
    { date: "2017-08-14", balance: { RGAGX: "597.748" } },
  ]);
  const prices = [
    {
      base: "RGAGX",
      quote: "USD",
      prices: [{ date: "2017-08-11" }, { date: "2017-09-08" }],
    },
  ];
  const TODAY = "2026-09-26";

  it("values one commodity as its Accounts row does, at the latest price", () => {
    expect(
      selectAccountBalanceDisplay("USD", market, units, prices, TODAY, {
        USD: "48471.38532",
      }),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48471.38532, basis: "market" },
    });
  });

  it("falls back to the report's latest point until the row's read lands", () => {
    expect(
      selectAccountBalanceDisplay("USD", market, units, prices, TODAY),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48656.6872, basis: "market" },
    });
  });

  it("reads a commodity without a price at cost", () => {
    const display = selectAccountBalanceDisplay(
      "USD",
      market,
      units,
      [],
      TODAY,
      { USD: "49049.66613" },
    );
    expect(display.kind === "units" && display.value).toEqual({
      amount: 49049.66613,
      basis: "cost",
    });
  });

  it("dates a money total by its own latest point", () => {
    // Assets:US:Vanguard: two funds and a cent of cash.
    const display = selectAccountBalanceDisplay(
      "USD",
      createReport([{ date: "2017-08-14", balance: { USD: "89045.42238" } }]),
      createReport([
        {
          date: "2017-08-14",
          balance: { USD: "-0.02", RGAGX: "597.748", VBMPX: "193.442" },
        },
      ]),
      [
        ...prices,
        { base: "VBMPX", quote: "USD", prices: [{ date: "2017-08-11" }] },
      ],
      TODAY,
      { USD: "88000" },
    );
    expect(display.kind).toBe("money");
    const valuation = display.kind === "money" ? display.valuation : undefined;
    // The headline is the report's point, so its prices are the ones on or
    // before 2017-08-14 — not the row's figure, which is not the headline.
    expect(display.kind === "money" && display.value).toBe(89045.42238);
    expect(valuation?.priced[0]?.priceDate).toBe("2017-08-11");
    expect(valuation?.priced[0]?.stale).toBe(false);
  });

  it("is an empty money figure before either report arrives", () => {
    const display = selectAccountBalanceDisplay(
      "USD",
      undefined,
      undefined,
      undefined,
      TODAY,
    );
    expect(display.kind).toBe("money");
    expect(display.kind === "money" && display.value).toBe(0);
    expect(display.kind === "money" && display.valuation?.valuesHoldings).toBe(
      false,
    );
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
