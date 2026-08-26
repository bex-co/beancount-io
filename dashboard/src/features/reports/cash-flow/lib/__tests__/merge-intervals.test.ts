import { describe, expect, it } from "vitest";
import { mergeIntervalAccountChanges } from "../merge-intervals";

describe("mergeIntervalAccountChanges", () => {
  it("merges series by date and sorts ascending", () => {
    const income = [
      {
        date: "2024-02",
        accountBalances: { "Income:Salary": { USD: "-5000.00" } },
      },
      {
        date: "2024-01",
        accountBalances: { "Income:Salary": { USD: "-4000.00" } },
      },
    ];
    const expenses = [
      {
        date: "2024-01",
        accountBalances: { "Expenses:Rent": { USD: "1500.00" } },
      },
      {
        date: "2024-02",
        accountBalances: { "Expenses:Rent": { USD: "1600.00" } },
      },
    ];

    const merged = mergeIntervalAccountChanges(income, expenses);

    expect(merged.map((point) => point.date)).toEqual(["2024-01", "2024-02"]);
    expect(merged[0].accountChanges).toEqual({
      "Income:Salary": { USD: "-4000.00" },
      "Expenses:Rent": { USD: "1500.00" },
    });
    expect(merged[1].accountChanges).toEqual({
      "Income:Salary": { USD: "-5000.00" },
      "Expenses:Rent": { USD: "1600.00" },
    });
  });

  it("keeps dates that appear in only some series", () => {
    const assets = [
      {
        date: "2024-03",
        accountBalances: { "Assets:Invest:Brokerage": { USD: "100.00" } },
      },
    ];
    const equity = [
      {
        date: "2024-01",
        accountBalances: { "Equity:Opening-Balances": { USD: "-50.00" } },
      },
    ];

    const merged = mergeIntervalAccountChanges(assets, equity);

    expect(merged.map((point) => point.date)).toEqual(["2024-01", "2024-03"]);
    expect(merged[0].accountChanges).toEqual({
      "Equity:Opening-Balances": { USD: "-50.00" },
    });
    expect(merged[1].accountChanges).toEqual({
      "Assets:Invest:Brokerage": { USD: "100.00" },
    });
  });

  it("shallow-merges account maps from several series on the same date", () => {
    const liabilities = [
      {
        date: "2024-01",
        accountBalances: { "Liabilities:CreditCard": { USD: "200.00" } },
      },
    ];
    const expenses = [
      {
        date: "2024-01",
        accountBalances: {
          "Expenses:Rent": { USD: "1500.00" },
          "Expenses:Food": { USD: "300.00", EUR: "10.00" },
        },
      },
    ];

    const merged = mergeIntervalAccountChanges(liabilities, expenses);

    expect(merged).toHaveLength(1);
    expect(merged[0].accountChanges).toEqual({
      "Liabilities:CreditCard": { USD: "200.00" },
      "Expenses:Rent": { USD: "1500.00" },
      "Expenses:Food": { USD: "300.00", EUR: "10.00" },
    });
  });

  it("returns an empty array for empty input", () => {
    expect(mergeIntervalAccountChanges([], [], [], [], [])).toEqual([]);
  });
});
