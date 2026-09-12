import { describe, it, expect, afterEach } from "vitest";
import { formatImportDateForDisplay } from "../format-import-date";

const originalTZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTZ;
});

describe("formatImportDateForDisplay", () => {
  it.each(["UTC", "America/Los_Angeles", "Asia/Shanghai", "Pacific/Apia"])(
    "shows the same calendar day in %s",
    (timeZone) => {
      process.env.TZ = timeZone;
      expect(formatImportDateForDisplay("2024-06-15", "en-US")).toBe(
        "6/15/2024",
      );
    },
  );

  it("shows a calendar day the local zone skipped", () => {
    process.env.TZ = "Pacific/Apia";
    expect(formatImportDateForDisplay("2011-12-30", "en-US")).toBe(
      "12/30/2011",
    );
  });

  it("respects the requested locale order", () => {
    process.env.TZ = "UTC";
    expect(formatImportDateForDisplay("2024-06-15", "de-DE")).toBe("15.6.2024");
  });

  it("returns unparseable input verbatim instead of 'Invalid Date'", () => {
    expect(formatImportDateForDisplay("not-a-date", "en-US")).toBe(
      "not-a-date",
    );
    expect(formatImportDateForDisplay("2023-02-29", "en-US")).toBe(
      "2023-02-29",
    );
    expect(formatImportDateForDisplay("", "en-US")).toBe("");
  });
});
