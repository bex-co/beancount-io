import fs from "fs";
import path from "path";
import {
  selectAccountBalanceDisplay,
  selectAccountBalanceSeries,
  selectAccountUnitsExactFigures,
  selectAccountUnitsSeries,
} from "../select-account-balance-series";
import { balanceNotes } from "../../../../common/valuation";
import { AccountReportQuery } from "@/generated-graphql/graphql";
import {
  balanceSeriesBaseline,
  filterBalanceSeriesByRange,
  type TimeRange,
} from "../../../../common/series-util";

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
  // The figure itself; what it discloses about its prices is checked below.
  const figure = (display: ReturnType<typeof selectAccountBalanceDisplay>) => {
    const { valuation, ...rest } = display as typeof display & {
      valuation?: unknown;
    };
    void valuation;
    return rest;
  };

  it("values one commodity as its Accounts row does, at the latest price", () => {
    expect(
      figure(
        selectAccountBalanceDisplay("USD", market, units, prices, TODAY, {
          USD: "48471.38532",
        }),
      ),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48471.38532, basis: "market" },
      notInTotal: [],
    });
  });

  it("falls back to the report's latest point until the row's read lands", () => {
    expect(
      figure(selectAccountBalanceDisplay("USD", market, units, prices, TODAY)),
    ).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      value: { amount: 48656.6872, basis: "market" },
      notInTotal: [],
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

  // w21/179: the header was the report's point, priced on the account's last
  // posting date, while its Accounts row read today's value.
  it("values a money total today, as its Accounts row does", () => {
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
    // The row's figure, valued at the latest prices, and checked against
    // today: RGAGX's newest price is years old by then.
    expect(display.kind === "money" && display.value).toBe(88000);
    expect(valuation?.priced[0]?.priceDate).toBe("2017-09-08");
    expect(valuation?.priced[0]?.stale).toBe(true);
  });

  // w21/426: a single commodity's detail said "10 VEUR" with no price note, and
  // a stale price was only a money total's to warn of.
  it("warns of a stale price on a single commodity, as a total does", () => {
    const display = selectAccountBalanceDisplay(
      "USD",
      market,
      units,
      prices,
      TODAY,
      { USD: "48471.38532" },
    );
    expect(display.kind === "units" && display.valuation?.valuesHoldings).toBe(
      true,
    );
    const notes = balanceNotes(display, "USD", (key) => key, "en");
    expect(notes.includes("pricesNotUpdatedSince")).toBe(true);
  });

  it("notes a holding priced only in its cost currency", () => {
    const veur = selectAccountBalanceDisplay(
      "USD",
      createReport([{ date: "2026-08-28", balance: { EUR: "550" } }]),
      createReport([{ date: "2026-08-28", balance: { VEUR: "10" } }]),
      [{ base: "VEUR", quote: "EUR", prices: [{ date: "2026-08-28" }] }],
      TODAY,
      { EUR: "550" },
    );
    expect(veur.kind === "units" && veur.value).toBe(null);
    const notes = balanceNotes(veur, "USD", (key) => key, "en");
    expect(notes.includes("pricesNotUpdatedSince")).toBe(true);
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
    // Nor does the money series read cash in another currency (w21/058).
    expect(selectAccountBalanceSeries("EUR", data)[0].value).toBe(0);
  });
});

// w21/125: the units chart took the latest balance's scale, so a round
// "1000" after 999.50 + 0.50 showed August's 0.5 as "1".
describe("selectAccountUnitsScale", () => {
  const {
    selectAccountUnitsScale,
  } = require("../select-account-balance-series");
  it("takes the widest scale across the series", () => {
    const data = {
      getLedgerAccountReport: {
        linechartData: [
          { date: "2026-08-31", balance: { BTC: "0.5" } },
          { date: "2026-09-30", balance: { BTC: "1" } },
          { date: "2026-10-31", balance: { BTC: "1.00000050" } },
        ],
      },
    };
    expect(selectAccountUnitsScale("BTC", data)).toBe(8);
    expect(selectAccountUnitsScale("BTC", undefined)).toBe(0);
  });

  it("is what account detail formats its chart with", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "..", "..", "account-detail-screen.tsx"),
      "utf8",
    ) as string;
    expect(
      source.includes(
        "formatUnits(value, unitsCurrency, chartScale, includePlus)",
      ),
    ).toBe(true);
  });
});

