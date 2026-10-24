import {
  formatLedgerDate,
  formatLedgerDateShort,
  formatFeedDate,
} from "../date-format";

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

describe("formatLedgerDateShort", () => {
  it("formats a ledger day in short form", () => {
    expect(formatLedgerDateShort("2026-08-17", "en")).toBe("Aug 17, 2026");
    expect(formatLedgerDateShort("2025-12-31", "en")).toBe("Dec 31, 2025");
  });

  it("returns the raw string when the input is not a valid date", () => {
    expect(formatLedgerDateShort("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("formatFeedDate", () => {
  it("formats a timestamp in short form", () => {
    expect(formatFeedDate("2026-08-17T12:00:00Z", "en")).toBe("Aug 17, 2026");
  });

  // w21/147: a date-only post arrives as midnight UTC and read a day early
  // west of UTC.
  it("keeps a date-only post on its day in every zone", () => {
    const previous = process.env.TZ;
    try {
      for (const zone of [
        "America/Los_Angeles",
        "Pacific/Honolulu",
        "UTC",
        "Asia/Tokyo",
      ]) {
        process.env.TZ = zone;
        expect(
          formatFeedDate("2026-10-21T00:00:00.000Z", "en", {
            calendarDay: true,
          }),
        ).toBe("Oct 21, 2026");
      }
      // An instant still reads in the device's zone.
      process.env.TZ = "America/Los_Angeles";
      expect(formatFeedDate("2026-10-21T00:00:00.000Z", "en")).toBe(
        "Oct 20, 2026",
      );
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it("returns empty for anything unparseable", () => {
    // A feed row with no date reads fine; one saying "Invalid Date" does not.
    expect(formatFeedDate("nonsense", "en")).toBe("");
    expect(formatFeedDate(null, "en")).toBe("");
    expect(formatFeedDate(undefined, "en")).toBe("");
  });
});

// w21/979: a formatter was built per call, and every loaded page paid it again.
describe("cached date formatting", () => {
  const dates = ["2025-12-31", "2026-01-01", "2026-02-28", "2024-02-29"];

  it("reads exactly as toLocaleDateString did, in English, German and Persian", () => {
    for (const locale of ["en", "de", "fa"]) {
      for (const iso of dates) {
        const [y, m, d] = iso.split("-").map(Number);
        const at = new Date(Date.UTC(y!, m! - 1, d));
        expect(formatLedgerDate(iso, locale)).toBe(
          at.toLocaleDateString(`${locale}-u-ca-gregory`, {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }),
        );
        expect(formatLedgerDateShort(iso, locale)).toBe(
          at.toLocaleDateString(`${locale}-u-ca-gregory`, {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }),
        );
      }
    }
  });

  it("gives the same text on a repeat, and keeps a malformed date as itself", () => {
    expect(formatLedgerDate("2026-10-23", "de")).toBe(
      formatLedgerDate("2026-10-23", "de"),
    );
    expect(formatLedgerDate("not-a-date", "en")).toBe("not-a-date");
  });

  it("formats thousands of dates quickly", () => {
    const start = Date.now();
    for (let i = 0; i < 20000; i += 1) {
      const day = (i % 28) + 1;
      formatLedgerDate(
        `2026-${String((i % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        "en",
      );
    }
    expect(Date.now() - start < 300).toBe(true);
  });
});
