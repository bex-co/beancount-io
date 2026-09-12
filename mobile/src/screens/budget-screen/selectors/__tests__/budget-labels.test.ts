import {
  budgetChartSummary,
  intervalLabelKey,
  timeSpanToFilter,
} from "../budget-labels";
import { en } from "../../../../translations/en";

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

  it("uses fava's relative-year variables", () => {
    expect(timeSpanToFilter("this-year", "2026-08-09")).toBe("year");
    expect(timeSpanToFilter("last-year", "2026-08-09")).toBe("year-1");
  });

  it("expresses the rolling window as an explicit range", () => {
    expect(timeSpanToFilter("last-12m", "2026-08-09")).toBe(
      "2025-08-09 - 2026-08-09",
    );
  });
});

// Interpolates the real English copy, so a renamed key or a dropped token fails
// here rather than shipping "undefined" into the chart's only spoken text.
const t = (key: string, params?: Record<string, unknown>) =>
  String((en as unknown as Record<string, string>)[key]).replace(
    /{{(\w+)}}/g,
    (_match, name: string) => String(params?.[name]),
  );

describe("budgetChartSummary", () => {
  it("summarizes the span, the totals, and how many periods missed target", () => {
    expect(
      budgetChartSummary(
        {
          labels: ["JAN", "FEB", "MAR"],
          actuals: [400, 600, 1200],
          budgets: [500, 500, 500],
          favorables: [true, false, false],
          currencySymbol: "$",
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for JAN–MAR. Actual $2.2K of $1.5K budgeted across 3 periods, 2 over target.",
    );
  });

  it("names a single period without a range dash", () => {
    expect(
      budgetChartSummary(
        {
          labels: ["JAN"],
          actuals: [400],
          budgets: [500],
          favorables: [true],
          currencySymbol: "$",
        },
        t,
      ),
    ).toBe(
      "Budget versus actual for JAN. Actual $400.0 of $500.0 budgeted across 1 periods, 0 over target.",
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
        currencySymbol: "€",
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
          currencySymbol: "$",
        },
        t,
      ),
    ).toBe(undefined);
  });
});
