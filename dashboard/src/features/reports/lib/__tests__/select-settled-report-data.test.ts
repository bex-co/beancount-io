import { describe, expect, it } from "vitest";
import { selectSettledReportData } from "../select-settled-report-data";

describe("selectSettledReportData", () => {
  it("withholds data while loading so previous results cannot be relabeled", () => {
    expect(selectSettledReportData(true, { conversion: "at_cost" })).toEqual({
      pending: true,
    });
  });

  it("returns settled data when the query is idle", () => {
    const payload = { units: ["USD"] };
    expect(selectSettledReportData(false, payload)).toEqual({
      pending: false,
      data: payload,
    });
  });

  it("treats nullish settled payloads as empty, not pending", () => {
    expect(selectSettledReportData(false, null)).toEqual({
      pending: false,
      data: undefined,
    });
    expect(selectSettledReportData(false, undefined)).toEqual({
      pending: false,
      data: undefined,
    });
  });
});
