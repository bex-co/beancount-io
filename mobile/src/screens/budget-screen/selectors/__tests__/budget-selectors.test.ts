/**
 * Ported verbatim (case-for-case, same fixtures) from the dashboard's
 * `budget-utils.test.ts`. These cases are the contract for the date-fns-free
 * port in `budget-selectors.ts`: if mobile and dashboard ever disagree here,
 * mobile is wrong. Matchers are adapted to the jest-lite runner's set
 * (no toMatchObject / toHaveLength).
 */
import {
  calculateBudgetForInterval,
  groupBudgetEntries,
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

  it("does not apply a directive before its effective date", () => {
    const history = [historyEntry("2025-01-16", "monthly", "310 USD")];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      160,
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

  it("preserves negative income targets", () => {
    const history = [historyEntry("2025-01-01", "monthly", "-310 USD")];

    expect(calculateBudgetForInterval("2025-01-31", "monthly", history)).toBe(
      -310,
    );
  });
});
