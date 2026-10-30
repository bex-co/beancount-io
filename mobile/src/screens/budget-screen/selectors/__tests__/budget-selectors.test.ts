/**
 * Ported verbatim (case-for-case, same fixtures) from the dashboard's
 * `budget-utils.test.ts`. These cases are the contract for the date-fns-free
 * port in `budget-selectors.ts`: if mobile and dashboard ever disagree here,
 * mobile is wrong. Matchers are adapted to the jest-lite runner's set
 * (no toMatchObject / toHaveLength).
 */
import {
  budgetForInterval,
  calculateBudgetForInterval,
  groupBudgetEntries,
  prepareBudgetHistory,
  selectHistoryRows,
} from "../budget-selectors";
import type { BudgetEntry, BudgetHistoryEntry } from "../budget-selectors";
import { DirectiveType } from "../../../transactions-screen/types";

function budgetEntry(
  date: string,
  account: string,
  interval: string,
  number: string,
  currency: string,
  hash: string,
): BudgetEntry {
  return {
    date,
    entry_hash: hash,
    directive_type: DirectiveType.CUSTOM,
    type: "budget",
    values: [account, interval, { number, currency }],
  };
}

function historyEntry(
  date: string,
  interval: string,
  amount: string,
): BudgetHistoryEntry {
  return { date, interval, amount, entry_hash: `${date}-${interval}` };
}

describe("groupBudgetEntries", () => {
  it("keeps one history per account and currency when cadence changes", () => {
    const groups = groupBudgetEntries([
      budgetEntry(
        "2025-01-01",
        "Expenses:Food",
        "monthly",
        "300",
        "USD",
        "usd-old",
      ),
      budgetEntry(
        "2025-03-01",
        "Expenses:Food",
        "weekly",
        "80",
        "USD",
        "usd-new",
      ),
      budgetEntry(
        "2025-02-01",
        "Expenses:Food",
        "monthly",
        "250",
        "EUR",
        "eur",
      ),
    ]);

    expect(groups.length).toBe(2);
    const usd = groups.find((group) => group.currency === "USD");
    expect(usd?.account).toBe("Expenses:Food");
    expect(usd?.interval).toBe("weekly");
    expect(usd?.amount).toBe("80 USD");
    expect(usd?.entry_hash).toBe("usd-new");
    expect(usd?.budgetHistory.map((entry) => entry.interval)).toEqual([
      "monthly",
      "weekly",
    ]);
  });

  it("ignores malformed directives instead of rendering empty cards", () => {
    const malformed: BudgetEntry = {
      date: "2025-01-01",
      entry_hash: "bad",
      directive_type: DirectiveType.CUSTOM,
      type: "budget",
      values: ["", "monthly", { number: "100", currency: "USD" }],
    };

    expect(groupBudgetEntries([malformed])).toEqual([]);
  });

  it("does not label a future directive as the current budget", () => {
    const groups = groupBudgetEntries(
      [
        budgetEntry(
          "2025-01-01",
          "Expenses:Travel",
          "monthly",
          "200",
          "USD",
          "current",
        ),
        budgetEntry(
          "2025-03-01",
          "Expenses:Travel",
          "weekly",
          "75",
          "USD",
          "future",
        ),
      ],
      "2025-02-01",
    );

    expect(groups[0].interval).toBe("monthly");
    expect(groups[0].amount).toBe("200 USD");
    expect(groups[0].entry_hash).toBe("current");
  });
});

