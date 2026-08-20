import type { RecurrenceVerdict } from "../screens/merchants-screen/selectors/detect-recurrence";
import { resolveRecurringVerdict } from "../screens/merchants-screen/selectors/resolve-recurring";

const DETECTION: RecurrenceVerdict = {
  cadence: "monthly",
  typicalAmountByCurrency: { USD: -10 },
  isApproximate: false,
  nextExpected: "2024-07-01",
  isOverdue: false,
};

describe("resolveRecurringVerdict", () => {
  it("falls through to detection when no override is set", () => {
    expect(resolveRecurringVerdict(DETECTION, null)).toEqual({
      isRecurring: true,
      cadence: "monthly",
      detection: DETECTION,
      source: "detection",
    });
    expect(resolveRecurringVerdict(null, null)).toEqual({
      isRecurring: false,
      cadence: null,
      detection: null,
      source: "none",
    });
  });

  it("lets a recurring override beat a null detection (irregular cadence)", () => {
    expect(resolveRecurringVerdict(null, "recurring")).toEqual({
      isRecurring: true,
      cadence: "irregular",
      detection: null,
      source: "override",
    });
  });

  it("lets a recurring override keep the detected cadence when present", () => {
    expect(resolveRecurringVerdict(DETECTION, "recurring")).toEqual({
      isRecurring: true,
      cadence: "monthly",
      detection: DETECTION,
      source: "override",
    });
  });

  it("lets a notRecurring override hide a positive detection", () => {
    expect(resolveRecurringVerdict(DETECTION, "notRecurring")).toEqual({
      isRecurring: false,
      cadence: null,
      detection: DETECTION,
      source: "override",
    });
  });
});
