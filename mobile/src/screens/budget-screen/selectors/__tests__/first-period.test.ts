import {
  calculateBudgetForInterval,
  type BudgetGroup,
} from "../budget-selectors";
import {
  selectBudgetCardStats,
  selectPointFavorability,
} from "../select-budget-card-stats";
import { selectBudgetPanelRows } from "../../../home-screen/selectors/select-budget-panel";

// w21/301: a new budget read "Above target" the moment it was saved: its first
// period was budgeted from the day it was set, but judged against the whole
// period's spending. Recorded choice: the first directive back-fills the period
// it falls in.
const TODAY = "2026-10-21";
const entry = (date: string, interval: string, amount: string) => ({
  date,
  interval,
  amount,
  entry_hash: `${date}-h`,
});
const group = (
  interval: string,
  amount: string,
  date = TODAY,
): BudgetGroup => ({
  account: "Expenses:QaBudNew",
  interval,
  currency: "USD",
  amount,
  value: Number.parseFloat(amount),
  entry_hash: "h",
  budgetHistory: [entry(date, interval, amount)],
});

describe("a budget set during its first period", () => {
  it("budgets monthly from the period's start, not from the day it was set", () => {
    const g = group("monthly", "500 USD");
    // The period in progress is judged against its full target, not prorated
    // to today (w21/994).
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      g.budgetHistory,
      TODAY,
    );
    expect(budget).toBe(500);
    const stats = selectBudgetCardStats(
      g,
      [{ date: "2026-10-31", actual: 300, budget }],
      TODAY,
    );
    expect(stats.status).toBe("below");
    expect(stats.favorable).toBe(true);
    expect(Math.round(stats.progressPercent ?? 0)).toBe(60);
  });

  it("covers a whole past period the same way", () => {
    expect(
      calculateBudgetForInterval(
        "2026-09-30",
        "monthly",
        group("monthly", "500 USD", "2026-09-16").budgetHistory,
      ),
    ).toBe(500);
  });

  it("does the same for weekly and quarterly budgets", () => {
    // Wednesday 2026-10-21 in a week starting Monday the 19th.
    const weekly = calculateBudgetForInterval(
      "2026-10-25",
      "weekly",
      group("weekly", "70 USD").budgetHistory,
      TODAY,
    );
    expect(weekly).toBe(70);
    const stats = selectBudgetCardStats(
      group("weekly", "70 USD"),
      [{ date: "2026-10-25", actual: 20, budget: weekly }],
      TODAY,
    );
    expect(stats.status).toBe("below");
    const quarterly = calculateBudgetForInterval(
      "2026-12-31",
      "quarterly",
      group("quarterly", "900 USD").budgetHistory,
      TODAY,
    );
    expect(quarterly).toBe(900);
    expect(
      selectBudgetCardStats(
        group("quarterly", "900 USD"),
        [{ date: "2026-12-31", actual: 100, budget: quarterly }],
        TODAY,
      ).status,
    ).toBe("below");
  });

  it("gives Home a real target, not 1860% used", () => {
    const [row] = selectBudgetPanelRows(
      [
        {
          group: group("monthly", "500 USD"),
          actual: 300,
          periodEnd: "2026-10-31",
        },
      ],
      3,
      TODAY,
    );
    expect(row!.noBudget).toBe(false);
    expect(row!.status).toBe("below");
    expect(Math.round(row!.progressPercent)).toBe(60);
  });

  it("leaves a budget not yet started unjudged, with its start date", () => {
    const g = group("monthly", "500 USD", "2026-10-28");
    const budget = calculateBudgetForInterval(
      "2026-10-31",
      "monthly",
      g.budgetHistory,
      TODAY,
    );
    expect(budget).toBe(0);
    const stats = selectBudgetCardStats(
      g,
      [{ date: "2026-10-31", actual: 300, budget }],
      TODAY,
    );
    expect(stats.status).toBe(null);
    expect(stats.startsOn).toBe("2026-10-28");
    expect(
      selectPointFavorability(
        [{ date: "2026-10-31", actual: 300, budget }],
        1,
        g.budgetHistory,
        TODAY,
      ),
    ).toEqual([null]);
  });

  it("still judges a budget that started in an earlier period as before", () => {
    const g = group("monthly", "500 USD", "2026-01-01");
    const stats = selectBudgetCardStats(
      g,
      [{ date: "2026-10-31", actual: 600, budget: 500 }],
      TODAY,
    );
    expect(stats.status).toBe("above");
  });
});

// w21/994: the period in progress is judged against its full target, as the web
// dashboard does. The same fixture runs in the dashboard's budget-headline
// tests, so one ledger gives one verdict in both apps.
describe("the verdict on a month in progress", () => {
  const history = [entry("2026-01-01", "monthly", "310 USD")];
  const cases = [
    { today: "2026-10-24", spent: 200, target: 310, variance: -110 },
    { today: "2026-10-01", spent: 200, target: 310, variance: -110 },
    { today: "2026-10-31", spent: 320, target: 310, variance: 10 },
  ];

  for (const { today, spent, target, variance } of cases) {
    it(`judges ${spent} against the whole ${target} on ${today}`, () => {
      const budget = calculateBudgetForInterval(
        "2026-10-31",
        "monthly",
        history,
        today,
      );
      expect(budget).toBe(target);
      expect(spent - budget).toBe(variance);
    });
  }
});
