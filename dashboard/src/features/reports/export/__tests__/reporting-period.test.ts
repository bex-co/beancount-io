import { describe, expect, it } from "vitest";
import {
  parseConcreteTimeFilter,
  resolveReportingPeriod,
} from "../reporting-period";

describe("statement reporting period", () => {
  it("resolves concrete Fava time-filter forms to inclusive dates", () => {
    expect(parseConcreteTimeFilter("2026")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(parseConcreteTimeFilter("2026-Q2")).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    });
    expect(parseConcreteTimeFilter("2026-01-15 - 2026-06-30")).toEqual({
      startDate: "2026-01-15",
      endDate: "2026-06-30",
    });
  });

  it("respects the ledger fiscal-year end", () => {
    expect(parseConcreteTimeFilter("FY2026", { month: 3, day: 31 })).toEqual({
      startDate: "2025-04-01",
      endDate: "2026-03-31",
    });
  });

  it("uses returned data only as a truthful through-date fallback", () => {
    expect(
      resolveReportingPeriod({
        kind: "profit_and_loss",
        timeFilter: "",
        reportDates: ["2025-12-31", "2026-06-30"],
        interval: "monthly",
      }),
    ).toEqual({
      startDate: "2025-12-01",
      endDate: "2026-06-30",
      asOfDate: null,
      isExplicit: false,
      selection: "",
    });
  });

  it("does not infer a start when the server interval limit may truncate it", () => {
    const reportDates = Array.from({ length: 100 }, (_, index) => {
      const value = new Date(Date.UTC(2017, index, 1));
      return new Date(
        Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
      )
        .toISOString()
        .slice(0, 10);
    });

    expect(
      resolveReportingPeriod({
        kind: "profit_and_loss",
        timeFilter: "",
        reportDates,
        interval: "monthly",
      }),
    ).toMatchObject({
      startDate: null,
      endDate: reportDates.at(-1),
      isExplicit: false,
    });
  });
});