// w21/164: the ledger sends points only where the balance changed, and the
// chart spaces them by index, so a dormant month vanished.
describe("a month with no postings", () => {
  it("repeats the balance it closed with, dated its last day", () => {
    const data = createReport([
      { date: "2026-08-05", balance: { USD: "2000" } },
      { date: "2026-10-12", balance: { USD: "1500" } },
    ]);
    expect(selectAccountBalanceSeries("USD", data)).toEqual([
      { date: "2026-08-05", value: 2000 },
      { date: "2026-09-30", value: 2000 },
      { date: "2026-10-12", value: 1500 },
    ]);
  });

  it("fills across a year end, in units too", () => {
    const data = createReport([
      { date: "2025-11-20", balance: { ITOT: "3" } },
      { date: "2026-02-02", balance: { ITOT: "5" } },
    ]);
    expect(
      selectAccountUnitsSeries("ITOT", data).map((point) => point.date),
    ).toEqual(["2025-11-20", "2025-12-31", "2026-01-31", "2026-02-02"]);
  });
});

// w21/179: a mixed cash-and-holdings account's header was its last point,
// priced on its last posting date, not today as its Accounts row is.
describe("a mixed account's balance today", () => {
  const report = createReport([
    { date: "2026-09-02", balance: { USD: "1000" } },
  ]);

  it("ends the series on today's value", () => {
    expect(
      selectAccountBalanceSeries("USD", report, {
        balance: { USD: "1250" },
        today: "2026-10-21",
      }),
    ).toEqual([
      { date: "2026-09-02", value: 1000 },
      { date: "2026-10-21", value: 1250 },
    ]);
    // Across a dormant month, the month in between closes on the old value.
    expect(
      selectAccountBalanceSeries("USD", report, {
        balance: { USD: "1250" },
        today: "2026-11-21",
      }).map((point) => point.date),
    ).toEqual(["2026-09-02", "2026-10-31", "2026-11-21"]);
  });

  it("replaces a point already in this month", () => {
    const thisMonth = createReport([
      { date: "2026-10-05", balance: { USD: "1000" } },
    ]);
    expect(
      selectAccountBalanceSeries("USD", thisMonth, {
        balance: { USD: "1250" },
        today: "2026-10-21",
      }),
    ).toEqual([
      { date: "2026-09-30", value: 0 },
      { date: "2026-10-21", value: 1250 },
    ]);
  });

  it("is unchanged without a current value", () => {
    expect(selectAccountBalanceSeries("USD", report)).toEqual([
      { date: "2026-09-02", value: 1000 },
    ]);
  });
});

// w21/240: windows counted back from an account's last posting, not from today,
// so a Savings account last moved in March read "+$500.00" over 1M in October.
describe("a quiet account over the recent ranges", () => {
  const today = "2026-10-21";
  const report = createReport([
    { date: "2026-02-03", balance: { USD: 1000 } },
    { date: "2026-03-05", balance: { USD: 1500 } },
  ]);
  const change = (
    series: ReturnType<typeof selectAccountBalanceSeries>,
    range: TimeRange,
  ) => {
    const windowed = filterBalanceSeriesByRange(series, range, 2026);
    return (
      windowed[windowed.length - 1].value -
      balanceSeriesBaseline(series, range, 2026)
    );
  };

  it("reads no change over 1M, 3M and 6M, and the whole rise over 1Y", () => {
    // No trial-balance value for the account: its last balance holds.
    const series = selectAccountBalanceSeries("USD", report, undefined, today);
    expect(series[series.length - 1]).toEqual({ date: today, value: 1500 });
    for (const range of ["1M", "3M", "6M"] as const) {
      expect(change(series, range)).toBe(0);
    }
    expect(change(series, "1Y")).toBe(1500);
  });

  it("does the same when today's value is known", () => {
    const series = selectAccountBalanceSeries(
      "USD",
      report,
      { balance: { USD: 1500 }, today },
      today,
    );
    for (const range of ["1M", "3M", "6M"] as const) {
      expect(change(series, range)).toBe(0);
    }
    expect(change(series, "1Y")).toBe(1500);
  });

  it("carries a commodity's held units to today too", () => {
    const units = createReport([
      { date: "2026-02-03", balance: { VTI: 10 } },
      { date: "2026-03-05", balance: { VTI: 15 } },
    ]);
    const series = selectAccountUnitsSeries("VTI", units, today);
    expect(series[series.length - 1]).toEqual({ date: today, value: 15 });
    expect(change(series, "3M")).toBe(0);
    expect(change(series, "1Y")).toBe(15);
  });

  it("leaves an account that moved this month, and callers without a day, as they were", () => {
    const active = createReport([
      { date: "2026-09-02", balance: { USD: 100 } },
      { date: "2026-10-05", balance: { USD: 150 } },
    ]);
    const series = selectAccountBalanceSeries("USD", active, undefined, today);
    expect(series[series.length - 1]).toEqual({
      date: "2026-10-05",
      value: 150,
    });
    expect(change(series, "1M")).toBe(50);
    expect(selectAccountBalanceSeries("USD", report).length).toBe(2);
    expect(selectAccountUnitsSeries("VTI", undefined, today)).toEqual([]);
  });
});

