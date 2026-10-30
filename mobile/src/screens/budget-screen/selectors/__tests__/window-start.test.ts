import { calculateBudgetForInterval } from "../budget-selectors";
import { timeSpanToFilter, timeWindowStart } from "../budget-labels";

// w21/102: the server starts a window's series on its first day, but the first
// bar was held to its whole calendar period's budget.
const history = (interval: string, amount: string) => [
  { date: "2025-01-01", interval, amount, entry_hash: "h" },
];

describe("a window's clipped first period", () => {
  it("budgets 1Y's first month whole: it starts on the 1st", () => {
    const start = timeWindowStart(timeSpanToFilter("last-12m", "2026-10-21"));
    expect(start).toBe("2025-11-01");
    expect(
      calculateBudgetForInterval(
        "2025-11-30",
        "monthly",
        history("monthly", "310 USD"),
        "2026-10-21",
        start,
      ),
    ).toBe(310);
  });

  it("budgets YTD's first week from Thursday 1 January", () => {
    const start = timeWindowStart(timeSpanToFilter("this-year", "2026-10-21"));
    expect(start).toBe("2026-01-01");
    // 70 × 4/7
    expect(
      calculateBudgetForInterval(
        "2026-01-04",
        "weekly",
        history("weekly", "70 USD"),
        "2026-10-21",
        start,
      ),
    ).toBe(40);
  });

  it("clips a window's start but not its end when the only period is also the current one", () => {
    // 2 January: the first week is clipped at its start and in progress, so it
    // is budgeted from the 1st through its end: 4 days of 10 (w21/994).
    expect(
      calculateBudgetForInterval(
        "2026-01-04",
        "weekly",
        history("weekly", "70 USD"),
        "2026-01-02",
        "2026-01-01",
      ),
    ).toBe(40);
  });

  it("leaves full periods and all time unchanged", () => {
    expect(
      calculateBudgetForInterval(
        "2025-11-30",
        "monthly",
        history("monthly", "310 USD"),
        "2026-10-21",
        "2025-10-21",
      ),
    ).toBe(310);
    expect(timeWindowStart(undefined)).toBe(undefined);
    expect(timeWindowStart("year-1", "2026-10-21")).toBe("2025-01-01");
  });
});
