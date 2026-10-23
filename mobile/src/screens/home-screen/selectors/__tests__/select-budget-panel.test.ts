import {
  budgetPanelRowAccessibilityValue,
  selectBudgetPanelRows,
} from "../select-budget-panel";
import type { BudgetPanelInput, BudgetPanelRow } from "../select-budget-panel";
import type { BudgetGroup } from "../../../budget-screen/selectors/budget-selectors";

function group(
  account: string,
  amount: string,
  interval = "monthly",
  currency = "USD",
): BudgetGroup {
  return {
    account,
    interval,
    currency,
    amount,
    value: Number.parseFloat(amount),
    entry_hash: `${account}-hash`,
    budgetHistory: [
      {
        date: "2025-01-01",
        interval,
        amount,
        entry_hash: `${account}-hash`,
      },
    ],
  };
}

function input(
  account: string,
  amount: string,
  actual: number | null,
  interval = "monthly",
): BudgetPanelInput {
  return {
    group: group(account, amount, interval),
    actual,
    periodEnd: "2025-01-31",
  };
}

describe("selectBudgetPanelRows", () => {
  it("ranks the most-consumed budgets first", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:Transport", "150 USD", 30), // 20%
        input("Expenses:Shopping", "300 USD", 340), // 113%
        input("Expenses:Food", "500 USD", 400), // 80%
      ],
      3,
    );

    expect(rows.map((row) => row.account)).toEqual([
      "Expenses:Shopping",
      "Expenses:Food",
      "Expenses:Transport",
    ]);
  });

  it("caps the row count so the panel cannot grow without bound", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:A", "100 USD", 90),
        input("Expenses:B", "100 USD", 80),
        input("Expenses:C", "100 USD", 70),
        input("Expenses:D", "100 USD", 60),
      ],
      3,
    );

    expect(rows.length).toBe(3);
    expect(rows[2].account).toBe("Expenses:C");
  });

  it("flags an expense budget over its target as unfavorable", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "300 USD", 340)],
      3,
    );

    expect(row.favorable).toBeFalsy();
    expect(row.progressPercent).toBeCloseTo((340 / 300) * 100, 5);
  });

  it("inverts favorability for income budgets, which are written negative", () => {
    // Earning 4000 against a 5000 income target is *under* target — bad.
    const [under] = selectBudgetPanelRows(
      [input("Income:Salary", "-5000 USD", -4000)],
      3,
    );
    expect(under.favorable).toBeFalsy();
    expect(under.actual).toBe(4000);

    const [over] = selectBudgetPanelRows(
      [input("Income:Salary", "-5000 USD", -5500)],
      3,
    );
    expect(over.favorable).toBeTruthy();
  });

  it("treats a budget whose actual has not loaded as unspent", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "300 USD", null)],
      3,
    );

    expect(row.actual).toBe(0);
    expect(row.progressPercent).toBe(0);
    expect(row.favorable).toBeTruthy();
  });

  it("does not divide by a zero budget", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food", "0 USD", 120)],
      3,
    );

    // Nothing to divide by: a full meter, flagged so no percent is read out
    // (w21/076), and never Infinity or NaN.
    expect(row.progressPercent).toBe(100);
    expect(row.noBudget).toBe(true);
  });

  it("breaks ties on account so row order does not depend on query timing", () => {
    const rows = selectBudgetPanelRows(
      [
        input("Expenses:Zebra", "100 USD", 50),
        input("Expenses:Apple", "100 USD", 50),
      ],
      3,
    );

    expect(rows.map((row) => row.account)).toEqual([
      "Expenses:Apple",
      "Expenses:Zebra",
    ]);
  });

  it("shortens the account for display without losing the full name", () => {
    const [row] = selectBudgetPanelRows(
      [input("Expenses:Food:Groceries", "300 USD", 100)],
      3,
    );

    expect(row.shortAccount).toBe("Food:Groceries");
    expect(row.account).toBe("Expenses:Food:Groceries");
  });

  it("prorates a weekly budget to its own current period", () => {
    // A 70/week budget over the week ending 2025-01-12 is 70, not 70/7.
    const rows = selectBudgetPanelRows(
      [
        {
          group: group("Expenses:Coffee", "70 USD", "weekly"),
          actual: 35,
          periodEnd: "2025-01-12",
        },
      ],
      3,
    );

    expect(rows[0].budget).toBe(70);
    expect(rows[0].progressPercent).toBeCloseTo(50, 5);
  });
});

