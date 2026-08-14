import { selectBudgetCardStats } from "../select-budget-card-stats";
import type { BudgetGroup } from "../budget-selectors";

function group(
  amount: string,
  history: Array<[string, string, string]> = [
    ["2025-01-01", "monthly", amount],
  ],
  interval = "monthly",
): BudgetGroup {
  return {
    account: "Expenses:Food",
    interval,
    currency: "USD",
    amount,
    value: Number.parseFloat(amount),
    entry_hash: "hash",
    budgetHistory: history.map(([date, entryInterval, entryAmount]) => ({
      date,
      interval: entryInterval,
      amount: entryAmount,
      entry_hash: `${date}-hash`,
    })),
  };
}

describe("selectBudgetCardStats", () => {
  it("computes variance against the budget in effect for the charted period", () => {
    // The budget was raised to 500 in February; January must still compare
    // against 310, not against today's amount.
    const stats = selectBudgetCardStats(
      group("500 USD", [
        ["2025-01-01", "monthly", "310 USD"],
        ["2025-02-01", "monthly", "500 USD"],
      ]),
      [{ date: "2025-01-31", actual: 400, budget: 310 }],
    );

    expect(stats.budget).toBe(310);
    expect(stats.actual).toBe(400);
    expect(stats.variance).toBe(90);
    expect(stats.status).toBe("above");
    expect(stats.favorable).toBeFalsy();
  });

  it("treats under target as favorable for an expense budget", () => {
    const stats = selectBudgetCardStats(group("500 USD"), [
      { date: "2025-01-31", actual: 420, budget: 500 },
    ]);

    expect(stats.status).toBe("below");
    expect(stats.favorable).toBeTruthy();
    expect(stats.progressPercent).toBeCloseTo(84, 5);
  });

  it("treats above target as favorable for an income budget", () => {
    const stats = selectBudgetCardStats(
      group("-5000 USD", [["2025-01-01", "monthly", "-5000 USD"]]),
      [{ date: "2025-01-31", actual: 5500, budget: 5000 }],
    );

    expect(stats.budget).toBe(5000);
    expect(stats.status).toBe("above");
    expect(stats.favorable).toBeTruthy();
  });

  it("reports on-target as favorable", () => {
    const stats = selectBudgetCardStats(group("500 USD"), [
      { date: "2025-01-31", actual: 500, budget: 500 },
    ]);

    expect(stats.status).toBe("on");
    expect(stats.favorable).toBeTruthy();
    expect(stats.variance).toBe(0);
  });

  it("falls back to the current amount when nothing is charted", () => {
    const stats = selectBudgetCardStats(group("500 USD"), []);

    expect(stats.budget).toBe(500);
    expect(stats.actual).toBe(null);
    expect(stats.variance).toBe(null);
    expect(stats.status).toBe(null);
    expect(stats.progressPercent).toBe(null);
  });

  it("does not compute a progress percentage against a zero budget", () => {
    const stats = selectBudgetCardStats(
      group("0 USD", [["2025-01-01", "monthly", "0 USD"]]),
      [{ date: "2025-01-31", actual: 120, budget: 0 }],
    );

    expect(stats.progressPercent).toBe(null);
  });
});
