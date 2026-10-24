import {
  detectRecurrence,
  type SeriesPoint,
} from "../screens/merchants-screen/selectors/detect-recurrence";

// w21/944: one extra or late charge anywhere in a long window dropped the
// day-of-month anchor, so Next ran up to three days late.
const monthly = (from: string, count: number, day = "05"): string[] => {
  const [year, month] = from.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) + i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${day}`;
  });
};
const on = (dates: string[]): SeriesPoint[] =>
  dates.sort().map((date) => ({ date, currency: "USD", amount: -15.99 }));
const TODAY = "2026-02-20";
// Jan 2024 to Feb 2026, on the 5th.
const SERIES = monthly("2024-01", 26);

describe("an outlier in a long series does not move Next", () => {
  it("predicts the 5th without it, as the control", () => {
    expect(detectRecurrence(on([...SERIES]), TODAY)!.nextExpected).toBe(
      "2026-03-05",
    );
  });

  it("predicts the 5th with one extra charge in the window", () => {
    expect(
      detectRecurrence(on([...SERIES, "2025-02-18"]), TODAY)!.nextExpected,
    ).toBe("2026-03-05");
  });

  it("predicts the 5th with one month paid on the 10th", () => {
    const dates = SERIES.map((date) =>
      date === "2024-06-05" ? "2024-06-10" : date,
    );
    expect(detectRecurrence(on(dates), TODAY)!.nextExpected).toBe("2026-03-05");
  });

  it("predicts the 5th for a series ending on the 5th", () => {
    const upToSeptember = SERIES.filter((date) => date <= "2025-09-05");
    expect(
      detectRecurrence(on([...upToSeptember, "2025-02-18"]), "2025-09-20")!
        .nextExpected,
    ).toBe("2025-10-05");
  });

  it("still does not anchor every-four-weeks payments", () => {
    const fourWeekly = Array.from({ length: 12 }, (_, i) => {
      const day = new Date(Date.UTC(2026, 0, 2 + i * 28));
      return day.toISOString().slice(0, 10);
    });
    expect(detectRecurrence(on(fourWeekly), "2026-12-01")!.nextExpected).toBe(
      "2026-12-04",
    );
  });
});
