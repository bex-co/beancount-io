import fs from "fs";
import path from "path";
import {
  budgetForIntervalExact,
  budgetedThrough,
  prepareBudgetHistory,
} from "../budget-selectors";

// w22/015: on the 10th the Budget screen read "Budget $40.67" for a Monthly
// $122 target, 122 x 10/30, while Home and the dashboard read the full $122.00
// (w21/994). A window that runs through today dates its last row today rather
// than at its period's end, and the budget was walked only up to that day.
const TODAY = "2026-11-10";
const entry = (date: string) => ({
  date,
  interval: "monthly",
  amount: "122 USD",
  entry_hash: `${date}-h`,
});
// Two identical directives, as the QA ledger had.
const history = prepareBudgetHistory([
  entry("2026-08-27"),
  entry("2026-08-27"),
]);

/** What the hook budgets a row dated `date` to, with today as the 10th. */
const budget = (
  date: string,
  options: { windowStart?: string; endsOn?: string } = {},
) =>
  budgetForIntervalExact(
    budgetedThrough(date, "monthly", TODAY),
    "monthly",
    history,
    TODAY,
    options.windowStart,
    options.endsOn,
  );

describe("budgetedThrough", () => {
  it("takes the row dated today to the end of its own period", () => {
    expect(budgetedThrough(TODAY, "monthly", TODAY)).toBe("2026-11-30");
    expect(budgetedThrough(TODAY, "weekly", TODAY)).toBe("2026-11-15");
    expect(budgetedThrough(TODAY, "quarterly", TODAY)).toBe("2026-12-31");
    expect(budgetedThrough(TODAY, "yearly", TODAY)).toBe("2026-12-31");
  });

  it("leaves a daily budget on the day it is", () => {
    expect(budgetedThrough(TODAY, "daily", TODAY)).toBe(TODAY);
  });

  it("leaves every other date as it is", () => {
    // A period end, the end of a window that finished before today, and the
    // first day of the period in progress.
    for (const date of ["2026-10-31", "2026-10-15", "2026-11-01"]) {
      expect(budgetedThrough(date, "monthly", TODAY)).toBe(date);
    }
  });
});

describe("the period in progress on the Budget screen", () => {
  it("is judged against its full target, as Home shows it", () => {
    expect(budget(TODAY)).toBe("122.00");
    // The months that finished already read the same.
    expect(budget("2026-10-31")).toBe("122.00");
  });

  it("was the target prorated to today before the row was mapped", () => {
    // The function still clips a date it is given, which a window that ended
    // early relies on; the fix is the date it is handed.
    expect(budgetForIntervalExact(TODAY, "monthly", history, TODAY)).toBe(
      "40.67",
    );
  });
});

describe("the cases that clip on purpose, still", () => {
  it("ends a window that finished before today with the window", () => {
    // w21/764: Oct 1 to Oct 15 of a 31-day month.
    expect(budget("2026-10-15")).toBe("59.03");
  });

  it("starts a window's first period where the window starts", () => {
    // w21/102: Nov 5 to Nov 30 is 26 of 30 days.
    expect(budget(TODAY, { windowStart: "2026-11-05" })).toBe("105.73");
  });

  it("ends a closed account's budget with the account", () => {
    // w21/398: Nov 1 to Nov 3 is 3 of 30 days.
    expect(budget(TODAY, { endsOn: "2026-11-03" })).toBe("12.20");
  });

  it("gives a period that has not begun no budget", () => {
    expect(
      budgetForIntervalExact(
        budgetedThrough("2026-12-31", "monthly", TODAY),
        "monthly",
        history,
        TODAY,
      ),
    ).toBe("0");
  });
});

describe("the Budget screen's series", () => {
  it("budgets each charted row through budgetedThrough", () => {
    const hook = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "hooks", "use-budget-actuals.ts"),
        "utf8",
      )
      .replace(/\/\/.*$/gm, "")
      .replace(/\s+/g, "");
    expect(
      hook.includes(
        "budgetForIntervalExact(budgetedThrough(date,group.interval,today),group.interval,",
      ),
    ).toBe(true);
  });
});
