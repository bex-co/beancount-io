import type { RecurrenceVerdict } from "../screens/merchants-screen/selectors/detect-recurrence";
import {
  endedBeforeSeriesWindow,
  resolveRecurringVerdict,
} from "../screens/merchants-screen/selectors/resolve-recurring";
import { cadenceLabelKey } from "../screens/merchants-screen/selectors/merchant-sections";

const DETECTION: RecurrenceVerdict = {
  cadence: "monthly",
  typicalAmountByCurrency: { USD: -10 },
  primaryCurrency: "USD",
  isApproximate: false,
  nextExpected: "2024-07-01",
  isOverdue: false,
  isLapsed: false,
  lastPaid: "2026-01-01",
};

describe("resolveRecurringVerdict", () => {
  it("falls through to detection when no override is set", () => {
    expect(resolveRecurringVerdict(DETECTION, null, true)).toEqual({
      isRecurring: true,
      cadence: "monthly",
      detection: DETECTION,
      source: "detection",
    });
    expect(resolveRecurringVerdict(null, null, true)).toEqual({
      isRecurring: false,
      cadence: null,
      detection: null,
      source: "none",
    });
  });

  it("lets a recurring override beat a null detection (irregular cadence)", () => {
    // Enough dates were analysed and no steady pattern emerged.
    expect(resolveRecurringVerdict(null, "recurring", true)).toEqual({
      isRecurring: true,
      cadence: "irregular",
      detection: null,
      source: "override",
    });
  });

  it("calls a marked payee's cadence unknown when its history is too short", () => {
    // Two identical monthly payments are not irregular (w0/039).
    expect(resolveRecurringVerdict(null, "recurring", false)).toEqual({
      isRecurring: true,
      cadence: "unknown",
      detection: null,
      source: "override",
    });
  });

  it("does not let short history alone make a payee recurring", () => {
    expect(resolveRecurringVerdict(null, null, false).isRecurring).toBe(false);
    expect(
      resolveRecurringVerdict(null, "notRecurring", false).isRecurring,
    ).toBe(false);
  });

  it("lets a recurring override keep the detected cadence when present", () => {
    expect(resolveRecurringVerdict(DETECTION, "recurring", true)).toEqual({
      isRecurring: true,
      cadence: "monthly",
      detection: DETECTION,
      source: "override",
    });
  });

  it("lets a notRecurring override hide a positive detection", () => {
    expect(resolveRecurringVerdict(DETECTION, "notRecurring", true)).toEqual({
      isRecurring: false,
      cadence: null,
      detection: DETECTION,
      source: "override",
    });
  });
});

// w21/617: a gym paid monthly from 2019 to mid-2023 has 54 entries and none in
// the 37-month series window, so a manual Recurring mark read "Not enough
// history" beside "54 transactions".
describe("a marked merchant whose payments predate the series window", () => {
  it("says it has no recent payments, not too little history", () => {
    expect(endedBeforeSeriesWindow("2023-06-01", "2026-10-22")).toBe(true);
    expect(endedBeforeSeriesWindow("2026-08-01", "2026-10-22")).toBe(false);
    expect(endedBeforeSeriesWindow("", "2026-10-22")).toBe(false);
    // w21/662: the last payments sat just inside the 37-month window.
    expect(endedBeforeSeriesWindow("2023-10-01", "2026-10-22")).toBe(true);
    // A new payee's two payments this year, and a yearly one a month late.
    expect(endedBeforeSeriesWindow("2026-09-01", "2026-10-22")).toBe(false);
    expect(endedBeforeSeriesWindow("2025-10-01", "2026-10-22")).toBe(false);
    expect(endedBeforeSeriesWindow("2025-09-01", "2026-10-22")).toBe(true);
    expect(
      resolveRecurringVerdict(null, "recurring", false, true).cadence,
    ).toBe("inactive");
  });

  it("still reads not enough history for a short series inside the window", () => {
    expect(
      resolveRecurringVerdict(null, "recurring", false, false).cadence,
    ).toBe("unknown");
    expect(resolveRecurringVerdict(null, "recurring", true, true).cadence).toBe(
      "irregular",
    );
  });

  it("is labelled", () => {
    expect(cadenceLabelKey("inactive")).toBe("merchantsCadenceInactive");
  });
});
