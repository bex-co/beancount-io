import { describe, expect, it } from "vitest";
import type { ChartInterval } from "@/common/types/chart";
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

  it("runs an unfiltered period statement through its generation day", () => {
    expect(
      resolveReportingPeriod({
        kind: "profit_and_loss",
        timeFilter: "",
        reportDates: ["2025-12-31", "2026-06-30"],
        generatedOn: "2026-09-13",
        interval: "monthly",
      }),
    ).toEqual({
      startDate: "2025-12-01",
      endDate: "2026-09-13",
      asOfDate: null,
      isExplicit: false,
      selection: "",
    });
  });

  // The last unfiltered bucket ends with the period holding the newest entry
  // (2026-09-01 for an active ledger, 2017-05-15 for a dormant one), so it can
  // fall after the generation day and differs per chart interval.
  it.each<[string, ChartInterval, string]>([
    ["active", "weekly", "2026-09-06"],
    ["active", "monthly", "2026-09-30"],
    ["active", "quarterly", "2026-09-30"],
    ["active", "yearly", "2026-12-31"],
    ["dormant", "monthly", "2017-05-31"],
    ["dormant", "yearly", "2017-12-31"],
  ])(
    "dates an unfiltered balance sheet of an %s ledger independently of the %s chart interval",
    (_ledger, interval, lastBucket) => {
      expect(
        resolveReportingPeriod({
          kind: "balance_sheet",
          timeFilter: "",
          reportDates: [lastBucket],
          generatedOn: "2026-09-13",
          interval,
        }).asOfDate,
      ).toBe("2026-09-13");
    },
  );

  it("still covers future-dated entries the report data proves exist", () => {
    expect(
      resolveReportingPeriod({
        kind: "balance_sheet",
        timeFilter: "",
        reportDates: ["2026-09-30", "2026-10-31"],
        generatedOn: "2026-09-13",
        interval: "monthly",
      }).asOfDate,
    ).toBe("2026-10-31");
  });

  it("keeps an explicit time selection's end date", () => {
    expect(
      resolveReportingPeriod({
        kind: "balance_sheet",
        timeFilter: "2026-Q2",
        reportDates: ["2026-06-30"],
        generatedOn: "2026-09-13",
        interval: "monthly",
      }),
    ).toMatchObject({ asOfDate: "2026-06-30", isExplicit: true });
  });

  it("leaves the date unresolved when the report returned no dates", () => {
    expect(
      resolveReportingPeriod({
        kind: "balance_sheet",
        timeFilter: "",
        reportDates: [],
        generatedOn: "2026-09-13",
        interval: "monthly",
      }),
    ).toMatchObject({ asOfDate: null, isExplicit: false });
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
        generatedOn: "2026-09-13",
        interval: "monthly",
      }),
    ).toMatchObject({
      startDate: null,
      endDate: "2026-09-13",
      isExplicit: false,
    });
  });
});