describe("calculateBudgetForInterval", () => {
  it("converts a monthly target to its daily equivalent", () => {
    const history = [historyEntry("2025-01-01", "monthly", "310 USD")];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      310,
    );
    expect(calculateBudgetForInterval("2025-01-12", "weekly", history)).toBe(
      70,
    );
  });

  it("budgets the first directive's whole period, not only the days after its date (w21/301)", () => {
    // A monthly 310 set on January 16 is January's budget: the actuals it is
    // judged against cover the whole month.
    const history = [historyEntry("2025-01-16", "monthly", "310 USD")];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      310,
    );
  });

  // w21/762: the first budget was back-filled to the start of the chart's
  // period, in today's cadence: a Monthly set Oct 21, then Yearly, covered the
  // whole year.
  it("back-fills the first budget to its own period's start when the cadence changes", () => {
    // Monthly → Yearly: Oct 1–21 at 300/31, then Oct 22 on at 3600/365.
    expect(
      calculateBudgetForInterval(
        "2026-12-31",
        "yearly",
        [
          historyEntry("2026-10-21", "monthly", "300 USD"),
          historyEntry("2026-10-22", "yearly", "3600 USD"),
        ],
        "2026-10-23",
      ),
    ).toBe(903.5);
    // Monthly → Quarterly: Nov 1–21 at 300/30, not from Q4's Oct 1.
    expect(
      calculateBudgetForInterval(
        "2026-12-31",
        "quarterly",
        [
          historyEntry("2026-11-21", "monthly", "300 USD"),
          historyEntry("2026-11-22", "quarterly", "900 USD"),
        ],
        "2026-11-23",
      ),
    ).toBe(601.3);
    // Weekly → Monthly: from Monday Oct 19 at 70/7, not from Oct 1.
    expect(
      calculateBudgetForInterval(
        "2026-10-31",
        "monthly",
        [
          historyEntry("2026-10-21", "weekly", "70 USD"),
          historyEntry("2026-10-22", "monthly", "300 USD"),
        ],
        "2026-10-23",
      ),
    ).toBe(126.77);
  });

  // w21/622: Add then Update the same day (500, then 300) left the 500 covering
  // the period start and the 300 only from its own date.
  it("lets a same-day correction govern from the period start", () => {
    const history = [
      historyEntry("2025-01-16", "monthly", "500 USD"),
      historyEntry("2025-01-16", "monthly", "300 USD"),
    ];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      300,
    );
    // Judged on a mid-month day, the period is still its full target (w21/994).
    expect(
      calculateBudgetForInterval(
        "2025-01-31",
        "monthly",
        history,
        "2025-01-16",
      ),
    ).toBe(300);
  });

  it("still starts a later-dated directive on its own date", () => {
    const history = [
      historyEntry("2025-01-16", "monthly", "500 USD"),
      historyEntry("2025-01-16", "monthly", "300 USD"),
      historyEntry("2025-01-24", "monthly", "620 USD"),
    ];

    const expected = (300 * 23 + 620 * 8) / 31;
    expect(
      Math.abs(
        calculateBudgetForInterval("2025-01-31", "monthly", history) - expected,
      ) < 0.01,
    ).toBe(true);
  });

  it("does not apply a later directive before its effective date", () => {
    // Only the first directive back-fills; a raise still starts on its date.
    const history = [
      historyEntry("2025-01-01", "monthly", "310 USD"),
      historyEntry("2025-01-16", "monthly", "620 USD"),
    ];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      470,
    );
  });

  it("prorates a cadence change in the middle of a chart period", () => {
    const history = [
      historyEntry("2025-01-01", "monthly", "310 USD"),
      historyEntry("2025-01-16", "daily", "20 USD"),
    ];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      470,
    );
  });

  it("prorates a partial final period, even for a single directive", () => {
    // A window ending on the 10th charts January as ten days of 310/month.
    const history = [historyEntry("2024-12-01", "monthly", "310 USD")];

    expect(calculateBudgetForInterval("2025-01-10", "monthly", history)).toBe(
      100,
    );
  });

  it("budgets the period in progress in full, whatever day it is judged on (w21/994)", () => {
    const single = [historyEntry("2026-01-01", "monthly", "122 USD")];
    const revised = [
      historyEntry("2026-01-01", "monthly", "100 USD"),
      historyEntry("2026-06-01", "monthly", "122 USD"),
    ];

    // September reported as a whole period, on the 13th: the full target.
    expect(
      calculateBudgetForInterval("2026-09-30", "monthly", single, "2026-09-13"),
    ).toBe(122);
    expect(
      calculateBudgetForInterval(
        "2026-09-30",
        "monthly",
        revised,
        "2026-09-13",
      ),
    ).toBe(122);
    // Not begun yet: no budget. Already finished: the whole target.
    expect(
      calculateBudgetForInterval("2026-10-31", "monthly", single, "2026-09-13"),
    ).toBe(0);
    expect(
      calculateBudgetForInterval("2026-08-31", "monthly", single, "2026-09-13"),
    ).toBe(122);
  });

  it("preserves negative income targets", () => {
    const history = [historyEntry("2025-01-01", "monthly", "-310 USD")];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      -310,
    );
  });
});

// w21/040: Update Budget on the original target's date writes a second
// directive on that date. The journal returns them newest first, and the
// older one used to stay the current target and the chart's basis.
describe("groupBudgetEntries with two targets on one date", () => {
  // Newest first, as getLedgerJournal returns them.
  const journal = [
    budgetEntry(
      "2026-08-01",
      "Expenses:Food:Groceries",
      "monthly",
      "500",
      "USD",
      "newer",
    ),
    budgetEntry(
      "2026-08-01",
      "Expenses:Food:Groceries",
      "monthly",
      "300",
      "USD",
      "older",
    ),
  ];

  it("makes the later directive the current target and last history step", () => {
    const [group] = groupBudgetEntries(journal, "2026-10-20");
    expect(group.amount).toBe("500 USD");
    expect(group.entry_hash).toBe("newer");
    expect(group.budgetHistory.map((entry) => entry.entry_hash)).toEqual([
      "older",
      "newer",
    ]);
    // History is shown newest first, current row on top.
    expect(
      selectHistoryRows(group).map((row) => [row.entry_hash, row.isCurrent]),
    ).toEqual([
      ["newer", true],
      ["older", false],
    ]);
  });

  it("budgets the later target, not the older one", () => {
    const [group] = groupBudgetEntries(journal, "2026-10-20");
    const budgeted = budgetForInterval(
      "2026-10-31",
      "monthly",
      prepareBudgetHistory(group.budgetHistory),
      "2026-10-20",
    );
    expect(budgeted).toBe(500);
  });

  it("returns to the older target once the later one is deleted", () => {
    const [group] = groupBudgetEntries([journal[1]], "2026-10-20");
    expect(group.amount).toBe("300 USD");
  });
});
