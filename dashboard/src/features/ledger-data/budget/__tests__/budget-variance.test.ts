import { describe, it, expect } from "vitest";
import { budgetVariance, calculateBudgetForInterval } from "../budget-utils";
import type { BudgetHistoryEntry } from "../types";

/**
 * The prorated target is an exact daily-equivalent sum rounded once to the
 * budget's display precision, and the variance subtracts decimals exactly
 * (w4/m55). Summing one floating-point daily fraction per day used to land an
 * exactly met budget a hair away from its actual (1649.999999999999 over
 * February), and a tolerance absorbing that could also absorb a real unit at
 * 2^53, where 9007199254740993 had already become …992.
 *
 * These cases run the real proration and feed its result to the comparison.
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
  digits = 2,
  chartInterval = "monthly",
) => calculateBudgetForInterval(intervalEnd, chartInterval, history, digits);

const RENT = [historyEntry("2026-01-01", "monthly", "1650.00 USD")];

describe("an exactly met monthly budget", () => {
  it.each(["2026-01-31", "2026-02-28", "2028-02-29", "2026-04-30"])(
    "prorates to exactly the target and reads as met (%s)",
    (end) => {
      const target = prorated(end, RENT);
      expect(target).toBe("1650.00");
      expect(budgetVariance("1650", target)).toBe("0.00");
    },
  );
});

describe("differences a reader could act on survive", () => {
  it("keeps the reported Dining shortfall", () => {
    const dining = [historyEntry("2026-01-01", "monthly", "200.00 USD")];

    expect(budgetVariance("160.5", prorated("2026-01-31", dining))).toBe(
      "-39.50",
    );
  });

  it("keeps a small overspend", () => {
    expect(budgetVariance("1650.01", prorated("2026-01-31", RENT))).toBe(
      "0.01",
    );
  });

  it("keeps a fractional-commodity difference far below a cent", () => {
    const eth = [historyEntry("2026-01-01", "monthly", "4.00995 ETH")];
    const target = prorated("2026-01-31", eth, 5);

    expect(target).toBe("4.00995");
    expect(budgetVariance("4.00996", target)).toBe("0.00001");
    expect(budgetVariance("4.00994", target)).toBe("-0.00001");
    expect(budgetVariance("4.00995", target)).toBe("0.00000");
  });

  it("reports a missing actual as the whole target", () => {
    expect(budgetVariance("0", prorated("2026-01-31", RENT))).toBe("-1650.00");
  });

  it("treats a zero target and zero actual as on target", () => {
    expect(budgetVariance("0", "0")).toBe("0");
  });
});

describe("the comparison follows the proration it is given", () => {
  it("blends a mid-period change exactly, rounded once to the cent", () => {
    const changed = [
      historyEntry("2026-01-01", "monthly", "1650.00 USD"),
      historyEntry("2026-01-16", "monthly", "1800.00 USD"),
    ];
    // 1650 × 15/31 + 1800 × 16/31 = 53550/31 = 1727.4193…
    const target = prorated("2026-01-31", changed);

    expect(target).toBe("1727.42");
    expect(budgetVariance(target, target)).toBe("0.00");
    expect(budgetVariance("1732.42", target)).toBe("5.00");
  });

  it("rounds a share that does not terminate half away from zero", () => {
    // One January day of 100 a month: 100/31 = 3.2258…
    const oneDay = prorated(
      "2026-01-07",
      [historyEntry("2026-01-01", "monthly", "100 USD")],
      2,
      "daily",
    );
    expect(oneDay).toBe("3.23");
    expect(
      prorated("2026-01-31", [historyEntry("2026-01-01", "weekly", "-1 USD")]),
    ).toBe("-4.43"); // 31/7 = 4.428…
  });

  it("works for an income target, where signs are mirrored", () => {
    const income = [historyEntry("2026-01-01", "monthly", "-5000.00 USD")];
    const target = prorated("2026-01-31", income);

    expect(target).toBe("-5000.00");
    expect(budgetVariance("-5000", target)).toBe("0.00");
    expect(budgetVariance("-4900", target)).toBe("100.00");
  });

  it("stays exact at large amounts, where a cent is still a difference", () => {
    const large = [historyEntry("2026-01-01", "monthly", "9500000.00 USD")];
    const target = prorated("2026-01-31", large);

    expect(budgetVariance("9500000", target)).toBe("0.00");
    expect(budgetVariance("9500000.01", target)).toBe("0.01");
  });
});

describe("large amounts keep every unit", () => {
  // 31 × 2^40 USD a month.
  const LARGE = [
    historyEntry("2026-01-01", "monthly", "34084860461056.00 USD"),
  ];

  it.each([
    ["34084860461057", "1.00"],
    ["34084860461055", "-1.00"],
    ["34084860461060", "4.00"],
  ])("shows %s against the 31 × 2^40 target as %s", (actual, expected) => {
    const target = prorated("2026-10-31", LARGE);
    expect(target).toBe("34084860461056.00");
    expect(budgetVariance(actual, target)).toBe(expected);
  });

  it("still shows +1 against a smaller 31 × 2^32 target", () => {
    const small = [
      historyEntry("2026-01-01", "monthly", "133143986176.00 USD"),
    ];
    expect(budgetVariance("133143986177", prorated("2026-10-31", small))).toBe(
      "1.00",
    );
  });

  it.each([
    ["9007199254740993", "9007199254740992", "-1.00"],
    ["9007199254740992", "9007199254740993", "1.00"],
  ])(
    "keeps a one-unit difference beyond 2^53 (daily %s, actual %s)",
    (target, actual, expected) => {
      const daily = prorated(
        "2025-12-31",
        [historyEntry("2025-12-31", "daily", `${target} USD`)],
        2,
        "daily",
      );
      expect(daily).toBe(`${target}.00`);
      expect(budgetVariance(actual, daily)).toBe(expected);
    },
  );

  it("keeps a fractional commodity's difference at its own digits", () => {
    expect(budgetVariance("0.0005", "0.0004")).toBe("0.0001");
  });

  it("keeps a real sub-cent difference rather than absorbing it", () => {
    expect(budgetVariance("1650.004", "1650")).toBe("0.004");
  });
});
