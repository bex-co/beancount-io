import { buildBudgetEntry } from "../build-budget-entry";

describe("buildBudgetEntry", () => {
  const base = {
    account: "Expenses:Food:Groceries",
    interval: "MONTHLY",
    number: "500",
    currency: "USD",
    date: new Date(2026, 7, 9),
  };

  it("dates the entry by the local calendar, not a UTC-shifted day", () => {
    // Late local evening in a negative-offset zone rolls forward under
    // toISOString(); the shared formatter must not.
    const entry = buildBudgetEntry({
      ...base,
      date: new Date(2026, 0, 31, 23, 30),
    });

    expect(entry.budget?.date).toBe("2026-01-31");
  });

  it("builds the budget entry the schema expects", () => {
    expect(buildBudgetEntry(base)).toEqual({
      type: "BUDGET",
      budget: {
        account: "Expenses:Food:Groceries",
        interval: "MONTHLY",
        date: "2026-08-09",
        amount: { number: "500", currency: "USD" },
      },
    });
  });

  it("preserves a negative amount, which declares an income target", () => {
    const entry = buildBudgetEntry({ ...base, number: "-5000" });

    expect(entry.budget?.amount.number).toBe("-5000");
  });

  it("passes decimals through verbatim rather than coercing to a number", () => {
    const entry = buildBudgetEntry({ ...base, number: "1234.50" });

    expect(entry.budget?.amount.number).toBe("1234.50");
  });

  it("normalizes stray whitespace and casing from the form", () => {
    const entry = buildBudgetEntry({
      ...base,
      account: "  Expenses:Food  ",
      currency: " usd ",
      number: " 500 ",
      interval: "monthly",
    });

    expect(entry.budget?.account).toBe("Expenses:Food");
    expect(entry.budget?.amount.currency).toBe("USD");
    expect(entry.budget?.amount.number).toBe("500");
    expect(String(entry.budget?.interval)).toBe("MONTHLY");
  });
});
