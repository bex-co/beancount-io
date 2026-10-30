import {
  budgetChartSummary,
  intervalLabelKey,
  timeSpanToFilter,
  budgetPanelWindow,
} from "../budget-labels";
import { en } from "../../../../translations/en";
import { translationLocales } from "../../../../translations/__tests__/locale-parity";

describe("intervalLabelKey", () => {
  it("maps each cadence to its label key, case-insensitively", () => {
    expect(intervalLabelKey("daily")).toBe("budgetIntervalDaily");
    expect(intervalLabelKey("WEEKLY")).toBe("budgetIntervalWeekly");
    expect(intervalLabelKey("monthly")).toBe("budgetIntervalMonthly");
    expect(intervalLabelKey("Quarterly")).toBe("budgetIntervalQuarterly");
    expect(intervalLabelKey("yearly")).toBe("budgetIntervalYearly");
  });

  it("labels an unknown cadence as monthly, matching the proration fallback", () => {
    expect(intervalLabelKey("fortnightly")).toBe("budgetIntervalMonthly");
  });
});

describe("timeSpanToFilter", () => {
  it("sends no filter for all time", () => {
    expect(timeSpanToFilter("all", "2026-08-09")).toBe(undefined);
  });

  it("ends year to date today, so no unstarted period is charted", () => {
    expect(timeSpanToFilter("this-year", "2026-09-13")).toBe(
      "2026-01-01 - 2026-09-13",
    );
  });

  // w21/148: fava's `year-1` resolved on the server's calendar, so on New
  // Year's Day in Tokyo "Last year" charted the year before last.
  it("builds last year from the device's date, whatever the server's zone", () => {
    expect(timeSpanToFilter("last-year", "2027-01-01")).toBe(
      "2026-01-01 - 2026-12-31",
    );
    expect(timeSpanToFilter("last-year", "2026-12-31")).toBe(
      "2025-01-01 - 2025-12-31",
    );
  });

  it("expresses 1Y as twelve whole calendar months through today", () => {
    expect(timeSpanToFilter("last-12m", "2026-08-09")).toBe(
      "2025-09-01 - 2026-08-09",
    );
  });
});

// Interpolates the real English copy, so a renamed key or a dropped token fails
// here rather than shipping "undefined" into the chart's only spoken text.
// English plural objects pick `one` or `other` by count (w21/098).
const t = (key: string, params?: Record<string, unknown>) => {
  const value = (en as unknown as Record<string, unknown>)[key];
  const text =
    typeof value === "object" && value !== null
      ? (value as Record<string, string>)[params?.count === 1 ? "one" : "other"]
      : String(value);
  return text.replace(/{{(\w+)}}/g, (_match, name: string) =>
    String(params?.[name]),
  );
};

