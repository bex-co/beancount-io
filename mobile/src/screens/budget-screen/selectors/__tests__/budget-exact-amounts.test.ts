/**
 * Budget targets, actuals and variance are judged and shown as the ledger's
 * decimals (w4/1039), the mobile counterpart of the dashboard's w4/m55. As
 * doubles, 9007199254740993 USD read as …992: a daily target a dollar above
 * its actual was "On target", and a whole month prorated from daily shares
 * of 90071992547409.93 USD summed to a few cents off, so an exactly met
 * target read above or below it.
 */
import { resolveCurrencyBalanceExact } from "../../../../common/balance-util";
import { negateDecimal } from "../../../../common/decimal-number";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "../../../../common/number-utils";
import {
  budgetDisplayScale,
  calculateBudgetForIntervalExact,
  groupBudgetEntries,
  groupDirection,
  type BudgetEntry,
  type BudgetGroup,
} from "../budget-selectors";
import { selectBudgetCardStats } from "../select-budget-card-stats";
import {
  budgetPanelRowAccessibilityValue,
  selectBudgetPanelRows,
} from "../../../home-screen/selectors/select-budget-panel";
import { DirectiveType } from "../../../transactions-screen/types";

function entry(
  date: string,
  interval: string,
  number: string,
  hash = date,
): BudgetEntry {
  return {
    date,
    entry_hash: hash,
    directive_type: DirectiveType.CUSTOM,
    type: "budget",
    values: ["Expenses:QaBudget", interval, { number, currency: "USD" }],
  };
}

/** The card for `group`'s period ending `end`, its point built as the hook does. */
function card(group: BudgetGroup, end: string, actual: string) {
  const direction = groupDirection(group);
  const directed = (value: string) =>
    direction === 1 ? value : negateDecimal(value);
  const actualExact = directed(
    resolveCurrencyBalanceExact({ USD: actual }, "USD"),
  );
  const budgetExact = directed(
    calculateBudgetForIntervalExact(end, group.interval, group.budgetHistory),
  );
  const stats = selectBudgetCardStats(group, [
    {
      date: end,
      actual: Number(actualExact),
      actualExact,
      budget: Number(budgetExact),
      budgetExact,
    },
  ]);
  const scale = budgetDisplayScale(group.budgetHistory);
  return {
    stats,
    budget: formatMoneyWithCurrency(stats.budgetExact, "USD", scale),
    actual: formatSignedMoneyWithCurrency(
      stats.actualExact!,
      "USD",
      false,
      scale,
    ),
    variance: formatSignedMoneyWithCurrency(
      stats.varianceExact!,
      "USD",
      true,
      scale,
    ),
  };
}

const daily = (target: string) =>
  groupBudgetEntries([entry("2025-12-01", "daily", target)], "2025-12-31")[0];

describe("a daily target a dollar from its actual", () => {
  it("reads Below target −$1.00 when the actual is a dollar short", () => {
    const shown = card(
      daily("9007199254740993"),
      "2025-12-31",
      "9007199254740992",
    );
    expect(shown.stats.status).toBe("below");
    expect(shown.stats.varianceExact).toBe("-1");
    expect(shown.budget).toBe("$9,007,199,254,740,993.00");
    expect(shown.actual).toBe("$9,007,199,254,740,992.00");
    expect(shown.variance).toBe("-$1.00");
  });

  it("reads Above target +$1.00 the other way round", () => {
    const shown = card(
      daily("9007199254740992"),
      "2025-12-31",
      "9007199254740993",
    );
    expect(shown.stats.status).toBe("above");
    expect(shown.variance).toBe("+$1.00");
  });

  it("still reads an ordinary 100 against 99 as −$1.00", () => {
    const shown = card(daily("100"), "2025-12-31", "99");
    expect(shown.stats.status).toBe("below");
    expect(shown.budget).toBe("$100.00");
    expect(shown.variance).toBe("-$1.00");
  });

  it("says the same on Home's row and in its spoken value", () => {
    const [row] = selectBudgetPanelRows(
      [
        {
          group: daily("9007199254740993"),
          actual: "9007199254740992",
          periodEnd: "2025-12-31",
        },
      ],
      3,
      "2025-12-31",
    );
    expect(row.status).toBe("below");
    const spoken = budgetPanelRowAccessibilityValue(
      row,
      (key: string, options?: Record<string, string | number>) =>
        `${key}${options ? JSON.stringify(options) : ""}`,
    );
    expect(spoken.includes('"actual":"$9,007,199,254,740,992.00"')).toBe(true);
    expect(spoken.includes('"budget":"$9,007,199,254,740,993.00"')).toBe(true);
    expect(spoken.includes("budgetBelowTarget")).toBe(true);
  });
});

describe("an exactly met monthly target prorated day by day", () => {
  // An earlier directive makes the month take the daily walk, not the
  // whole-period shortcut.
  const monthly = groupBudgetEntries(
    [
      entry("2023-01-01", "monthly", "1", "old"),
      entry("2023-06-01", "monthly", "90071992547409.93", "new"),
    ],
    "2025-12-31",
  )[0];

  for (const [end, days] of [
    ["2025-02-28", 28],
    ["2024-02-29", 29],
    ["2025-11-30", 30],
    ["2025-12-31", 31],
  ] as const) {
    it(`is met over the ${end} month of ${days} days`, () => {
      const shown = card(monthly, end, "90071992547409.93");
      expect(
        calculateBudgetForIntervalExact(end, "monthly", monthly.budgetHistory),
      ).toBe("90071992547409.93");
      expect(shown.stats.status).toBe("on");
      expect(shown.variance).toBe("+$0.00");
    });
  }
});

describe("exact money formatting", () => {
  for (const [text, currency, scale] of [
    ["1234.5", "USD", 0],
    ["-42.505", "USD", 0],
    ["1500", "JPY", 0],
    ["74.1935", "KWD", 0],
    ["0.003742", "BTC", 3],
    ["551620", "MUSD", 2],
    ["0", "USD", 0],
  ] as const) {
    it(`reads ${text} ${currency} as the number formatter does`, () => {
      expect(formatMoneyWithCurrency(text, currency, scale)).toBe(
        formatMoneyWithCurrency(Number(text), currency, scale),
      );
      expect(formatSignedMoneyWithCurrency(text, currency, true, scale)).toBe(
        formatSignedMoneyWithCurrency(Number(text), currency, true, scale),
      );
    });
  }
});
