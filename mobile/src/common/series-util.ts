import { localizeDigits } from "./date-format";
import { resolveCurrencyBalance } from "./balance-util";

/** A charted point: an ISO date and its numeric value in the active currency. */
export type SeriesPoint = { date: string; value: number };

/** A `{ date, balance }` point as returned by balance-sheet / account-report
 * series (balance is a currency-keyed map). */
export type DateBalancePoint = {
  date: string;
  balance: Record<string, number | string>;
};

/** Robinhood-style time filter. Our series are monthly, so the windows are
 * month-based (a 1D/1W pill would be meaningless on monthly data). */
export type TimeRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];

/** Translation keys for each time-range pill's label. */
export const RANGE_LABEL_KEYS: Record<TimeRange, string> = {
  "1M": "range1M",
  "3M": "range3M",
  "6M": "range6M",
  YTD: "rangeYTD",
  "1Y": "range1Y",
  ALL: "rangeAll",
};

/**
 * What VoiceOver says for a range pill, by the key of its short label: "1M" was
 * read as "1 M" and "YTD" spelled out letter by letter (w21/560).
 */
const SPOKEN_RANGE_KEYS: Record<string, string> = {
  range1M: "rangeSpoken1M",
  range3M: "rangeSpoken3M",
  range6M: "rangeSpoken6M",
  rangeYTD: "rangeSpokenYTD",
  range1Y: "rangeSpoken1Y",
  rangeLastYear: "rangeSpokenLastYear",
  rangeAll: "rangeSpokenAll",
};

/** A range pill's short label and the full name that is spoken for it. */
export function rangePillText(
  t: (key: string) => string,
  labelKey: string,
): { label: string; spoken: string } {
  const label = t(labelKey);
  const spokenKey = SPOKEN_RANGE_KEYS[labelKey];
  return { label, spoken: spokenKey ? t(spokenKey) : label };
}

// Fixed month-window lengths. "YTD" (year-to-date) and "ALL" are handled
// specially in filterSeriesByRange, so they are excluded here.
const RANGE_MONTHS: Record<Exclude<TimeRange, "ALL" | "YTD">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
};

/**
 * Convert a `{ date, balance }` series (net worth, an account's balance
 * history, …) into a monthly `SeriesPoint[]` in the active currency: one
 * (most recent) point per month, ascending by date. Reads each balance with the
 * shared currency-balance resolver (active currency, string coercion) unless
 * `read` says otherwise — a units series reads strictly.
 */