describe("budgetChartSummary", () => {
  it("summarizes the span, the totals, and how many periods missed target", () => {
    expect(
      budgetChartSummary(
        {
          labels: ["JAN", "FEB", "MAR"],
          actuals: [400, 600, 1200],
          budgets: [500, 500, 500],
          favorables: [true, false, false],
          currency: "USD",
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for JAN–MAR. Actual $2,200.00 of $1,500.00 budgeted across 3 periods, 2 over target.",
    );
  });

  // w21/457: a missed income target is "below", and a span names its years.
  it("words a missed income target as below, an expense as over", () => {
    const income = {
      labels: ["NOV", "DEC", "SEP"],
      actuals: [3000, 3000, 3000],
      budgets: [4000, 4000, 4000],
      favorables: [false, false, false],
      currency: "USD",
      dates: ["2024-11-30", "2025-12-31", "2026-09-30"],
    };
    expect(budgetChartSummary({ ...income, direction: -1 }, t)).toBe(
      "Budget versus actual for NOV 2024–SEP 2026. Actual $9,000.00 of $12,000.00 budgeted across 3 periods, 3 below target.",
    );
    expect(budgetChartSummary({ ...income, direction: 1 }, t)).toBe(
      "Budget versus actual for NOV 2024–SEP 2026. Actual $9,000.00 of $12,000.00 budgeted across 3 periods, 3 over target.",
    );
  });

  it("names years only when the span crosses one", () => {
    const within = {
      labels: ["JAN", "FEB", "MAR"],
      actuals: [400, 600, 1200],
      budgets: [500, 500, 500],
      favorables: [true, false, false],
      currency: "USD",
      dates: ["2026-01-31", "2026-02-28", "2026-03-31"],
    };
    expect(budgetChartSummary(within, t)).toBe(
      "Budget versus actual for JAN–MAR. Actual $2,200.00 of $1,500.00 budgeted across 3 periods, 2 over target.",
    );
    // A yearly axis label is its own year.
    expect(
      budgetChartSummary(
        {
          ...within,
          labels: ["2024", "2025"],
          dates: ["2024-12-31", "2025-12-31"],
        },
        t,
      )?.includes("for 2024–2025."),
    ).toBe(true);
  });

  it("is worded in every language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../../translations/${locale}`)[locale];
      for (const key of ["budgetSummaryOverTarget", "budgetSummaryBelowTarget"])
        expect(String(catalog[key]).includes("{{count}}")).toBe(true);
      const forms = Object.values(catalog.budgetChartSummary) as string[];
      expect(forms.every((form) => form.includes("{{missed}}"))).toBe(true);
      expect(forms.some((form) => form.includes("{{over}}"))).toBe(false);
    }
  });

  it("names a single period without a range dash", () => {
    expect(
      budgetChartSummary(
        {
          labels: ["JAN"],
          actuals: [400],
          budgets: [500],
          favorables: [true],
          currency: "USD",
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for JAN. Actual $400.00 of $500.00 budgeted across 1 period, 0 over target.",
    );
  });

  it("labels a currency without a symbol by its code", () => {
    expect(
      budgetChartSummary(
        {
          labels: ["JAN"],
          actuals: [400],
          budgets: [500],
          favorables: [true],
          currency: "MUSD",
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for JAN. Actual 400.00 MUSD of 500.00 MUSD budgeted across 1 period, 0 over target.",
    );
  });

  it("counts only an explicit false against target, not an unjudged period", () => {
    const summary = budgetChartSummary(
      {
        labels: ["JAN", "FEB"],
        actuals: [100, 100],
        budgets: [100, 100],
        // `undefined` is "no budget to judge against", not "over target".
        favorables: [undefined as unknown as boolean, false],
        currency: "EUR",
      },
      t,
    );
    expect(summary?.endsWith("1 over target.")).toBe(true);
  });

  it("summarizes nothing for an empty series — the placeholder speaks instead", () => {
    expect(
      budgetChartSummary(
        {
          labels: [],
          actuals: [],
          budgets: [],
          favorables: [],
          currency: "USD",
        },
        t,
      ),
    ).toBe(undefined);
  });
});

// w21/646: 1Y is twelve whole calendar months, as Reports counts it, so there
// is no day-of-month start to clamp (w21/063's leap-day failure cannot recur).
describe("timeSpanToFilter: 1Y", () => {
  it("starts on the first day of the month eleven months back", () => {
    expect(timeSpanToFilter("last-12m", "2024-02-29")).toBe(
      "2023-03-01 - 2024-02-29",
    );
    expect(timeSpanToFilter("last-12m", "2026-10-21")).toBe(
      "2025-11-01 - 2026-10-21",
    );
    expect(timeSpanToFilter("last-12m", "2027-03-01")).toBe(
      "2026-04-01 - 2027-03-01",
    );
  });

  it("crosses the year in January", () => {
    expect(timeSpanToFilter("last-12m", "2026-01-15")).toBe(
      "2025-02-01 - 2026-01-15",
    );
  });
});

// w21/184: year to date ended on today, a new cache key every day.
describe("budgetPanelWindow", () => {
  it("runs from January to the end of the month, the same all month", () => {
    expect(budgetPanelWindow("2026-10-21")).toBe("2026-01-01 - 2026-10-31");
    expect(budgetPanelWindow("2026-10-01")).toBe(
      budgetPanelWindow("2026-10-31"),
    );
    expect(budgetPanelWindow("2028-02-10")).toBe("2028-01-01 - 2028-02-29");
  });

  it("is what Home's budget panel prices over", () => {
    const hook = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "..",
        "home-screen",
        "hooks",
        "use-budget-panel.ts",
      ),
      "utf8",
    );
    // The watched day, so the window follows midnight (w21/233).
    expect(hook.includes("budgetPanelWindow(today)")).toBe(true);
  });
});

// w21/807: a budget dated Oct 21 read "Actual $2.4K of $222.6 budgeted across
// 10 periods": January to September were spent before the budget existed.
describe("budgetChartSummary before the budget existed", () => {
  const { selectBudgetedPeriods } = require("../select-budget-card-stats");
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
  const series = months.map((month) => ({
    date: `2026-${month}-${month === "10" ? "31" : "28"}`,
    actual: month === "10" ? 100 : 250,
    budget: month === "10" ? 222.6 : 0,
  }));
  const budgeted: boolean[] = selectBudgetedPeriods(
    series,
    [{ date: "2026-10-21" }],
    "2026-10-23",
  );

  it("sums and counts only the periods with a budget", () => {
    expect(budgeted.filter(Boolean).length).toBe(1);
    expect(
      budgetChartSummary(
        {
          labels: months.map((m) => `M${m}`),
          actuals: series.map((point) => point.actual),
          budgets: series.map((point) => point.budget),
          favorables: budgeted.map((has) => (has ? true : null)),
          currency: "USD",
          budgeted,
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for M10. Actual $100.00 of $222.60 budgeted across 1 period, 0 over target.",
    );
  });

  it("keeps every period when none had a budget yet", () => {
    const summary = budgetChartSummary(
      {
        labels: ["JAN", "FEB"],
        actuals: [10, 20],
        budgets: [0, 0],
        favorables: [null, null],
        currency: "USD",
        budgeted: [false, false],
      },
      t,
    );
    expect(summary?.includes("across 2 periods")).toBe(true);
  });

  it("is what the card speaks", () => {
    const card = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "components",
          "budget-group-card.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      card.includes(
        "budgeted:selectBudgetedPeriods(series,group.budgetHistory,today,),",
      ),
    ).toBe(true);
  });
});

// w21/821: summed as floats, a refunded month was spoken "−$0.0000000000000036",
// and the short axis form read 222.58 as "$222.6".
describe("budgetChartSummary's totals", () => {
  const spoken = (actuals: number[], budgets: number[]) =>
    budgetChartSummary(
      {
        labels: actuals.map((_, i) => `M${i}`),
        actuals,
        budgets,
        favorables: actuals.map(() => true),
        currency: "USD",
      },
      t,
    );

  it("rounds the sums and speaks them in full", () => {
    expect(spoken([10.1, 20.2, -30.3], [100, 100, 22.58])).toBe(
      "Budget versus actual for M0–M2. Actual $0.00 of $222.58 budgeted across 3 periods, 0 over target.",
    );
    expect(spoken([0.1, 0.2, 0], [1, 1, 1])?.includes("Actual $0.30 of")).toBe(
      true,
    );
  });
});
