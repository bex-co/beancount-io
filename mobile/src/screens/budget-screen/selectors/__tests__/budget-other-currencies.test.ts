import {
  selectBudgetCardStats,
  selectPointFavorability,
  standingStatus,
} from "../select-budget-card-stats";
import { signed } from "../signed-holding";
import {
  budgetPanelRowAccessibilityValue,
  selectBudgetPanelRows,
} from "../../../home-screen/selectors/select-budget-panel";
import type { BudgetGroup } from "../budget-selectors";
import { en } from "../../../../translations/en";

/**
 * w21/709: the actuals are read in the budget's currency only, so €250 spent
 * on a USD Travel budget read "Actual $0.00 · Below target" in green, with no
 * word of the euros.
 */
const travel = (amount = "300.00 USD"): BudgetGroup => ({
  account: "Expenses:Travel",
  interval: "monthly",
  currency: "USD",
  amount,
  value: Number.parseFloat(amount),
  entry_hash: "hash",
  budgetHistory: [
    { date: "2026-10-01", interval: "monthly", amount, entry_hash: "h1" },
  ],
});
const eur = (number: number) => ({ currency: "EUR", number, scale: 2 });
const point = (actual: number, notInTotal = [eur(250)]) => ({
  date: "2026-10-31",
  actual,
  budget: 222.58,
  notInTotal,
});

describe("a budget with activity in another currency", () => {
  it("names the euros and gives no status while they could change it", () => {
    const stats = selectBudgetCardStats(travel(), [point(0)], "2026-10-23");
    expect(stats.notInTotal).toEqual([eur(250)]);
    expect(stats.status).toBe(null);
    expect(stats.unjudged).toBe(true);
    // The figures in the budget's own currency stay.
    expect(stats.actual).toBe(0);
    expect(stats.variance).toBeCloseTo(-222.58, 5);
  });

  it("is unchanged for a budget spending only in its own currency", () => {
    const stats = selectBudgetCardStats(travel(), [point(0, [])], "2026-10-23");
    expect([stats.status, stats.unjudged, stats.favorable]).toEqual([
      "below",
      false,
      true,
    ]);
  });

  it("stays over its cap when the other currency only adds spending", () => {
    const stats = selectBudgetCardStats(travel(), [point(400)], "2026-10-23");
    expect([stats.status, stats.unjudged, stats.favorable]).toEqual([
      "above",
      false,
      false,
    ]);
  });

  it("judges each charted period by the same rule", () => {
    expect(
      selectPointFavorability(
        [point(0), point(0, []), point(400)],
        1,
        travel().budgetHistory,
        "2026-10-23",
        "USD",
      ),
    ).toEqual([null, true, false]);
  });
});

describe("standingStatus", () => {
  it("keeps a status the other amounts cannot overturn, and only that", () => {
    expect(standingStatus("below")).toBe("below");
    expect(standingStatus("below", [eur(250)])).toBe(null);
    expect(standingStatus("below", [eur(-20)])).toBe("below");
    expect(standingStatus("above", [eur(250)])).toBe("above");
    expect(standingStatus("above", [eur(250), eur(-20)])).toBe(null);
    expect(standingStatus("on", [eur(1)])).toBe(null);
  });
});

describe("Home's budget panel with activity in another currency", () => {
  // Echoes each key with its interpolations; the note is the English one.
  const t = (key: string, options?: Record<string, string | number>) =>
    key === "notInTotal"
      ? en.notInTotal.replace("{{amounts}}", String(options?.amounts))
      : `${key}(${Object.entries(options ?? {})
          .map(([name, value]) => `${name}=${value}`)
          .join("|")})`;

  it("carries the euros, signed as the budget reads, and says so aloud", () => {
    const [row] = selectBudgetPanelRows(
      [
        {
          group: travel(),
          actual: 0,
          periodEnd: "2026-10-31",
          notInTotal: [eur(250)],
        },
      ],
      3,
      "2026-10-23",
    );
    expect([row.unjudged, row.status]).toEqual([true, null]);
    expect(row.notInTotal).toEqual([eur(250)]);
    const spoken = budgetPanelRowAccessibilityValue(row, t);
    expect(spoken.includes("Not in total: ⁦250.00 EUR⁩")).toBe(true);
    expect(spoken.includes("budgetBelowTarget")).toBe(false);
  });

  it("reads income in another currency positive, as the actual does", () => {
    expect(signed({ ...eur(-1000), exact: "-1000.00" }, -1)).toEqual({
      ...eur(1000),
      exact: "1000.00",
    });
    expect(signed(eur(250), 1)).toEqual(eur(250));
  });
});
