import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { parseStrictCalendarDate } from "../date-picker";

describe("parseStrictCalendarDate", () => {
  it("accepts complete MM/dd/yyyy and yyyy-MM-dd calendar dates", () => {
    expect(format(parseStrictCalendarDate("06/15/2025")!, "yyyy-MM-dd")).toBe(
      "2025-06-15",
    );
    expect(format(parseStrictCalendarDate("2025-06-15")!, "yyyy-MM-dd")).toBe(
      "2025-06-15",
    );
    expect(format(parseStrictCalendarDate("02/28/2025")!, "yyyy-MM-dd")).toBe(
      "2025-02-28",
    );
  });

  it("rejects incomplete, invalid and rolled-over calendar dates", () => {
    expect(parseStrictCalendarDate("")).toBeUndefined();
    expect(parseStrictCalendarDate("0")).toBeUndefined();
    expect(parseStrictCalendarDate("06/15/202")).toBeUndefined();
    expect(parseStrictCalendarDate("not-a-date")).toBeUndefined();
    expect(parseStrictCalendarDate("02/30/2025")).toBeUndefined();
  });
});
