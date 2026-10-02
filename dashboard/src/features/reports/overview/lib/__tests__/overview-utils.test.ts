import { describe, expect, it } from "vitest";
import {
  buildAccountBalanceRows,
  formatPeriodMonth,
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
    expect(rows[1].amounts).toEqual([{ currency: "USD", value: 400 }]);
    expect(rows[2].amounts).toEqual([
      { currency: "EUR", value: 200 },
      { currency: "GBP", value: 300 },
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

    expect(snapshot.total).toEqual([{ currency: "USD", value: 500 }]);
    expect(snapshot.average).toEqual([{ currency: "USD", value: 200 }]);
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
