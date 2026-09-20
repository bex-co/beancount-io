import { describe, it, expect } from "vitest";
import { budgetVariance, calculateBudgetForInterval } from "../budget-utils";
import type { BudgetHistoryEntry } from "../types";

/**
 * The prorated target is a sum of one floating-point daily fraction per day,
 * so an exactly met budget lands a few units in the last place away from the
 * actual. Comparing strictly made the same 1650 USD target read "Above target
 * +0" in February and "Below target -0" in January.
 *
 * These cases run the real proration and feed its result to the comparison,
 * rather than asserting on hand-written floats, so the round-off under test is
 * the one the page actually produces.
 */

function historyEntry(
  date: string,
  interval: string,
  amount: string,
): BudgetHistoryEntry {
  return { date, interval, amount, entry_hash: `${date}-${amount}` };
}

/** The target the card compares against, for one plotted interval. */
const prorated = (
  intervalEnd: string,
  history: BudgetHistoryEntry[],
  chartInterval = "monthly",
) => calculateBudgetForInterval(intervalEnd, chartInterval, history);

const RENT = [historyEntry("2026-01-01", "monthly", "1650.00 USD")];

describe("an exactly met monthly budget", () => {
  it("does not read as overspent in a 28-day month", () => {
    const target = prorated("2026-02-28", RENT);

    // The proration really is off by a hair; that is the point.
    expect(target).not.toBe(1650);
    expect(budgetVariance(1650, target)).toBe(0);
  });

  it("does not read as underspent in a 31-day month", () => {
    const target = prorated("2026-01-31", RENT);

    expect(target).not.toBe(1650);
    expect(budgetVariance(1650, target)).toBe(0);
  });

  it("never produces a signed zero", () => {
    for (const end of ["2026-01-31", "2026-02-28", "2026-04-30"]) {
      const variance = budgetVariance(1650, prorated(end, RENT));
      expect(Object.is(variance, -0)).toBe(false);
      expect(variance > 0).toBe(false);
      expect(variance < 0).toBe(false);
    }
  });

  it("holds for a 29-day leap February too", () => {
    expect(budgetVariance(1650, prorated("2028-02-29", RENT))).toBe(0);
  });
});

describe("differences a reader could act on survive", () => {
  it("keeps the reported Dining shortfall", () => {
    const dining = [historyEntry("2026-01-01", "monthly", "200.00 USD")];

    expect(budgetVariance(160.5, prorated("2026-01-31", dining))).toBeCloseTo(
      -39.5,
      10,
    );
  });

  it("keeps a small overspend", () => {
    const target = prorated("2026-01-31", RENT);

    expect(budgetVariance(1650.01, target)).toBeCloseTo(0.01, 10);
    expect(budgetVariance(1650.01, target)).toBeGreaterThan(0);
  });

  it("keeps a fractional-commodity difference far below a cent", () => {
    const eth = [historyEntry("2026-01-01", "monthly", "4.00995 ETH")];
    const target = prorated("2026-01-31", eth);

    // A hundred-thousandth of an ETH is real; round-off is 1e-13.
    expect(budgetVariance(4.00996, target)).toBeGreaterThan(0);
    expect(budgetVariance(4.00994, target)).toBeLessThan(0);
    expect(budgetVariance(4.00995, target)).toBe(0);
  });

  it("reports a missing actual as the whole target", () => {
    const target = prorated("2026-01-31", RENT);

    expect(budgetVariance(0, target)).toBeCloseTo(-1650, 9);
  });

  it("treats a zero target and zero actual as on target", () => {
    expect(budgetVariance(0, 0)).toBe(0);
  });
});

describe("the comparison follows the proration it is given", () => {
  it("stays exact when the target changes mid-period", () => {
    const changed = [
      historyEntry("2026-01-01", "monthly", "1650.00 USD"),
      historyEntry("2026-01-16", "monthly", "1800.00 USD"),
    ];
    const target = prorated("2026-01-31", changed);

    // Half a month at each rate — the blended target, not either endpoint.
    expect(target).toBeGreaterThan(1650);
    expect(target).toBeLessThan(1800);
    expect(budgetVariance(target, target)).toBe(0);
    expect(budgetVariance(target + 5, target)).toBeCloseTo(5, 9);
  });

  it("works for an income target, where signs are mirrored", () => {
    const income = [historyEntry("2026-01-01", "monthly", "5000.00 USD")];
    const target = prorated("2026-01-31", income);

    expect(budgetVariance(5000, target)).toBe(0);
    expect(budgetVariance(4900, target)).toBeLessThan(0);
    expect(budgetVariance(5100, target)).toBeGreaterThan(0);
  });

  it("scales its tolerance with the amounts, not a fixed cent", () => {
    // A large target accumulates more round-off, and still reads as met.
    const large = [historyEntry("2026-01-01", "monthly", "9500000.00 USD")];
    const target = prorated("2026-01-31", large);

    expect(budgetVariance(9500000, target)).toBe(0);
    // A cent is still a real difference at that scale.
    expect(budgetVariance(9500000.01, target)).toBeGreaterThan(0);
  });
});