describe("budgetPanelRowAccessibilityValue", () => {
  // Stands in for i18n: echoes the key plus its interpolations so a dropped
  // value is visible, which a real English string would hide behind prose.
  const t = (key: string, options?: Record<string, string | number>) =>
    options
      ? `${key}(${Object.entries(options)
          .map(([name, value]) => `${name}=${value}`)
          .join("|")})`
      : key;

  const row = (overrides: Partial<BudgetPanelRow> = {}): BudgetPanelRow => ({
    account: "Expenses:Food",
    shortAccount: "Food",
    currency: "USD",
    scale: 2,
    budget: 500,
    actual: 400,
    progressPercent: 80,
    noBudget: false,
    favorable: true,
    status: "below",
    income: false,
    notInTotal: [],
    unjudged: false,
    ...overrides,
  });

  it("announces the same amounts the row renders", () => {
    const text = budgetPanelRowAccessibilityValue(row(), t);

    expect(text.indexOf("actual=$400.00") > -1).toBe(true);
    expect(text.indexOf("budget=$500.00") > -1).toBe(true);
  });

  // w21/539: a refund month's Actual lost its minus, so "Actual $50.00" sat
  // beside "Variance -$404.84" on a $354.84 budget.
  it("keeps the minus of a refund month's actual", () => {
    const text = budgetPanelRowAccessibilityValue(
      row({ actual: -50, budget: 354.84 }),
      t,
    );

    expect(text.indexOf("actual=-$50.00") > -1).toBe(true);
    expect(text.indexOf("budget=$354.84") > -1).toBe(true);
  });

  it("rounds the meter's progress to a whole percent", () => {
    const text = budgetPanelRowAccessibilityValue(
      row({ progressPercent: 73.4166 }),
      t,
    );

    expect(text.indexOf("percent=73") > -1).toBe(true);
  });

  it("names the status a favorable budget shows", () => {
    const text = budgetPanelRowAccessibilityValue(row(), t);

    expect(text.indexOf("status=budgetBelowTarget") > -1).toBe(true);
  });

  it("names the status an overspent budget shows", () => {
    const text = budgetPanelRowAccessibilityValue(
      row({
        actual: 620,
        progressPercent: 124,
        favorable: false,
        status: "above",
      }),
      t,
    );

    expect(text.indexOf("status=budgetAboveTarget") > -1).toBe(true);
  });

  it("annotates a commodity with no symbol rather than speaking a bare number", () => {
    const text = budgetPanelRowAccessibilityValue(
      row({ currency: "MUSD", actual: 10, budget: 20 }),
      t,
    );

    expect(text.indexOf("actual=10.00 MUSD") > -1).toBe(true);
  });

  it("builds its whole text through one localized key", () => {
    expect(
      budgetPanelRowAccessibilityValue(row(), t).startsWith(
        "budgetPanelRowValue(",
      ),
    ).toBe(true);
  });
});

// w21/076: Home measured a month in progress against the whole month's budget
// while the Budget screen measured it against the budget up to today, and a 0
// budget already spent past read "0% used" and sorted last.
describe("the Home panel against the Budget screen", () => {
  const today = "2026-10-21";
  const october = (account: string, amount: string, actual: number) => ({
    ...input(account, amount, actual),
    periodEnd: "2026-10-31",
  });

  it("budgets a month in progress only up to today", () => {
    const [row] = selectBudgetPanelRows(
      [october("Expenses:QaBudFood", "300 USD", 250)],
      3,
      today,
    );
    expect(row.budget.toFixed(2)).toBe("203.23");
    expect(row.favorable).toBe(false);
    expect(Math.round(row.progressPercent)).toBe(123);
  });

  it("ranks an overspent 0 budget first, with a full meter and no percent", () => {
    const rows = selectBudgetPanelRows(
      [
        october("Expenses:Food", "300 USD", 290),
        october("Expenses:Zero", "0 USD", 80),
      ],
      3,
      today,
    );
    expect(rows[0].account).toBe("Expenses:Zero");
    expect(rows[0].noBudget).toBe(true);
    expect(rows[0].progressPercent).toBe(100);
    expect(rows[0].favorable).toBe(false);
    const spoken = budgetPanelRowAccessibilityValue(
      rows[0],
      (key, options) => `${key} ${JSON.stringify(options)}`,
    );
    expect(spoken.startsWith("budgetPanelRowValueNoBudget ")).toBe(true);
    expect(spoken.includes("percent")).toBe(false);
  });

  it("is given today by the panel hook", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "hooks",
        "use-budget-panel.ts",
      ),
      "utf8",
    ) as string;
    // The watched day (w21/233), not a clock read when the reads settle.
    expect(source.includes("const today = useToday();")).toBe(true);
    expect(source.includes("timeWindowStart(time, today),")).toBe(true);
  });
});

