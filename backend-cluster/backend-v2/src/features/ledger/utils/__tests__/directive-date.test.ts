import { parseDirectiveDate } from "../directive-date";
import { BadUserInputError } from "@/shared/errors";

describe("parseDirectiveDate", () => {
  it.each(["2026-01-01", "2024-02-29", "2026-12-31"])("accepts %s", (value) => {
    expect(parseDirectiveDate(value).toISOString().slice(0, 10)).toBe(value);
  });

  it.each([
    "2026-13-45",
    "2026-02-30",
    "2025-02-29",
    "2026-00-10",
    "2026-1-5",
    "26-01-05",
    "2026/01/05",
    "2026-01-05T00:00:00Z",
    "yesterday",
    "",
  ])("refuses %j as the caller's input, naming it", (value) => {
    expect(() => parseDirectiveDate(value, "entry 3 date")).toThrow(
      BadUserInputError,
    );
    expect(() => parseDirectiveDate(value, "entry 3 date")).toThrow(
      /entry 3 date/,
    );
  });
});
