import { describe, expect, it } from "vitest";
import {
  buildAccountBalanceRows,
  getMovementSnapshot,
  hasOverviewActivity,
  isPartialMonthlyPeriod,
} from "../overview-utils";

describe("overview financial selectors", () => {
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
