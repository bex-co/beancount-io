import { selectBudgetPanelRows } from "../select-budget-panel";
import type { BudgetPanelInput } from "../select-budget-panel";
import type { BudgetGroup } from "../../../budget-screen/selectors/budget-selectors";

function group(
  account: string,
  amount: string,
  interval = "monthly",
  currency = "USD",
): BudgetGroup {
  return {
    account,
    interval,
    currency,
    amount,
    value: Number.parseFloat(amount),
    entry_hash: `${account}-hash`,
    budgetHistory: [
      {
        date: "2025-01-01",
        interval,
        amount,
        entry_hash: `${account}-hash`,
      },
    ],
  };
}

function input(
  account: string,
  amount: string,
  actual: number | null,
  interval = "monthly",
): BudgetPanelInput {
  return {
    group: group(account, amount, interval),
    actual,
    periodEnd: "2025-01-31",
  };
}

describe("selectBudgetPanelRows", () => {
  it("ranks the most-consumed budgets first", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:Transport", "150 USD", 30), // 20%
        input("Expenses:Shopping", "300 USD", 340), // 113%
        input("Expenses:Food", "500 USD", 400), // 80%
      ],
      3,
    );

    expect(rows.map((row) => row.account)).toEqual([
      "Expenses:Shopping",
      "Expenses:Food",
      "Expenses:Transport",
    ]);
  });

  it("caps the row count so the panel cannot grow without bound", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:A", "100 USD", 90),
        input("Expenses:B", "100 USD", 80),
        input("Expenses:C", "100 USD", 70),
        input("Expenses:D", "100 USD", 60),
      ],
      3,
    );

    expect(rows.length).toBe(3);
    expect(rows[2].account).toBe("Expenses:C");
  });

  it("flags an expense budget over its target as unfavorable", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "300 USD", 340)],
      3,
    );

    expect(row.favorable).toBeFalsy();
    expect(row.progressPercent).toBeCloseTo((340 / 300) * 100, 5);
  });

  it("inverts favorability for income budgets, which are written negative", () => {
    // Earning 4000 against a 5000 income target is *under* target — bad.
    const [under] = selectBudgetPanelRows(
      [input("Income:Salary", "-5000 USD", -4000)],
      3,
    );
    expect(under.favorable).toBeFalsy();
    expect(under.actual).toBe(4000);

    const [over] = selectBudgetPanelRows(
      [input("Income:Salary", "-5000 USD", -5500)],
      3,
    );
    expect(over.favorable).toBeTruthy();
  });

  it("treats a budget whose actual has not loaded as unspent", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "300 USD", null)],
      3,
    );

    expect(row.actual).toBe(0);
    expect(row.progressPercent).toBe(0);
    expect(row.favorable).toBeTruthy();
  });

  it("does not divide by a zero budget", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "0 USD", 120)],
      3,
    );

    expect(row.progressPercent).toBe(0);
  });

  it("breaks ties on account so row order does not depend on query timing", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:Zebra", "100 USD", 50),
        input("Expenses:Apple", "100 USD", 50),
      ],
      3,
    );

    expect(rows.map((row) => row.account)).toEqual([
      "Expenses:Apple",
      "Expenses:Zebra",
    ]);
  });

  it("shortens the account for display without losing the full name", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food:Groceries", "300 USD", 100)],
      3,
    );

    expect(row.shortAccount).toBe("Food:Groceries");
    expect(row.account).toBe("Expenses:Food:Groceries");
  });

  it("prorates a weekly budget to its own current period", () => {
    // A 70/week budget over the week ending 2025-01-12 is 70, not 70/7.
    const rows = selectBudgetPanelRows(
      [
        {
          group: group("Expenses:Coffee", "70 USD", "weekly"),
          actual: 35,
          periodEnd: "2025-01-12",
        },
      ],
      3,
    );

    expect(rows[0].budget).toBe(70);
    expect(rows[0].progressPercent).toBeCloseTo(50, 5);
  });
});
