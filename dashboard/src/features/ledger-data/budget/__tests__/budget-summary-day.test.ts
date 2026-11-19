import { describe, expect, it } from "vitest";
import { budgetSummaryDay } from "../budget-snapshot";
import { budgetPeriodName } from "../budget-utils";

describe("the day a Budget page summarises", () => {
  it("is today for a ledger in use", () => {
    expect(budgetSummaryDay("2026-11-19", "2026-11-12")).toBe("2026-11-19");
    expect(budgetSummaryDay("2026-11-19", null)).toBe("2026-11-19");
  });

  it("is the end of the last whole month for a ledger that stopped", () => {
    // Data through 2025-10-11: October is partial, September is whole.
    expect(budgetSummaryDay("2026-11-19", "2025-10-11")).toBe("2025-09-30");
    // Data through a month's last day: that month is whole.
    expect(budgetSummaryDay("2026-11-19", "2025-10-31")).toBe("2025-10-31");
  });
});

describe("a budget period's name", () => {
  const quarter = (q: number, y: number) => `Q${q} ${y}`;
  const week = (d: string) => `Week of ${d}`;

  it.each([
    ["2025-09-01", "MONTHLY", "September 2025"],
    ["2025-07-01", "QUARTERLY", "Q3 2025"],
    ["2025-01-01", "YEARLY", "2025"],
    ["2025-09-22", "WEEKLY", "Week of 2025-09-22"],
    ["2025-09-30", "DAILY", "2025-09-30"],
  ])("names %s (%s) %s", (start, interval, name) => {
    expect(budgetPeriodName(start, interval, "en", quarter, week)).toBe(name);
  });
});
