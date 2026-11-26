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

  it("rejects selections no engine date can cover", () => {
    // Fava raises on year 0 and the backend refuses it, so the export must
    // not label an explicit year-0 period the numbers cannot cover.
    expect(parseConcreteTimeFilter("0000")).toBeNull();
    expect(parseConcreteTimeFilter("0000-01-01")).toBeNull();
    expect(parseConcreteTimeFilter("0000-w01")).toBeNull();
    expect(parseConcreteTimeFilter("fy0000")).toBeNull();
    expect(parseConcreteTimeFilter("fy0001", { month: 6, day: 30 })).toBeNull();
    // Week arithmetic past 9999-12-31 must not render the expanded-year
    // slice (`+010000-01`) as the statement's end date.
    expect(parseConcreteTimeFilter("9999-w52")).toBeNull();
    // Years the ledger accepts keep resolving.
    expect(parseConcreteTimeFilter("0099")).toEqual({
      startDate: "0099-01-01",
      endDate: "0099-12-31",
    });
  });

  it("respects the ledger fiscal-year end", () => {
    expect(parseConcreteTimeFilter("FY2026", { month: 3, day: 31 })).toEqual({
      startDate: "2025-04-01",
      endDate: "2026-03-31",
    });
  });

  it("resolves a fiscal year against a modulo-wrapped year end", () => {
    // Fava's `parse_fye_string` accepts `00-31` and reads month 0 as December
    // of the previous year, so FY2026 is calendar 2025; the backend serves
    // that `{ month: 0, day: 31 }` straight through. Python's `%` floors, so
    // the port must floor explicitly for months below 1.
    expect(parseConcreteTimeFilter("FY2026", { month: 0, day: 31 })).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(parseConcreteTimeFilter("FY2026-Q1", { month: 0, day: 31 })).toEqual(
      {
        startDate: "2025-01-01",
        endDate: "2025-03-31",
      },
    );
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

  /**
   * The backend substitutes relative tokens before filtering, so the numbers
   * really do cover 2025. The export cannot resolve `year-1` itself, and must
   * not fall back to the generation day and date a 2025 statement as covering
   * activity through today.
   */
  describe("a selection the export cannot resolve", () => {
    const REPORT_DATES = ["2025-01-31", "2025-06-30", "2025-12-31"] as const;

    it.each(["year-1", "quarter-1", "month-2", "2025 - "])(
      "leaves the period unknown for %j rather than claiming today",
      (timeFilter) => {
        const period = resolveReportingPeriod({
          kind: "profit_and_loss",
          timeFilter,
          reportDates: [...REPORT_DATES],
          generatedOn: "2026-09-17",
          interval: "monthly",
        });

        expect(period.startDate).toBeNull();
        expect(period.endDate).toBeNull();
        expect(period.isExplicit).toBe(false);
        // The raw selection survives (trimmed), so the export can still state
        // the scope.
        expect(period.selection).toBe(timeFilter.trim());
      },
    );

    it("leaves a balance sheet without an as-of date", () => {
      const period = resolveReportingPeriod({
        kind: "balance_sheet",
        timeFilter: "year-1",
        reportDates: [...REPORT_DATES],
        generatedOn: "2026-09-17",
        interval: "monthly",
      });

      expect(period.asOfDate).toBeNull();
      expect(period.isExplicit).toBe(false);
      expect(period.selection).toBe("year-1");
    });

    it("still resolves the same selection written concretely", () => {
      expect(
        resolveReportingPeriod({
          kind: "profit_and_loss",
          timeFilter: "2025",
          reportDates: [...REPORT_DATES],
          generatedOn: "2026-09-17",
          interval: "monthly",
        }),
      ).toEqual({
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        asOfDate: null,
        isExplicit: true,
        selection: "2025",
      });
    });

    it("leaves the genuinely unfiltered statement untouched", () => {
      // w1/022's guarantee: no selection still runs through the generation day.
      const period = resolveReportingPeriod({
        kind: "profit_and_loss",
        timeFilter: "   ",
        reportDates: [...REPORT_DATES],
        generatedOn: "2026-09-17",
        interval: "monthly",
      });

      expect(period.endDate).toBe("2026-09-17");
      expect(period.selection).toBe("");
      expect(period.isExplicit).toBe(false);
    });
  });
});
