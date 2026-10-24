import { describe, expect, it } from "vitest";
import {
  amountDifference,
  buildAccountBalanceRows,
  formatPeriodMonth,
  getBalanceAmounts,
  getMovementSnapshot,
  getLatestActiveIntervalDate,
  hasOverviewActivity,
  isPartialMonthlyPeriod,
} from "../overview-utils";

describe("overview financial selectors", () => {
  it("finds the latest active income or expense interval instead of a trailing empty one", () => {
    expect(
      getLatestActiveIntervalDate(
        [{ date: "2026-04-30", balance: { USD: "-50" }, accountBalances: {} }],
        [
          { date: "2027-01-31", balance: { USD: 0 }, accountBalances: {} },
          { date: "2026-05-31", balance: { USD: "12" }, accountBalances: {} },
        ],
      ),
    ).toBe("2026-05-31");
  });

  it("recognizes offsetting accounts even when the period total is zero", () => {
    const offsetting = {
      date: "2026-06-30",
      balance: { USD: 0 },
      accountBalances: {
        "Expenses:Fees": { USD: 10 },
        "Expenses:Refund": { USD: -10 },
      },
    };
    // The page must also display its report modules for this same activity.
    expect(hasOverviewActivity({ expensesIntervalData: [offsetting] })).toBe(
      true,
    );
    expect(
      getLatestActiveIntervalDate(
        [],
        [
          offsetting,
          {
            date: "2026-07-31",
            balance: { USD: 0 },
            accountBalances: { "Expenses:Fees": { USD: 0 } },
          },
        ],
      ),
    ).toBe("2026-06-30");
  });

  it("does not invent activity for empty or zero-filled intervals", () => {
    expect(getLatestActiveIntervalDate([], [])).toBeUndefined();
    expect(
      getLatestActiveIntervalDate(
        [],
        [
          {
            date: "2027-01-31",
            balance: { USD: 0 },
            accountBalances: { "Expenses:Fees": { USD: 0 } },
          },
        ],
      ),
    ).toBeUndefined();
  });

  it("returns real leaf accounts and keeps currencies separate", () => {
    const rows = buildAccountBalanceRows({
      assets: {
        account: "Assets",
        children: [
          {
            account: "Assets:Bank:Checking",
            balance: { USD: "1250.50" },
            children: [],
          },
          {
            account: "Assets:Brokerage",
            balance: { EUR: "200", GBP: "300" },
            children: [],
          },
        ],
      },
      liabilities: {
        account: "Liabilities",
        children: [
          {
            account: "Liabilities:Card",
            balance: { USD: "-400" },
            children: [],
          },
        ],
      },
      preferredCurrency: "USD",
      invertLiabilities: true,
    });

    expect(rows.map((row) => row.account)).toEqual([
      "Assets:Bank:Checking",
      "Liabilities:Card",
      "Assets:Brokerage",
    ]);
    // The ledger's decimal travels with each amount, inverted exactly.
    expect(rows[1].amounts).toEqual([
      { currency: "USD", value: 400, exact: "400" },
    ]);
    expect(rows[2].amounts).toEqual([
      { currency: "EUR", value: 200, exact: "200" },
      { currency: "GBP", value: 300, exact: "300" },
    ]);
  });

  it("derives interval totals, prior averages, and ranked categories", () => {
    const snapshot = getMovementSnapshot({
      date: "2026-04-30",
      preferredCurrency: "USD",
      inverted: true,
      series: [
        {
          date: "2026-01-31",
          balance: { USD: "-100" },
          accountBalances: {},
        },
        {
          date: "2026-02-28",
          balance: { USD: "-200" },
          accountBalances: {},
        },
        {
          date: "2026-03-31",
          balance: { USD: "-300" },
          accountBalances: {},
        },
        {
          date: "2026-04-30",
          balance: { USD: "-500" },
          accountBalances: {
            "Income:Salary": { USD: "-450" },
            "Income:Interest": { USD: "-50" },
          },
        },
      ],
    });

    expect(snapshot.total).toEqual([
      { currency: "USD", value: 500, exact: "500" },
    ]);
    expect(snapshot.average).toEqual([
      { currency: "USD", value: 200, exact: "200.00" },
    ]);
    expect(snapshot.categories.map((category) => category.account)).toEqual([
      "Income:Salary",
      "Income:Interest",
    ]);
  });

  it("only marks the current unfinished monthly interval as partial", () => {
    const now = new Date("2026-07-15T12:00:00");
    expect(isPartialMonthlyPeriod("2026-07-31", now)).toBe(true);
    expect(isPartialMonthlyPeriod("2026-06-30", now)).toBe(false);
  });

  it("treats empty and zero-filled overview responses as no activity", () => {
    expect(hasOverviewActivity(undefined)).toBe(false);
    expect(
      hasOverviewActivity({
        netWorthData: [{ date: "2026-07-31", balance: { USD: 0 } }],
        assetsHierarchyData: {
          account: "Assets",
          balance: { USD: 0 },
          hasTxns: false,
          children: [],
        },
      }),
    ).toBe(false);
  });

  it("detects overview activity in series and nested account hierarchies", () => {
    expect(
      hasOverviewActivity({
        expensesData: [{ date: "2026-07-31", balance: { USD: 42 } }],
      }),
    ).toBe(true);
    expect(
      hasOverviewActivity({
        assetsHierarchyData: {
          account: "Assets",
          children: [
            {
              account: "Assets:Cash",
              balance: { USD: 0 },
              hasTxns: true,
            },
          ],
        },
      }),
    ).toBe(true);
  });
});