// w21/420: the change-only series is valued at each posting's date, so a held
// commodity drew flat through its price moves, then jumped to today's value.
describe("selectAccountBalanceSeries with month-end balances", () => {
  const monthEnds = [
    { date: "2026-07-31", balance: { USD: 2100 } },
    { date: "2026-08-31", balance: { USD: 2300 } },
    { date: "2026-09-30", balance: { USD: 2600 } },
    { date: "2026-10-31", balance: { USD: 2900 } },
  ];
  const report = (
    withMonthEnds: typeof monthEnds | undefined,
  ): AccountReportQuery =>
    ({
      getLedgerAccountReport: {
        // Ten units bought in July at 210, never touched again.
        linechartData: [{ date: "2026-07-05", balance: { USD: 2100 } }],
        accountBalanceData: withMonthEnds,
      },
    }) as unknown as AccountReportQuery;

  it("draws each month at its own price instead of a flat line", () => {
    const series = selectAccountBalanceSeries("USD", report(monthEnds));
    expect(series.map((point) => point.value)).toEqual([
      2100, 2300, 2600, 2900,
    ]);
  });

  it("falls back to the change-only series without them", () => {
    expect(
      selectAccountBalanceSeries("USD", report(undefined)).map(
        (point) => point.value,
      ),
    ).toEqual([2100]);
    expect(
      selectAccountBalanceSeries("USD", report([])).map((point) => point.value),
    ).toEqual([2100]);
  });
});

