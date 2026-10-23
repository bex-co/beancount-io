import { describe, expect, it } from "vitest";
import {
  budgetGroupDirection,
  calculateBudgetForInterval,
  groupBudgetEntries,
  readSparseBalanceAmount,
} from "../budget-utils";
import type { BudgetEntry, BudgetHistoryEntry } from "../types";

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
    directive_type: "Custom",
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
  it("makes the later of two same-date directives current (w4/232)", () => {
    // Newest first, as the journal returns them; the second write is a cadence change.
    const groups = groupBudgetEntries(
      [
        budgetEntry(
          "2026-10-20",
          "Expenses:Food",
          "weekly",
          "50",
          "USD",
          "newer",
        ),
        budgetEntry(
          "2026-10-20",
          "Expenses:Food",
          "monthly",
          "123.45",
          "USD",
          "older",
        ),
        budgetEntry(
          "2026-09-01",
          "Expenses:Food",
          "monthly",
          "100",
          "USD",
          "first",
        ),
      ],
      "2026-10-25",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      interval: "weekly",
      amount: "50 USD",
      entry_hash: "newer",
    });
    expect(groups[0].budgetHistory.map((entry) => entry.entry_hash)).toEqual([
      "first",
      "older",
      "newer",
    ]);
    // From 2026-10-20 on, the weekly 50 applies, never the older monthly target.
    // 50 / 7 = 7.142857…, rounded once to the two places asked for.
    expect(
      calculateBudgetForInterval(
        "2026-10-25",
        "day",
        groups[0].budgetHistory,
        2,
      ),
    ).toBe("7.14");
  });

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

    expect(groups).toHaveLength(2);
    const usd = groups.find((group) => group.currency === "USD");
    expect(usd).toMatchObject({
      account: "Expenses:Food",
      interval: "weekly",
      amount: "80 USD",
      entry_hash: "usd-new",
    });
    expect(usd?.budgetHistory.map((entry) => entry.interval)).toEqual([
      "monthly",
      "weekly",
    ]);
  });

  it("ignores malformed directives instead of rendering empty cards", () => {
    const malformed: BudgetEntry = {
      date: "2025-01-01",
      entry_hash: "bad",
      directive_type: "Custom",
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

    expect(groups[0]).toMatchObject({
      interval: "monthly",
      amount: "200 USD",
      entry_hash: "current",
    });
  });
});

describe("calculateBudgetForInterval", () => {
  it("converts a monthly target to its daily equivalent", () => {
    const history = [historyEntry("2025-01-01", "monthly", "310 USD")];

    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", history, 2),
    ).toBe("310.00");
    expect(calculateBudgetForInterval("2025-01-12", "weekly", history, 2)).toBe(
      "70.00",
    );
  });

  it("does not apply a directive before its effective date", () => {
    const history = [historyEntry("2025-01-16", "monthly", "310 USD")];

    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", history, 2),
    ).toBe("160.00");
  });

  it("prorates a cadence change in the middle of a chart period", () => {
    const history = [
      historyEntry("2025-01-01", "monthly", "310 USD"),
      historyEntry("2025-01-16", "daily", "20 USD"),
    ];

    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", history, 2),
    ).toBe("470.00");
  });

  it("preserves negative income targets", () => {
    const history = [historyEntry("2025-01-01", "monthly", "-310 USD")];

    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", history, 2),
    ).toBe("-310.00");
  });
});

describe("readSparseBalanceAmount", () => {
  it("treats a missing currency on a returned interval as zero", () => {
    expect(readSparseBalanceAmount({}, "USD")).toBe("0");
    expect(readSparseBalanceAmount({ EUR: "10" }, "USD", 1)).toBe("0");
  });

  it("parses present amounts and applies display direction", () => {
    expect(readSparseBalanceAmount({ USD: "600" }, "USD")).toBe("600");
    expect(readSparseBalanceAmount({ USD: "1650" }, "USD", -1)).toBe("-1650");
    // The ledger's decimal, not a double (w4/m55).
    expect(readSparseBalanceAmount({ USD: "9007199254740993" }, "USD")).toBe(
      "9007199254740993",
    );
  });

  it("keeps malformed amounts distinct from sparse zeros", () => {
    expect(readSparseBalanceAmount({ USD: "not-a-number" }, "USD")).toBeNull();
  });
});

// w21/475: a zeroed income target stores "0", whose sign says nothing, and the
// chart ran on expense rules.
describe("budgetGroupDirection", () => {
  const group = (amounts: string[]) => ({
    amount: amounts[amounts.length - 1]!,
    budgetHistory: amounts.map((amount, index) =>
      historyEntry(`2026-0${index + 1}-01`, "monthly", amount),
    ),
  });

  it("is income for a negative target and expense for a positive one", () => {
    expect(budgetGroupDirection(group(["-3000 USD"]))).toBe(-1);
    expect(budgetGroupDirection(group(["300 USD"]))).toBe(1);
  });

  it("keeps an income target's direction after it is zeroed", () => {
    expect(budgetGroupDirection(group(["-3000 USD", "0 USD"]))).toBe(-1);
    expect(
      budgetGroupDirection(group(["-3000 USD", "-3500 USD", "0 USD", "0 USD"])),
    ).toBe(-1);
  });

  it("lets the newest entry with a sign decide", () => {
    expect(budgetGroupDirection(group(["-3000 USD", "200 USD"]))).toBe(1);
    expect(budgetGroupDirection(group(["200 USD", "-3000 USD", "0 USD"]))).toBe(
      -1,
    );
  });

  it("reads a budget that was only ever zero as an expense cap", () => {
    expect(budgetGroupDirection(group(["0 USD"]))).toBe(1);
    expect(budgetGroupDirection(group(["0 USD", "0 USD"]))).toBe(1);
  });
});