describe("formatPeriodMonth", () => {
  it("uses the supplied application language, not the runtime default", () => {
    expect(formatPeriodMonth("2016-12-31", "en")).toBe("December 2016");
    expect(formatPeriodMonth("2016-12-31", "fr")).toBe("décembre 2016");
    expect(formatPeriodMonth("2016-12-31", "de")).toBe("Dezember 2016");
  });

  it("falls back to the raw value for an unparseable date", () => {
    expect(formatPeriodMonth("not-a-date", "fr")).toBe("not-a-date");
  });
});

describe("amountDifference (w4/m52)", () => {
  const usd = (text: string) => getBalanceAmounts({ USD: text })[0]!;

  it("subtracts the ledger's decimals exactly", () => {
    expect(
      amountDifference(usd("9007199254740993"), usd("9007199254740992")),
    ).toBe("1");
    expect(
      amountDifference(usd("9007199254740992"), usd("9007199254740993")),
    ).toBe("-1");
    expect(amountDifference(usd("10.50"), usd("4"))).toBe("6.50");
  });

  it("falls back to the number for an amount without a decimal", () => {
    expect(
      amountDifference(
        { currency: "USD", value: 200 },
        { currency: "USD", value: 150.25 },
      ),
    ).toBe("49.75");
  });
});

/**
 * Money movement averages come from the ledger's decimals (w4/1029): rounding
 * a double to cents made a 0.003 BTC average 0 and turned
 * 9007199254740993 USD into …992.
 */
describe("Money movement averages are exact", () => {
  const month = (date: string, balance: Record<string, string>) => ({
    date,
    balance,
    accountBalances: {},
  });
  const averageOn = (
    date: string,
    series: ReturnType<typeof month>[],
    inverted = true,
  ) =>
    getMovementSnapshot({ series, date, preferredCurrency: "USD", inverted })
      .average;

  it("keeps a commodity's small means and the USD controls", () => {
    const income = [
      month("2026-01-31", { BTC: "-0.003", USD: "-3.00" }),
      month("2026-02-28", { BTC: "-0.003", USD: "-3.00" }),
      month("2026-03-31", { BTC: "-0.003", USD: "-3.00" }),
    ];
    expect(averageOn("2026-03-31", income)).toEqual([
      { currency: "USD", value: 3, exact: "3.0000" },
      { currency: "BTC", value: 0.003, exact: "0.00300" },
    ]);
    const spending = income.map((point) =>
      month(point.date, { BTC: "0.001", USD: "1.00" }),
    );
    expect(averageOn("2026-02-28", spending, false)).toEqual([
      { currency: "USD", value: 1, exact: "1.0000" },
      { currency: "BTC", value: 0.001, exact: "0.00100" },
    ]);
  });

  it("keeps every whole-unit digit beyond what a double holds", () => {
    const income = ["2026-01-31", "2026-02-28", "2026-03-31"].map((date) =>
      month(date, { USD: "-9007199254740993" }),
    );
    expect(averageOn("2026-02-28", income)[0]!.exact).toBe(
      "9007199254740993.00",
    );
    expect(averageOn("2026-03-31", income)[0]!.exact).toBe(
      "9007199254740993.00",
    );
  });

  it("rounds a repeating mean once, two places past its sources", () => {
    const income = [
      month("2026-01-31", { USD: "-10" }),
      month("2026-02-28", {}),
      month("2026-03-31", {}),
      month("2026-04-30", { USD: "-1" }),
    ];
    // (10 + 0 + 0) / 3, with no binary residue.
    expect(averageOn("2026-04-30", income)).toEqual([
      { currency: "USD", value: 3.33, exact: "3.33" },
    ]);
  });

  it("averages cancelling amounts to a genuine zero, and has none for the first month", () => {
    const income = [
      month("2026-01-31", { BTC: "-0.005" }),
      month("2026-02-28", { BTC: "0.005" }),
      month("2026-03-31", { BTC: "-1" }),
    ];
    expect(averageOn("2026-03-31", income)).toEqual([
      { currency: "BTC", value: 0, exact: "0.00000" },
    ]);
    expect(averageOn("2026-01-31", income)).toEqual([]);
  });
});
