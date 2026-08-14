/**
 * Daily-equivalent proration divides then re-sums, so binary-float error
 * accumulates across a period. Left alone it makes "on target" unreachable and
 * renders a matched budget as a fraction-of-a-cent overage.
 */
import {
  calculateBudgetForInterval,
  varianceStatus,
} from "../budget-selectors";

function history(amount: string, interval = "monthly", date = "2025-01-01") {
  return [{ date, interval, amount, entry_hash: "hash" }];
}

describe("proration precision", () => {
  it("settles an unevenly-divided budget at money precision", () => {
    // 5000 / 31 days does not divide evenly; summing it back must still be 5000.
    expect(
      calculateBudgetForInterval("2025-01-31", "monthly", history("5000 USD")),
    ).toBe(5000);
    expect(
      calculateBudgetForInterval("2025-02-28", "monthly", history("1000 USD")),
    ).toBe(1000);
    expect(
      calculateBudgetForInterval(
        "2024-02-29",
        "monthly",
        history("1000 USD", "monthly", "2024-01-01"),
      ),
    ).toBe(1000);
  });

  it("keeps genuine partial-period fractions", () => {
    // A 310/month budget over the 7-day week ending 2025-02-09 is 7 × 310/28.
    expect(
      calculateBudgetForInterval("2025-02-09", "weekly", history("310 USD")),
    ).toBeCloseTo(77.5, 2);
  });
});

describe("varianceStatus tolerance", () => {
  it("reads a sub-cent difference as on target", () => {
    expect(varianceStatus(0)).toBe("on");
    expect(varianceStatus(0.000000001)).toBe("on");
    expect(varianceStatus(-0.000000001)).toBe("on");
  });

  it("still reports differences that are real money", () => {
    expect(varianceStatus(0.01)).toBe("above");
    expect(varianceStatus(-0.01)).toBe("below");
  });
});