// w21/218: the panel announced a beaten income target as "Below target" and
// ranked it as the budget most at risk.
describe("the Home panel's status wording and ranking", () => {
  const t = (key: string) => key;
  const today = "2026-10-21";
  const entry = (account: string, amount: string, actual: number) => ({
    ...input(account, amount, actual),
    periodEnd: "2026-10-31",
  });
  const speak = (
    account: string,
    amount: string,
    actual: number,
    asOf = "2026-10-31",
  ) => {
    const [row] = selectBudgetPanelRows(
      [entry(account, amount, actual)],
      3,
      asOf,
    );
    return budgetPanelRowAccessibilityValue(row, (key, options) =>
      key === "budgetPanelRowValue" && options
        ? `${key}|${String(options.status)}`
        : t(key),
    );
  };

  it("says what the Budget card says for an income target", () => {
    // Income reads negative in the ledger. Earned 1,500 against a 1,000 target: above it, which is the good side.
    expect(
      speak("Income:Salary", "-1000 USD", -1500).endsWith("budgetAboveTarget"),
    ).toBe(true);
    // Earned 400 against 1,000: below, and unfavorable.
    expect(
      speak("Income:Salary", "-1000 USD", -400).endsWith("budgetBelowTarget"),
    ).toBe(true);
  });

  it("says on target when spending matches the cap exactly", () => {
    expect(
      speak("Expenses:Rent", "1500 USD", 1500).endsWith("budgetOnTarget"),
    ).toBe(true);
  });

  it("ranks the budgets worth knowing about, not the highest utilization", () => {
    // Salary beaten (150%), Fun over (120%), Rent on target (100%), Food just
    // under its cap (96.7%) and Freelance far behind its income target (10%).
    const rows = selectBudgetPanelRows(
      [
        entry("Income:Salary", "-1000 USD", -1500),
        entry("Expenses:Fun", "100 USD", 120),
        entry("Expenses:Rent", "1500 USD", 1500),
        entry("Expenses:Food", "600 USD", 580),
        entry("Income:Freelance", "-1000 USD", -100),
      ],
      5,
      "2026-10-31",
    );
    expect(rows.map((row) => row.shortAccount)).toEqual([
      "Freelance", // 90 points short of its target
      "Fun", // 20 points over its cap
      "Rent", // at its cap
      "Food", // 96.7% of its cap
      "Salary", // a beaten income target needs no action
    ]);
    expect(rows.length).toBe(5);
  });

  it("keeps a zero budget already spent past first, and a future budget last", () => {
    const rows = selectBudgetPanelRows(
      [
        entry("Expenses:Fun", "100 USD", 120),
        entry("Expenses:Zero", "0 USD", 30),
        entry("Income:Salary", "-1000 USD", -1500),
      ],
      3,
      today,
    );
    expect(rows[0].shortAccount).toBe("Zero");
  });
});

// w21/377: a salary paid once a month reads 0% "Below target" until payday, which
// scored as the biggest miss and pushed an expense at 96% of its cap out.
describe("an income target behind mid-period", () => {
  const midMonth = (account: string, amount: string, actual: number) => ({
    ...input(account, amount, actual),
    periodEnd: "2025-01-31",
  });
  const rows = (asOf: string) =>
    selectBudgetPanelRows(
      [
        midMonth("Income:Salary", "-5000 USD", 0),
        midMonth("Expenses:Shopping", "300 USD", 200),
        midMonth("Expenses:Food", "600 USD", 288),
        midMonth("Expenses:Transport", "150 USD", 70),
      ],
      3,
      asOf,
    ).map((row) => row.shortAccount);

  it("does not outrank the expenses closest to their caps", () => {
    const names = rows("2025-01-15");
    expect(names.includes("Salary")).toBe(false);
    expect(names.length).toBe(3);
  });

  it("is a miss once its period is over", () => {
    expect(rows("2025-01-31")[0]).toBe("Salary");
    expect(rows("2025-02-02")[0]).toBe("Salary");
  });

  it("still ranks above an income target that was met", () => {
    const names = selectBudgetPanelRows(
      [
        midMonth("Income:Salary", "-5000 USD", 0),
        midMonth("Income:Bonus", "-100 USD", -500),
      ],
      2,
      "2025-01-15",
    ).map((row) => row.shortAccount);
    expect(names).toEqual(["Salary", "Bonus"]);
  });
});

// w21/381: after a ledger switch the panel kept the previous ledger's rows until
// the new reads landed. The hook needs the native runtime; its source is checked.
describe("the panel's rows belong to a ledger", () => {
  const hook = require("fs")
    .readFileSync(
      require("path").join(__dirname, "../../hooks/use-budget-panel.ts"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("records which ledger each result was read for", () => {
    expect(
      hook.includes("setRows(settled.rows);setRowsLedger(ledgerId);"),
    ).toBe(true);
    expect(hook.includes("setRows([]);setRowsLedger(ledgerId??null);")).toBe(
      true,
    );
  });

  it("shows another ledger's rows as none, still loading", () => {
    expect(hook.includes("constcurrent=rowsLedger===(ledgerId??null);")).toBe(
      true,
    );
    expect(
      hook.includes(
        "rows:current?rows:[],loading:loading||!current,failed:current&&failed,",
      ),
    ).toBe(true);
  });
});