export function pointsToMonthlySeries(
  currency: string,
  points: ReadonlyArray<DateBalancePoint | null | undefined> | null | undefined,
  read: (
    balance: DateBalancePoint["balance"],
    currency: string,
  ) => number = resolveCurrencyBalance,
): SeriesPoint[] {
  // Keep the most recent entry per month (input is chronological).
  const byMonth = new Map<string, SeriesPoint>();
  for (const point of points ?? []) {
    if (!point?.date) {
      continue;
    }
    byMonth.set(point.date.slice(0, 7), {
      date: point.date,
      value: read(point.balance, currency),
    });
  }

  return Array.from(byMonth.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * A balance series with every month between its first and last point: a
 * month with no postings repeats the balance it closed with, dated its last
 * day. Spaced by index, a dormant month otherwise had no point or scrub stop,
 * and the curve drew a September "~$1,750" where the close was $2,000
 * (w21/164). For balances only: a per-period change series is zero in a
 * dormant month, not the month before.
 */
export function forwardFillMonths(
  series: readonly SeriesPoint[],
): SeriesPoint[] {
  const filled: SeriesPoint[] = [];
  for (const point of series) {
    const previous = filled[filled.length - 1];
    if (previous) {
      let year = Number(previous.date.slice(0, 4));
      let month = Number(previous.date.slice(5, 7));
      const target = point.date.slice(0, 7);
      for (;;) {
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
        const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
        if (key >= target) break;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        filled.push({
          date: `${key}-${String(lastDay).padStart(2, "0")}`,
          value: previous.value,
        });
      }
    }
    filled.push(point);
  }
  return filled;
}

/**
 * A balance series as of `today`, carried to its month with its last balance.
 * A series has a point only where the balance changed, so one account's last
 * point is that account's last posting; windows counted back from it showed a
 * quiet account's old changes as recent: on 21 October, a Savings account last
 * moved in March read "+$500.00" over 1M (w21/240). Points after today go the
 * other way: one entry pre-entered for next month (or a price dated then) put
 * the last point in November, and Home's 1M read November's rent, not
 * October's salary (w21/641). Rows after the current month go, and a point
 * later this month is dated today, as account detail's are (w21/491).
 * Balances only. A series with nothing after today and a point this month is
 * returned as it is.
 */
export function carryBalanceToToday(
  series: SeriesPoint[],
  today: string,
): SeriesPoint[] {
  const thisMonth = today.slice(0, 7);
  const upToToday = series.some((point) => point.date > today)
    ? series
        .filter((point) => point.date.slice(0, 7) <= thisMonth)
        .map((point) =>
          point.date > today ? { ...point, date: today } : point,
        )
    : series;
  const last = upToToday[upToToday.length - 1];
  if (!last || last.date.slice(0, 7) >= thisMonth) return upToToday;
  return forwardFillMonths([...upToToday, { date: today, value: last.value }]);
}

/**
 * The balance map of a series' latest point (series are chronological). With
 * `today`, the latest point in or before the current month, as the curves'
 * `carryBalanceToToday` reads them: a point for next month describes holdings
 * that are not held yet (w21/665).
 */
export function latestBalance(
  points: ReadonlyArray<DateBalancePoint | null | undefined> | null | undefined,
  today?: string,
): DateBalancePoint["balance"] | undefined {
  if (today === undefined) return points?.[points.length - 1]?.balance;
  const thisMonth = today.slice(0, 7);
  let latest: DateBalancePoint | null | undefined;
  for (const point of points ?? []) {
    if (point?.date && point.date.slice(0, 7) <= thisMonth) latest = point;
  }
  return latest?.balance;
}

/**
 * Inclusive lower-bound "YYYY-MM" for a time range, anchored to a reference
 * month (typically the latest data point). "YTD" → January of the current year,
 * even when the reference month is older;
 * "1M/3M/6M/1Y" → the reference month and the N-1 before it (plain month math,
 * stepping the year back on underflow). "ALL" returns "" (no lower bound).
 *
 * Shared so the Spending chart and its transaction list apply the same window.
 */
export function rangeStartMonth(
  range: TimeRange,
  referenceYearMonth: string,
  currentYear: number = new Date().getFullYear(),
): string {
  if (range === "ALL") {
    return "";
  }
  // "Year to date" names the calendar year, so it cannot follow a stale
  // ledger's latest point back into a past year the way a rolling range can.
  if (range === "YTD") {
    return `${currentYear}-01`;
  }
  const [year, month] = referenceYearMonth.split("-").map(Number);
  const monthsBack = RANGE_MONTHS[range];
  let y = year;
  let m = month - (monthsBack - 1);
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Filter a monthly series to a time range. The window is anchored to the
 * **latest data point** (not "today") so a stale ledger still shows history
 * instead of an empty chart. "ALL" returns the whole series. "YTD" is the
 * exception: it is the current calendar year, so a series that ended in an
 * earlier year has no year-to-date points.
 */
export function filterSeriesByRange(
  series: SeriesPoint[],
  range: TimeRange,
  currentYear?: number,
): SeriesPoint[] {
  if (range === "ALL" || series.length === 0) {
    return series;
  }
  const cutoffKey = rangeStartMonth(
    range,
    series[series.length - 1].date.slice(0, 7),
    currentYear,
  );
  return series.filter((point) => point.date.slice(0, 7) >= cutoffKey);
}

/**
 * The month a report's flow ranges end on: the latest month with data, but
 * never after the current one. A single pre-entered rent cheque for next
 * month otherwise moved every range onto a month that had not happened, so
 * "1M" in October showed only November (w21/166). A stale ledger, whose data
 * ends earlier, keeps its latest month.
 */
/** The device's current "YYYY-MM". */
export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function flowAnchorMonth(
  latestDataMonth: string,
  currentMonth: string,
): string {
  return latestDataMonth < currentMonth ? latestDataMonth : currentMonth;
}

/**
 * Range filter for **flow series** in Reports (income, expenses, net profit):
 * the range ends on `flowAnchorMonth`, so a future month falls outside every
 * range except "ALL". Balance series keep `filterBalanceSeriesByRange`, which
 * stays consistent with headlines that include future entries.
 */
export function filterFlowSeriesByRange(
  series: SeriesPoint[],
  range: TimeRange,
  currentMonth: string,
  currentYear?: number,
): SeriesPoint[] {
  if (range === "ALL" || series.length === 0) {
    return series;
  }
  const anchor = flowAnchorMonth(
    series[series.length - 1].date.slice(0, 7),
    currentMonth,
  );
  const cutoffKey = rangeStartMonth(range, anchor, currentYear);
  return series.filter((point) => {
    const month = point.date.slice(0, 7);
    return month >= cutoffKey && month <= anchor;
  });
}

/**
 * Range filter for **balance (stock) series** — net worth, assets, liabilities,
 * an account's balance — where the window's first point is the baseline the
 * change is measured from. Our series are monthly, so a "1M" window holds
 * exactly one point and would render as a blank plot with a flat +0.00% change;
 * a window that can't draw a line borrows the point just before it, making 1M
 * read "last month → this month".
 *
 * Not for **flow series** (net profit, spending, income): each of their points
 * is that period's own total, and the reports' transaction lists are sliced by
 * `rangeStartMonth` — an extra month would put chart and list out of step.
 */
export function filterBalanceSeriesByRange(
  series: SeriesPoint[],
  range: TimeRange,
  currentYear?: number,
): SeriesPoint[] {
  const windowed = filterSeriesByRange(series, range, currentYear);
  const startIndex = series.length - windowed.length;
  return windowed.length < 2 && startIndex > 0
    ? series.slice(startIndex - 1)
    : windowed;
}

/**
 * The balance when a range's window opened, which a balance card measures its
 * change from. Monthly points are closing balances, so the window's first
 * plotted point already includes that month's activity; the opening balance is
 * the point before the window. Before a series' first point it is zero: these
 * series start at the ledger's first data, so a dormant-then-funded account
 * changes by its whole balance. A one-month window borrows that same earlier
 * point to draw its line (`filterBalanceSeriesByRange`), so the two agree.
 */
export function balanceSeriesBaseline(
  series: SeriesPoint[],
  range: TimeRange,
  currentYear?: number,
): number {
  const windowed = filterSeriesByRange(series, range, currentYear);
  const startIndex = series.length - windowed.length;
  return startIndex > 0 ? series[startIndex - 1].value : 0;
}

/**
 * Convert a series to the `{ labels, numbers, periods }` shape the charts
 * consume: month labels ("MM") for the axis, and each point's full period
 * ("YYYY-MM") so a selection can name its year — an ALL window has a March in
 * every year. Returns a single zero "no data" entry when empty.
 */
export function seriesToChartArray(
  series: SeriesPoint[],
  emptyLabel: string,
): { labels: string[]; numbers: number[]; periods: string[] } {
  if (series.length === 0) {
    return { labels: [emptyLabel], numbers: [0], periods: [] };
  }
  return {
    labels: series.map((point) => point.date.slice(5, 7)),
    numbers: series.map((point) => point.value),
    periods: series.map((point) => point.date.slice(0, 7)),
  };
}

/**
 * The label for a selected chart point: its translated month, plus the year
 * when the point's period is known ("MAR 2024"). Without a period (the
 * "no data" entry) the month label stands alone.
 */
export function selectedPeriodLabel(
  monthLabel: string,
  period: string | undefined,
  locale = "en",
): string {
  const year = period?.slice(0, 4);
  return year && /^\d{4}$/.test(year)
    ? `${monthLabel} ${localizeDigits(year, locale)}`
    : monthLabel;
}

/**
 * Align income / expense / net monthly series onto ONE shared month axis for the
 * combined reports chart. The three series are filtered independently, so a month
 * present in one may be missing from another (e.g. a month with income but no
 * expenses); we union every month key ("YYYY-MM"), sort ascending, and 0-fill any
 * series that lacks a month. Returns the unique `months` keys plus the three
 * aligned number arrays, each the same length as `months`.
 *
 * `months` are the full "YYYY-MM" keys, NOT "MM": the chart uses them as its x
 * identity so a span crossing a year boundary (e.g. two Julys) keeps a distinct
 * column per month instead of collapsing them. Display labels are derived from the
 * key downstream (`t(month.slice(5, 7))`).
 *
 * Callers pass series already sign-corrected for display (income negated to
 * positive); this only aligns, it does not touch signs.
 */
export function alignMonthlySeries(input: {
  income: SeriesPoint[];
  expense: SeriesPoint[];
  net: SeriesPoint[];
}): { months: string[]; income: number[]; expense: number[]; net: number[] } {
  const keyOf = (point: SeriesPoint) => point.date.slice(0, 7);
  const months = Array.from(
    new Set([...input.income, ...input.expense, ...input.net].map(keyOf)),
  ).sort();
  const alignTo = (series: SeriesPoint[]) => {
    const byMonth = new Map(series.map((point) => [keyOf(point), point.value]));
    return months.map((month) => byMonth.get(month) ?? 0);
  };
  return {
    months,
    income: alignTo(input.income),
    expense: alignTo(input.expense),
    net: alignTo(input.net),
  };
}
