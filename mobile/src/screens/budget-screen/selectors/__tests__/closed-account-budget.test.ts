import fs from "fs";
import path from "path";
import {
  closeDatesOf,
  budgetEndsOn,
  closedBefore,
} from "../../../../common/account-close-dates";
import {
  budgetForInterval,
  calculateBudgetForInterval,
  prepareBudgetHistory,
  type BudgetHistoryEntry,
} from "../budget-selectors";

// w21/398: a budget on a closed account kept running: a former job's income
// target went red every month after the close and outranked real overspends.
const history: BudgetHistoryEntry[] = [
  {
    date: "2026-01-01",
    interval: "monthly",
    amount: "-3000 USD",
    entry_hash: "h1",
  },
];

describe("a budget on an account that closed", () => {
  it("applies in full until the close, and nothing for later periods", () => {
    const prepared = prepareBudgetHistory(history);
    const at = (end: string, endsOn?: string) =>
      budgetForInterval(
        end,
        "monthly",
        prepared,
        "2026-10-21",
        undefined,
        endsOn,
      );
    expect(at("2026-05-31", "2026-06-30")).toBe(-3000);
    expect(at("2026-06-30", "2026-06-30")).toBe(-3000);
    expect(at("2026-07-31", "2026-06-30")).toBe(0);
    expect(at("2026-10-31", "2026-06-30")).toBe(0);
    // Without a close date it runs on, as before.
    expect(at("2026-07-31")).toBe(-3000);
  });

  it("budgets the period containing the close only up to it", () => {
    const partial = calculateBudgetForInterval(
      "2026-06-30",
      "monthly",
      history,
      "2026-10-21",
      undefined,
      "2026-06-15",
    );
    // 15 of June's 30 days.
    expect(Math.round(partial)).toBe(-1500);
  });

  it("is closed before a day only once that day has passed", () => {
    const closeDates = closeDatesOf([
      { account: "Income:Salary:OldCo", closedAt: "2026-06-30" },
    ]);
    expect(closedBefore("Income:Salary:OldCo", "2026-07-01", closeDates)).toBe(
      true,
    );
    expect(closedBefore("Income:Salary:OldCo", "2026-06-30", closeDates)).toBe(
      false,
    );
    expect(closedBefore("Income:Salary", "2026-10-21", closeDates)).toBe(false);
  });

  // w21/486: a parent closed when it was split into children that took over
  // read $0 and red "Above target" every month, and left Home.
  describe("a parent account closed when it was split into children", () => {
    const closeDates = closeDatesOf([
      {
        account: "Expenses:Food",
        closedAt: "2026-06-30",
        openedAt: "2024-01-01",
      },
      { account: "Expenses:Food:Groceries", openedAt: "2026-06-01" },
      { account: "Expenses:Food:Restaurants", openedAt: "2026-06-01" },
      {
        account: "Expenses:Old",
        closedAt: "2026-06-30",
        openedAt: "2024-01-01",
      },
    ]);

    it("runs on while any account beneath it is open", () => {
      expect(budgetEndsOn("Expenses:Food", closeDates)).toBe(undefined);
      expect(closedBefore("Expenses:Food", "2026-10-21", closeDates)).toBe(
        false,
      );
    });

    it("ends at the last close once every account beneath it is closed", () => {
      const allClosed = closeDatesOf([
        { account: "Expenses:Food", closedAt: "2026-06-30" },
        { account: "Expenses:Food:Groceries", closedAt: "2026-09-30" },
        { account: "Expenses:Food:Restaurants", closedAt: "2026-08-15" },
      ]);
      expect(budgetEndsOn("Expenses:Food", allClosed)).toBe("2026-09-30");
      expect(closedBefore("Expenses:Food", "2026-10-01", allClosed)).toBe(true);
      expect(closedBefore("Expenses:Food", "2026-09-30", allClosed)).toBe(
        false,
      );
    });

    it("still ends a closed leaf at its own close", () => {
      expect(budgetEndsOn("Expenses:Old", closeDates)).toBe("2026-06-30");
      expect(closedBefore("Expenses:Old", "2026-07-01", closeDates)).toBe(true);
    });

    it("keeps a sibling with a similar name apart", () => {
      const siblings = closeDatesOf([
        {
          account: "Expenses:Food",
          closedAt: "2026-06-30",
          openedAt: "2024-01-01",
        },
        { account: "Expenses:Foodie", openedAt: "2026-01-01" },
      ]);
      expect(budgetEndsOn("Expenses:Food", siblings)).toBe("2026-06-30");
    });

    it("keeps the budget at its 500 target from July on", () => {
      const history = [
        {
          date: "2026-01-01",
          interval: "monthly",
          amount: "500 USD",
          entry_hash: "h",
        },
      ];
      const at = (date: string) =>
        calculateBudgetForInterval(
          date,
          "monthly",
          history,
          "2026-10-21",
          undefined,
          budgetEndsOn("Expenses:Food", closeDates),
        );
      expect(at("2026-07-31")).toBe(500);
      expect(at("2026-09-30")).toBe(500);
    });
  });

  it("the card ends its budget at the close and Home leaves the budget out", () => {
    const read = (relative: string) =>
      fs
        .readFileSync(path.join(__dirname, "../../..", relative), "utf8")
        .replace(/\s+/g, "");
    const card = read("budget-screen/components/budget-group-card.tsx");
    expect(
      card.includes("constendsOn=budgetEndsOn(group.account,closeDates);"),
    ).toBe(true);
    expect(card.includes("direction,endsOn,budgetedCurrencies,});")).toBe(true);
    const home = read("home-screen/components/budget-card.tsx");
    expect(
      home.includes(
        "groups.filter((g)=>!closedBefore(g.account,today,closeDates))",
      ),
    ).toBe(true);
    expect(home.includes("groups:liveGroups,")).toBe(true);
  });
});

// w21/399: an income target's stored negative text printed unformatted in the
// history rows, the Delete alert and the Update placeholder.
describe("a budget entry's amount in history", () => {
  const { formatBudgetEntryAmount } = require("../budget-selectors");

  it("reads as the magnitude, grouped, with its currency", () => {
    expect(formatBudgetEntryAmount("-4250.50 USD", "USD")).toBe("$4,250.50");
    expect(formatBudgetEntryAmount("4250.50 USD", "USD")).toBe("$4,250.50");
    expect(formatBudgetEntryAmount("-300 USD", "USD")).toBe("$300.00");
  });

  it("keeps a fractional commodity's own precision and a missing currency", () => {
    expect(formatBudgetEntryAmount("-0.003 BTC", "BTC")).toBe("0.003 BTC");
    expect(formatBudgetEntryAmount("-500", "USD")).toBe("$500.00");
    expect(formatBudgetEntryAmount("lots", "USD")).toBe("lots");
  });

  it("is what the row, the alert and the Delete label print", () => {
    const src = fs
      .readFileSync(
        path.join(__dirname, "../../components/budget-history-rows.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(src.split("formatBudgetEntryAmount(").length - 1).toBe(3);
    expect(/\{row\.amount\}|amount:row\.amount/.test(src)).toBe(false);
  });
});
