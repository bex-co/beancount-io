import { localDate, utcDate, utcTime } from "../calendar-date";
import { formatLedgerDate, formatLedgerDateShort } from "../date-format";
import { initialOpenDate } from "../../screens/open-account-screen/open-date";

// w21/043: Date.UTC(year, …) reads years 0–99 as 1900–1999, so an entry dated
// 0050-03-01 displayed as March 1, 1950.
describe("calendar dates in years 0001–0099", () => {
  it("builds the year as given", () => {
    expect(utcDate(50, 2, 1).toISOString()).toBe("0050-03-01T00:00:00.000Z");
    expect(utcDate(1, 0, 1).getUTCFullYear()).toBe(1);
    expect(utcDate(2026, 7, 28).toISOString()).toBe("2026-08-28T00:00:00.000Z");
    expect(localDate(99, 11, 31).getFullYear()).toBe(99);
  });

  it("overflows months and days the way Date.UTC does", () => {
    // Day 0 is the previous month's last day; month 12 is next January.
    expect(utcDate(50, 2, 0).toISOString()).toBe("0050-02-28T00:00:00.000Z");
    expect(utcDate(99, 12, 1).toISOString()).toBe("0100-01-01T00:00:00.000Z");
    expect(utcTime(2026, 0, 2) - utcTime(2026, 0, 1)).toBe(86400000);
  });

  it("formats early-year ledger dates without the 1900 offset", () => {
    expect(formatLedgerDate("0050-03-01", "en")).toBe("March 1, 50");
    expect(formatLedgerDate("0099-12-31", "en")).toBe("December 31, 99");
    expect(formatLedgerDate("0001-01-01", "en")).toBe("January 1, 1");
    expect(formatLedgerDate("2026-08-28", "en")).toBe("August 28, 2026");
    expect(formatLedgerDateShort("0050-03-01", "en")).toBe("Mar 1, 50");
  });

  it("opens an account on an early-year entry date", () => {
    const date = initialOpenDate("0050-03-01", new Date(2026, 9, 21));
    expect(date.getFullYear()).toBe(50);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
  });
});

describe("period math in years 0001–0099", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const recurrence = require("../../screens/merchants-screen/selectors/detect-recurrence");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const series = require("../../screens/merchants-screen/selectors/payee-series");

  it("counts days and round-trips ledger days as in a four-digit year", () => {
    const early = recurrence.parseLedgerDay("0050-03-01");
    const late = recurrence.parseLedgerDay("2050-03-01");
    expect(recurrence.formatLedgerDay(early)).toBe("0050-03-01");
    expect(recurrence.parseLedgerDay("0050-04-01") - early).toBe(
      recurrence.parseLedgerDay("2050-04-01") - late,
    );
  });

  it("shifts months and clamps month ends as in a four-digit year", () => {
    expect(series.shiftLedgerMonths("0050-01-31", 1)).toBe("0050-02-28");
    expect(series.shiftLedgerMonths("2050-01-31", 1)).toBe("2050-02-28");
  });
});

describe("ledger dates written for years 0001–0099", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFormatDate } = require("../format-util");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const budget = require("../../screens/budget-screen/selectors/budget-selectors");

  it("writes a four-digit year", () => {
    expect(getFormatDate(localDate(50, 2, 1))).toBe("0050-03-01");
    expect(getFormatDate(localDate(2026, 9, 21))).toBe("2026-10-21");
  });

  it("budgets a month in year 0050 exactly as in 2050", () => {
    const prorate = (year: string) =>
      budget.budgetForInterval(
        `${year}-10-31`,
        "monthly",
        budget.prepareBudgetHistory([
          {
            date: `${year}-08-01`,
            interval: "monthly",
            amount: "500 USD",
            entry_hash: "h",
          },
        ]),
        `${year}-10-20`,
      );
    expect(prorate("0050")).toBe(prorate("2050"));
    expect(Math.round(prorate("0050") * 100) / 100).toBe(500);
  });
});
