import { intervalLabelKey, timeSpanToFilter } from "../budget-labels";

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
