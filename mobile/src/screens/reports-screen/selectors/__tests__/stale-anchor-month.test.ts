import fs from "fs";
import path from "path";
import { staleAnchorMonth } from "../select-income-expense-chart";
import { formatLedgerMonth } from "../../../../common/date-format";

/**
 * w21/727: Spending's "See all" said "This month $0.00" and opened Reports' 1M
 * on August, the latest month with entries (w21/166), with nothing saying so.
 */
describe("staleAnchorMonth", () => {
  it("names an earlier month the ranges end on", () => {
    expect(staleAnchorMonth("2026-08", "2026-10", "1M")).toBe("2026-08");
    expect(staleAnchorMonth("2026-08", "2026-10", "6M")).toBe("2026-08");
  });

  it("says nothing for this month, for ALL, or before the statement loads", () => {
    expect(staleAnchorMonth("2026-10", "2026-10", "1M")).toBe(null);
    expect(staleAnchorMonth("2026-08", "2026-10", "ALL")).toBe(null);
    expect(staleAnchorMonth(null, "2026-10", "1M")).toBe(null);
  });
});

describe("formatLedgerMonth", () => {
  it("names the month in the app's language", () => {
    expect(formatLedgerMonth("2026-08", "en")).toBe("August 2026");
    expect(formatLedgerMonth("2026-08", "de")).toBe("August 2026");
    expect(formatLedgerMonth("2026-03", "de")).toBe("März 2026");
    expect(formatLedgerMonth("nope", "en")).toBe("nope");
  });

  it("is what Reports says under its range pills", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "..", "reports-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      screen.includes("staleAnchorMonth(anchorMonth,currentMonth,timeRange)"),
    ).toBe(true);
    expect(
      screen.includes(
        't("reportsThroughLatestMonth",{month:formatLedgerMonth(staleAnchor,locale),})',
      ),
    ).toBe(true);
  });
});

// w21/890: every January, YTD showed an empty report under "Showing through
// December".
describe("staleAnchorMonth for YTD", () => {
  it("has no banner when the anchor is before this year", () => {
    expect(staleAnchorMonth("2026-12", "2027-01", "YTD")).toBe(null);
    expect(staleAnchorMonth("2025-08", "2026-10", "YTD")).toBe(null);
  });

  it("keeps the banner for an anchor inside this year, and for other ranges", () => {
    expect(staleAnchorMonth("2026-08", "2026-10", "YTD")).toBe("2026-08");
    expect(staleAnchorMonth("2026-12", "2027-01", "1M")).toBe("2026-12");
    expect(staleAnchorMonth("2026-12", "2027-01", "ALL")).toBe(null);
  });
});