// w21/491: the dense month-end rows are dated at period end and span the whole
// ledger, whichever account is asked about.
describe("selectAccountBalanceSeries with the ledger's span of month-end rows", () => {
  // A savings account opened 2026-03-10 with $1,000 and never touched; the
  // ledger runs from 2020-01 to a rent entry pre-entered for 2026-11-01.
  const months: string[] = [];
  for (let year = 2020; year <= 2026; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (year === 2026 && month > 11) continue;
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      months.push(
        `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
      );
    }
  }
  const savings = {
    getLedgerAccountReport: {
      linechartData: [{ date: "2026-03-10", balance: { USD: 1000 } }],
      accountBalanceData: months.map((date) => ({
        date,
        balance: { USD: date >= "2026-03-10" ? 1000 : 0 },
      })),
    },
  } as unknown as AccountReportQuery;
  const today = "2026-10-21";
  const current = { balance: { USD: 1000 }, today };

  it("ends today, not at the end of the month or next month", () => {
    const series = selectAccountBalanceSeries("USD", savings, current, today);
    expect(series[series.length - 1]).toEqual({ date: today, value: 1000 });
    expect(series.some((point) => point.date > today)).toBe(false);
    expect(
      series.filter((point) => point.date.startsWith("2026-10")).length,
    ).toBe(1);
  });

  it("starts at the account's first posting, not at the ledger's", () => {
    const series = selectAccountBalanceSeries("USD", savings, current, today);
    expect(series[0]!.date.slice(0, 7)).toBe("2026-03");
    expect(series.length).toBe(8);
  });

  it("keeps the 1M window on months that have begun, with an entry pre-entered elsewhere", () => {
    const series = selectAccountBalanceSeries("USD", savings, current, today);
    const window = filterBalanceSeriesByRange(series, "1M" as TimeRange, 2026);
    expect(window.some((point) => point.date.slice(0, 7) === "2026-11")).toBe(
      false,
    );
    expect(window[window.length - 1]!.value).toBe(1000);
  });

  it("does the same without today's balance, from the day alone", () => {
    const series = selectAccountBalanceSeries("USD", savings, undefined, today);
    expect(series[series.length - 1]!.date <= today).toBe(true);
    expect(series[0]!.date.slice(0, 7)).toBe("2026-03");
  });
});

// w21/516: a loan whose only posting is dated next month showed $0.00 and "Not
// enough data" while its Accounts row and journal read -$20,000.00.
describe("selectAccountBalanceSeries for an account whose only posting is still to come", () => {
  const today = "2026-10-22";
  const loan = {
    getLedgerAccountReport: {
      linechartData: [{ date: "2026-11-01", balance: { USD: -20000 } }],
      accountBalanceData: [
        { date: "2026-01-31", balance: { USD: 0 } },
        { date: "2026-11-30", balance: { USD: -20000 } },
      ],
    },
  } as unknown as AccountReportQuery;

  it("ends on the figure the Accounts row reads", () => {
    expect(
      selectAccountBalanceSeries(
        "USD",
        loan,
        { balance: { USD: -20000 }, today },
        today,
      ),
    ).toEqual([{ date: today, value: -20000 }]);
  });

  it("stays empty for an account with nothing in it", () => {
    expect(
      selectAccountBalanceSeries(
        "USD",
        createReport([]),
        { balance: { USD: 0 }, today },
        today,
      ),
    ).toEqual([]);
  });
});

// w21/517: 1M read "+3 VOO" for next month's buy and left out this month's.
describe("selectAccountUnitsSeries with a posting dated after today", () => {
  const voo = createReport([
    { date: "2026-09-15", balance: { VOO: 12 } },
    { date: "2026-10-05", balance: { VOO: 13 } },
    { date: "2026-11-01", balance: { VOO: 16 } },
  ]);

  it("ends at today's holding, not next month's", () => {
    const series = selectAccountUnitsSeries("VOO", voo, "2026-10-22");
    expect(series).toEqual([
      { date: "2026-09-15", value: 12 },
      { date: "2026-10-05", value: 13 },
    ]);
  });

  it("is unchanged when nothing is dated after today", () => {
    expect(selectAccountUnitsSeries("VOO", voo, "2026-12-01")).toEqual([
      { date: "2026-09-15", value: 12 },
      { date: "2026-10-05", value: 13 },
      { date: "2026-11-01", value: 16 },
      { date: "2026-12-01", value: 16 },
    ]);
  });
});

// w21/782: the headline and its change printed the chart's double,
// "1.234567890123460000 QAETH", where Accounts read the ledger's digits.
describe("selectAccountUnitsExactFigures", () => {
  const eth = "1.234567890123456789";
  const data = createReport([
    { date: "2026-09-30", balance: { QAETH: "0.5" } },
    { date: "2026-10-05", balance: { QAETH: eth } },
  ]);

  it("gives the latest balance and its change since each point", () => {
    const figures = selectAccountUnitsExactFigures("QAETH", data, "2026-10-23");
    expect(figures.get(Number(eth))).toBe(eth);
    expect(figures.get(Number(eth) - 0.5)).toBe("0.734567890123456789");
    expect(figures.get(Number(eth) - 0)).toBe(eth);
  });

  it("is the chart's value at rest, and its change", () => {
    const series = selectAccountUnitsSeries("QAETH", data, "2026-10-23");
    const figures = selectAccountUnitsExactFigures("QAETH", data, "2026-10-23");
    const latest = series[series.length - 1].value;
    expect(figures.get(latest)).toBe(eth);
    expect(figures.get(latest - series[0].value)).toBe("0.734567890123456789");
  });

  it("holds nothing for figures a double reads whole", () => {
    const plain = createReport([
      { date: "2026-09-30", balance: { BTC: "0.5" } },
      { date: "2026-10-05", balance: { BTC: "1.00000050" } },
    ]);
    expect(selectAccountUnitsExactFigures("BTC", plain).size).toBe(0);
  });

  it("is what the screen's chart formats through", () => {
    const screen = fs.readFileSync(
      path.join(__dirname, "..", "..", "account-detail-screen.tsx"),
      "utf8",
    );
    expect(screen.includes("const exact = exactFigures?.get(value);")).toBe(
      true,
    );
  });
});

// w21/893: an account first funded this month had a single point to chart.
describe("an account first funded this month", () => {
  const today = "2026-10-21";
  const fresh = {
    getLedgerAccountReport: {
      linechartData: [{ date: "2026-10-05", balance: { USD: 1000 } }],
    },
  } as unknown as AccountReportQuery;

  it("draws a line from 0 to its balance", () => {
    expect(
      selectAccountBalanceSeries(
        "USD",
        fresh,
        { balance: { USD: 1000 }, today },
        today,
      ),
    ).toEqual([
      { date: "2026-09-30", value: 0 },
      { date: today, value: 1000 },
    ]);
  });

  it("does the same in units", () => {
    expect(selectAccountUnitsSeries("USD", fresh, today)).toEqual([
      { date: "2026-09-30", value: 0 },
      { date: "2026-10-05", value: 1000 },
    ]);
  });
});
