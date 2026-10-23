import {
  selectBudgetCardStats,
  selectPointFavorability,
} from "../select-budget-card-stats";
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

  // w21/763: the card hid its meter for a zero budget, where Home drew it
  // full (w21/076).
  it("fills a zero budget's meter once anything is spent, as Home does", () => {
    const stats = selectBudgetCardStats(
      group("0 USD", [["2025-01-01", "monthly", "0 USD"]]),
      [{ date: "2025-01-31", actual: 120, budget: 0 }],
    );
    expect(stats.progressPercent).toBe(100);
    expect(stats.favorable).toBe(false);

    const untouched = selectBudgetCardStats(
      group("0 USD", [["2025-01-01", "monthly", "0 USD"]]),
      [{ date: "2025-01-31", actual: 0, budget: 0 }],
    );
    expect(untouched.progressPercent).toBe(0);
  });
});

// Months before the first budget directive have nothing to be over; their zero
// budget made any spending read red (w21/033).
describe("selectPointFavorability before the budget existed", () => {
  const history = [{ date: "2026-08-01" }, { date: "2026-09-01" }];

  it("leaves a pre-budget period unjudged and judges the rest", () => {
    expect(
      selectPointFavorability(
        [
          { date: "2026-07-31", actual: 120.4, budget: 0 },
          { date: "2026-08-31", actual: 180.85, budget: 300 },
          { date: "2026-09-30", actual: 400, budget: 350 },
        ],
        1,
        history,
      ),
    ).toEqual([null, true, false]);
  });

  it("still judges an explicit zero budget", () => {
    expect(
      selectPointFavorability(
        [{ date: "2026-08-31", actual: 5, budget: 0 }],
        1,
        [{ date: "2026-08-01" }],
      ),
    ).toEqual([false]);
  });

  it("judges a period the first directive starts partway through", () => {
    // Dated by its period start, but carrying a prorated budget.
    expect(
      selectPointFavorability(
        [{ date: "2026-08-01", actual: 50, budget: 150 }],
        1,
        [{ date: "2026-08-15" }],
      ),
    ).toEqual([true]);
  });

  it("draws an unjudged bar neutral", () => {
    const fs = require("fs");
    const path = require("path");
    const chart = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "common",
        "d3",
        "budget-bar-chart-d3.tsx",
      ),
      "utf8",
    );
    expect(chart.includes("favorables[i] === null")).toBe(true);
  });
});

// w21/101: a budget dated 1 November, viewed in October, read "Above target"
// with a red +$50.00 variance over an all-grey chart.
describe("a budget not yet in effect", () => {
  const future = {
    account: "Expenses:Transport",
    interval: "monthly",
    currency: "USD",
    amount: "300.00 USD",
    value: 300,
    entry_hash: "f",
    budgetHistory: [
      {
        date: "2026-11-01",
        interval: "monthly",
        amount: "300.00 USD",
        entry_hash: "f",
      },
    ],
  };

  it("judges nothing and says when it starts", () => {
    const stats = selectBudgetCardStats(future, [
      { date: "2026-10-31", actual: 50, budget: 0 },
    ]);
    expect(stats.status).toBe(null);
    expect(stats.variance).toBe(null);
    expect(stats.favorable).toBe(true);
    expect(stats.progressPercent).toBe(null);
    expect(stats.startsOn).toBe("2026-11-01");
    expect(stats.actual).toBe(50);
  });

  it("judges a budget in effect as before", () => {
    const stats = selectBudgetCardStats(future, [
      { date: "2026-11-30", actual: 350, budget: 300 },
    ]);
    expect(stats.status).toBe("above");
    expect(stats.startsOn).toBe(null);
  });

  it("is shown on the card as a neutral start date", () => {
    const card = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "components",
        "budget-group-card.tsx",
      ),
      "utf8",
    ) as string;
    expect(card.includes("{stats.startsOn !== null && (")).toBe(true);
  });

  it("reads neutrally and ranks last on Home", () => {
    const {
      selectBudgetPanelRows,
      budgetPanelRowAccessibilityValue,
    } = require("../../../home-screen/selectors/select-budget-panel");
    const rows = selectBudgetPanelRows(
      [
        { group: future, actual: 50, periodEnd: "2026-10-31" },
        {
          group: {
            ...future,
            account: "Expenses:Food",
            entry_hash: "g",
            budgetHistory: [{ ...future.budgetHistory[0], date: "2026-01-01" }],
          },
          actual: 10,
          periodEnd: "2026-10-31",
        },
      ],
      3,
      "2026-10-21",
    );
    expect(rows.map((row: { account: string }) => row.account)).toEqual([
      "Expenses:Food",
      "Expenses:Transport",
    ]);
    const spoken = budgetPanelRowAccessibilityValue(
      rows[1],
      (key: string, options?: Record<string, unknown>) =>
        `${key}${options ? JSON.stringify(options) : ""}`,
    );
    expect(spoken.includes("budgetAboveTarget")).toBe(false);
    expect(spoken.includes("budgetStartsOn")).toBe(true);
  });
});

// w21/596: a yen budget prorated to cents (967.74) was compared with ¥968 spent
// at cents, so "Budget ¥968 · Actual ¥968 · Variance +¥0" read "Above target".
describe("a budget in a currency without minor units", () => {
  const yen = (): BudgetGroup => ({
    ...group("1500 JPY"),
    currency: "JPY",
  });

  it("is on target when the shown budget and actual agree", () => {
    const stats = selectBudgetCardStats(yen(), [
      { date: "2026-10-31", actual: 968, budget: 967.74 },
    ]);
    expect(stats.status).toBe("on");
    expect(stats.favorable).toBe(true);
  });

  it("still calls a real overspend above target", () => {
    const stats = selectBudgetCardStats(yen(), [
      { date: "2026-10-31", actual: 1100, budget: 967.74 },
    ]);
    expect(stats.status).toBe("above");
    expect(stats.favorable).toBe(false);
  });

  it("keeps judging a dollar budget to the cent", () => {
    const stats = selectBudgetCardStats(group("500 USD"), [
      { date: "2026-10-31", actual: 500.26, budget: 500 },
    ]);
    expect(stats.status).toBe("above");
  });

  it("judges the charted periods the same way", () => {
    expect(
      selectPointFavorability(
        [{ date: "2026-10-31", actual: 968, budget: 967.74 }],
        1,
        yen().budgetHistory,
        undefined,
        "JPY",
      ),
    ).toEqual([true]);
  });
});
