import fs from "fs";
import path from "path";
import {
  budgetForInterval,
  periodsBetween,
  periodsThrough,
  prepareBudgetHistory,
  allTimeThroughToday,
  type BudgetGroup,
} from "../budget-selectors";
import { selectBudgetCardStats } from "../select-budget-card-stats";

// ALL used to end at the ledger's last posting: a budget active since then
// lost its unspent months and the card reported August as the current period
// on 2026-10-20 (w21/010). The series now runs through today, as YTD's does.
const TODAY = "2026-10-20";
const groceries: BudgetGroup = {
  account: "Expenses:Food:Groceries",
  interval: "monthly",
  currency: "USD",
  amount: "300 USD",
  value: 300,
  entry_hash: "hash",
  budgetHistory: [
    {
      date: "2026-08-01",
      interval: "monthly",
      amount: "300 USD",
      entry_hash: "h",
    },
  ],
};

describe("periodsThrough", () => {
  it("adds the periods after the last posting through the current one", () => {
    expect(periodsThrough("2026-08-31", "monthly", TODAY)).toEqual([
      "2026-09-30",
      "2026-10-31",
    ]);
    expect(periodsThrough("2026-08-28", "monthly", TODAY)).toEqual([
      "2026-09-30",
      "2026-10-31",
    ]);
  });

  it("adds nothing when the last posting is in the current period", () => {
    expect(periodsThrough("2026-10-05", "monthly", TODAY)).toEqual([]);
  });

  it("steps by the budget's own interval", () => {
    expect(periodsThrough("2026-10-11", "weekly", TODAY)).toEqual([
      "2026-10-18",
      "2026-10-25",
    ]);
    expect(periodsThrough("2026-03-31", "quarterly", TODAY)).toEqual([
      "2026-06-30",
      "2026-09-30",
      "2026-12-31",
    ]);
  });

  it("never loops on a malformed date", () => {
    expect(periodsThrough("not-a-date", "monthly", TODAY)).toEqual([]);
  });
});

// w21/670: the current period's row follows the last posting, and the empty
// periods between them were never filled.
describe("periodsBetween", () => {
  it("fills the months between the last posting and the current row", () => {
    // Either a period-end date or today dates the current row.
    expect(periodsBetween("2026-08-31", "monthly", "2026-10-22")).toEqual([
      "2026-09-30",
    ]);
    expect(periodsBetween("2026-08-31", "monthly", "2026-10-31")).toEqual([
      "2026-09-30",
    ]);
  });

  it("fills days and weeks of a daily or weekly budget", () => {
    expect(periodsBetween("2026-10-19", "daily", "2026-10-22")).toEqual([
      "2026-10-20",
      "2026-10-21",
    ]);
    expect(periodsBetween("2026-10-04", "weekly", "2026-10-22")).toEqual([
      "2026-10-11",
      "2026-10-18",
    ]);
  });

  it("adds nothing between neighbouring periods", () => {
    expect(periodsBetween("2026-09-30", "monthly", "2026-10-31")).toEqual([]);
    expect(periodsBetween("2026-10-05", "monthly", "2026-10-22")).toEqual([]);
  });
});

describe("Budget card on ALL", () => {
  it("reports the prorated current period, as YTD does", () => {
    const history = prepareBudgetHistory(groceries.budgetHistory);
    const point = (date: string, actual: number) => ({
      date,
      actual,
      budget: budgetForInterval(date, "monthly", history, TODAY),
    });
    const series = [
      point("2026-08-31", 180.85),
      ...periodsThrough("2026-08-31", "monthly", TODAY).map((date) =>
        point(date, 0),
      ),
    ];
    const stats = selectBudgetCardStats(groceries, series);
    // October prorated to the 20th: 300 × 20/31.
    expect(stats.budget).toBe(193.55);
    expect(stats.actual).toBe(0);
  });

  it("pads only the unwindowed range", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "..", "hooks", "use-budget-actuals.ts"),
      "utf8",
    );
    // …and only once the current period's own read is in (w21/455).
    expect(
      source
        .replace(/\s+/gu, "")
        .includes(
          "if(time===undefined&&last&&currentPeriodKnown(time,currentData)){",
        ),
    ).toBe(true);
    expect(
      source.includes("periodsThrough(last.date, group.interval, today)"),
    ).toBe(true);
  });
});

// w21/168: a pre-entered November rent cheque made every card on ALL
// describe November at a budget of 0. w21/332: cut at the end of the period,
// a pre-entered entry inside the current period still counted, so ALL read
// $300 where YTD read $0.
describe("ALL with a future-dated entry", () => {
  const item = (date: string, usd?: string) => ({
    date,
    balance: usd ? { USD: usd } : {},
  });

  it("takes the current period from the query that ends today", () => {
    // Quarterly insurance: 300 on 04-15 and 07-15, a pre-entered 11-15, and the
    // all-time query's last bucket (2026-12-31) holds the future 300.
    const fetched = [
      item("2026-03-31"),
      item("2026-06-30", "300"),
      item("2026-09-30", "300"),
      item("2026-12-31", "300"),
    ];
    const current = [item("2026-10-21")];
    expect(
      allTimeThroughToday(fetched, current, "quarterly", "2026-10-21"),
    ).toEqual([
      item("2026-03-31"),
      item("2026-06-30", "300"),
      item("2026-09-30", "300"),
      item("2026-10-21"),
    ]);
  });

  it("does the same for a monthly entry pre-entered later this month", () => {
    const fetched = [item("2026-09-30", "50"), item("2026-10-31", "80")];
    expect(
      allTimeThroughToday(
        fetched,
        [item("2026-10-21")],
        "monthly",
        "2026-10-21",
      ).map((i) => i.date),
    ).toEqual(["2026-09-30", "2026-10-21"]);
  });

  it("keeps the all-time totals of the periods that ended", () => {
    const fetched = [item("2026-08-31", "10"), item("2026-09-30", "20")];
    expect(allTimeThroughToday(fetched, [], "monthly", "2026-10-21")).toEqual(
      fetched,
    );
  });

  it("stops short of the current period until its query has landed", () => {
    const fetched = [item("2026-09-30", "20"), item("2026-10-31", "80")];
    expect(
      allTimeThroughToday(fetched, undefined, "monthly", "2026-10-21").map(
        (i) => i.date,
      ),
    ).toEqual(["2026-09-30"]);
  });

  it("is applied to the unwindowed range only", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "hooks", "use-budget-actuals.ts"),
        "utf8",
      )
      .replace(/\s+/gu, "");
    expect(
      source.includes("time===undefined?allTimeThroughToday(fetched,"),
    ).toBe(true);
    // The second query is skipped for a windowed range.
    expect(source.includes("skip:time!==undefined,")).toBe(true);
    expect(
      source.includes(
        "`${currentPeriodRange(group.interval,today).start}-${today}`",
      ),
    ).toBe(true);
  });
});
