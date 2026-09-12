import { describe, expect, it } from "vitest";
import {
  intervalDateToTimeFilter,
  resolveMovementTimeFilter,
} from "../overview-utils";

describe("intervalDateToTimeFilter", () => {
  it("maps a complete monthly interval endpoint to YYYY-MM", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(intervalDateToTimeFilter("2025-10-31", now)).toBe("2025-10");
    expect(intervalDateToTimeFilter("2025-09-30", now)).toBe("2025-09");
  });

  it("keeps partial current-month ranges bounded by today", () => {
    const now = new Date("2026-07-15T12:00:00");
    expect(intervalDateToTimeFilter("2026-07-31", now)).toBe(
      "2026-07-01 - 2026-07-15",
    );
  });
});

describe("resolveMovementTimeFilter", () => {
  it("uses the derived month when no global time is set", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(resolveMovementTimeFilter("2025-10-31", undefined, now)).toBe(
      "2025-10",
    );
  });

  it("keeps a narrower existing selection inside the selected month", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(
      resolveMovementTimeFilter("2025-10-31", "2025-10-01 - 2025-10-10", now),
    ).toBe("2025-10-01 - 2025-10-10");
  });

  it("replaces an unrelated existing time with the selected month", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(resolveMovementTimeFilter("2025-10-31", "2016", now)).toBe(
      "2025-10",
    );
  });

  it("intersects the first partial month of a multi-month selection", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(
      resolveMovementTimeFilter("2026-01-31", "2026-01-15 - 2026-02-15", now),
    ).toBe("2026-01-15 - 2026-01-31");
  });

  it("intersects the last partial month of a multi-month selection", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(
      resolveMovementTimeFilter("2026-02-28", "2026-01-15 - 2026-02-15", now),
    ).toBe("2026-02-01 - 2026-02-15");
  });

  it("collapses an intermediate fully covered month to its month key", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(
      resolveMovementTimeFilter("2026-02-28", "2026-01-15 - 2026-03-10", now),
    ).toBe("2026-02");
    expect(resolveMovementTimeFilter("2026-02-28", "2026", now)).toBe(
      "2026-02",
    );
  });

  it("keeps the derived month when the ranges are disjoint", () => {
    const now = new Date("2026-09-08T12:00:00");
    expect(
      resolveMovementTimeFilter("2026-05-31", "2026-01-15 - 2026-02-15", now),
    ).toBe("2026-05");
  });

  it("intersects with an unfinished current month bounded by today", () => {
    const now = new Date("2026-07-15T12:00:00");
    expect(
      resolveMovementTimeFilter("2026-07-31", "2026-07-10 - 2026-08-20", now),
    ).toBe("2026-07-10 - 2026-07-15");
  });
});
