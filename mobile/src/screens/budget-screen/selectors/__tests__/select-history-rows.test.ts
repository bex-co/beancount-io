import { selectHistoryRows } from "../budget-selectors";
import type { BudgetGroup } from "../budget-selectors";

/**
 * Builds the shape `groupBudgetEntries` actually produces: `entry_hash` is the
 * entry **in effect** on `activeDate`, not simply the newest one.
 */
function group(
  entries: Array<[string, string, string]>,
  activeDate: string,
): BudgetGroup {
  const history = entries.map(([date, interval, amount]) => ({
    date,
    interval,
    amount,
    entry_hash: `hash-${date}`,
  }));
  const current =
    [...history].reverse().find((entry) => entry.date <= activeDate) ??
    history[0];
  return {
    account: "Expenses:Food",
    interval: current.interval,
    currency: "USD",
    amount: current.amount,
    value: Number.parseFloat(current.amount),
    entry_hash: current.entry_hash,
    budgetHistory: history,
  };
}

describe("selectHistoryRows", () => {
  it("lists the newest entry first", () => {
    const rows = selectHistoryRows(
      group(
        [
          ["2025-01-01", "monthly", "300 USD"],
          ["2025-06-01", "monthly", "400 USD"],
          ["2025-09-01", "monthly", "500 USD"],
        ],
        "2025-12-31",
      ),
    );

    expect(rows.map((row) => row.date)).toEqual([
      "2025-09-01",
      "2025-06-01",
      "2025-01-01",
    ]);
  });

  it("marks the entry in effect today as current", () => {
    const rows = selectHistoryRows(
      group(
        [
          ["2025-01-01", "monthly", "300 USD"],
          ["2025-06-01", "monthly", "400 USD"],
        ],
        "2025-03-15",
      ),
    );

    const current = rows.filter((row) => row.isCurrent);
    expect(current.length).toBe(1);
    expect(current[0].date).toBe("2025-01-01");
  });

  it("does not mark a future-dated entry as current even though it sorts first", () => {
    const rows = selectHistoryRows(
      group(
        [
          ["2025-01-01", "monthly", "300 USD"],
          ["2026-01-01", "monthly", "600 USD"],
        ],
        "2025-08-09",
      ),
    );

    expect(rows[0].date).toBe("2026-01-01");
    expect(rows[0].isCurrent).toBeFalsy();
    expect(rows[1].isCurrent).toBeTruthy();
  });

  it("falls back to the earliest entry when every entry is in the future", () => {
    const rows = selectHistoryRows(
      group(
        [
          ["2030-01-01", "monthly", "300 USD"],
          ["2031-01-01", "monthly", "400 USD"],
        ],
        "2026-08-09",
      ),
    );

    const current = rows.filter((row) => row.isCurrent);
    expect(current.length).toBe(1);
    expect(current[0].date).toBe("2030-01-01");
  });

  it("handles a single-entry budget, the common case", () => {
    const rows = selectHistoryRows(
      group([["2025-01-01", "monthly", "300 USD"]], "2025-08-09"),
    );

    expect(rows.length).toBe(1);
    expect(rows[0].isCurrent).toBeTruthy();
  });
});
