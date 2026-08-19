import { formatLedgerDate, formatFeedDate } from "../date-format";

describe("formatLedgerDate", () => {
  it("formats an ISO ledger date in English", () => {
    expect(formatLedgerDate("2026-07-06", "en")).toBe("July 6, 2026");
    expect(formatLedgerDate("2026-01-01", "en")).toBe("January 1, 2026");
    expect(formatLedgerDate("2025-12-31", "en")).toBe("December 31, 2025");
  });

  it("formats the same day in the reader's language", () => {
    // The defect this module exists for: every locale used to get the English
    // long form. These assert real ICU output, not a mocked formatter.
    expect(formatLedgerDate("2025-12-31", "de")).toBe("31. Dezember 2025");
    expect(formatLedgerDate("2025-12-31", "zh")).toBe("2025年12月31日");
  });

  it("keeps every locale on the Gregorian calendar", () => {
    // Persian would otherwise render this as 10 Dey 1404. The ledger file says
    // 2025-12-31, and a date the user reconciles against must agree with it.
    // Persian digits are still Persian — only the calendar is pinned.
    expect(formatLedgerDate("2025-12-31", "fa")).toBe("۳۱ دسامبر ۲۰۲۵");
  });

  it("does not shift the day across time zones", () => {
    // Parsed and formatted as UTC. Interpreting a bare ledger date in the
    // device zone turns it into the previous day everywhere west of Greenwich.
    expect(formatLedgerDate("2026-01-01", "en")).toBe("January 1, 2026");
  });

  it("returns the raw string when the input is not a valid date", () => {
    expect(formatLedgerDate("not-a-date", "en")).toBe("not-a-date");
    expect(formatLedgerDate("", "en")).toBe("");
  });
});

describe("formatFeedDate", () => {
  it("formats a timestamp in short form", () => {
    expect(formatFeedDate("2026-08-17T12:00:00Z", "en")).toBe("Aug 17, 2026");
  });

  it("returns empty for anything unparseable", () => {
    // A feed row with no date reads fine; one saying "Invalid Date" does not.
    expect(formatFeedDate("nonsense", "en")).toBe("");
    expect(formatFeedDate(null, "en")).toBe("");
    expect(formatFeedDate(undefined, "en")).toBe("");
  });
});
