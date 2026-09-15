import fs from "fs";
import path from "path";

/**
 * Static guardrail: budget actuals prorate each period's budget no further
 * than today. The hook cannot be rendered by the unit runner; the proration
 * itself is covered in budget-selectors.test.ts.
 */
describe("useBudgetActuals", () => {
  it("passes today as the end of the budgeted span", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "hooks", "use-budget-actuals.ts"),
        "utf8",
      )
      .replace(/\s+/gu, "");
    expect(
      source.includes(
        "budgetForInterval(item.date,group.interval,history,today)",
      ),
    ).toBe(true);
  });
});
