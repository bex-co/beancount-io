/**
 * Guards the hand-rolled date math that replaced date-fns in the port. These
 * are the cases where a naive implementation silently drifts: Monday-start
 * weeks, quarter boundaries, leap years, and year rollover.
 */
import {
  addDaysISO,
  currentPeriodRange,
  daysInBudgetPeriod,
  intervalStartISO,
  nextIntervalStartISO,
} from "../budget-selectors";

describe("intervalStartISO", () => {
  it("starts weeks on Monday", () => {
    // 2025-01-12 is a Sunday; its week began Monday the 6th.
    expect(intervalStartISO("2025-01-12", "weekly")).toBe("2025-01-06");
    expect(intervalStartISO("2025-01-06", "weekly")).toBe("2025-01-06");
    expect(intervalStartISO("2025-01-07", "weekly")).toBe("2025-01-06");
  });

  it("snaps to calendar quarters", () => {
    expect(intervalStartISO("2025-02-14", "quarterly")).toBe("2025-01-01");
    expect(intervalStartISO("2025-04-01", "quarterly")).toBe("2025-04-01");
    expect(intervalStartISO("2025-12-31", "quarterly")).toBe("2025-10-01");
  });

  it("handles month, year and day cadences", () => {
    expect(intervalStartISO("2025-03-17", "monthly")).toBe("2025-03-01");
    expect(intervalStartISO("2025-03-17", "yearly")).toBe("2025-01-01");
    expect(intervalStartISO("2025-03-17", "daily")).toBe("2025-03-17");
  });

  it("falls back to monthly for an unrecognized cadence", () => {
    expect(intervalStartISO("2025-03-17", "fortnightly")).toBe("2025-03-01");
  });
});

describe("nextIntervalStartISO", () => {
  it("rolls over the year boundary", () => {
    expect(nextIntervalStartISO("2025-12-15", "monthly")).toBe("2026-01-01");
    expect(nextIntervalStartISO("2025-12-15", "quarterly")).toBe("2026-01-01");
    expect(nextIntervalStartISO("2025-12-15", "yearly")).toBe("2026-01-01");
  });
});

describe("daysInBudgetPeriod", () => {
  it("counts real month lengths, including leap February", () => {
    expect(daysInBudgetPeriod("2024-02-10", "monthly")).toBe(29);
    expect(daysInBudgetPeriod("2025-02-10", "monthly")).toBe(28);
    expect(daysInBudgetPeriod("2025-01-10", "monthly")).toBe(31);
    expect(daysInBudgetPeriod("2025-04-10", "monthly")).toBe(30);
  });

  it("counts leap years and quarters", () => {
    expect(daysInBudgetPeriod("2024-06-01", "yearly")).toBe(366);
    expect(daysInBudgetPeriod("2025-06-01", "yearly")).toBe(365);
    expect(daysInBudgetPeriod("2025-01-15", "quarterly")).toBe(90);
    expect(daysInBudgetPeriod("2024-01-15", "quarterly")).toBe(91);
  });

  it("is 7 for weeks and 1 for days", () => {
    expect(daysInBudgetPeriod("2025-01-12", "weekly")).toBe(7);
    expect(daysInBudgetPeriod("2025-01-12", "daily")).toBe(1);
  });
});

describe("addDaysISO", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysISO("2025-01-31", 1)).toBe("2025-02-01");
    expect(addDaysISO("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysISO("2025-03-01", -1)).toBe("2025-02-28");
  });
});

describe("currentPeriodRange", () => {
  it("returns an inclusive range covering the whole period", () => {
    expect(currentPeriodRange("monthly", "2025-01-17")).toEqual({
      start: "2025-01-01",
      end: "2025-01-31",
    });
    expect(currentPeriodRange("weekly", "2025-01-12")).toEqual({
      start: "2025-01-06",
      end: "2025-01-12",
    });
    expect(currentPeriodRange("yearly", "2024-06-01")).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
    });
  });
});
