import type { StatementKind } from "./model";
import type { ChartInterval } from "@/common/types/chart";

export interface FiscalYearEnd {
  month: number;
  day: number;
}

export interface StatementReportingPeriod {
  startDate: string | null;
  endDate: string | null;
  asOfDate: string | null;
  isExplicit: boolean;
  selection: string;
}

interface DateRange {
  start: Date;
  endExclusive: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RETURNED_INTERVALS = 100;
const DEFAULT_FISCAL_YEAR_END: FiscalYearEnd = { month: 12, day: 31 };

function utcDate(year: number, month: number, day: number): Date | null {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
    ? value
    : null;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function addMonths(value: Date, months: number): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  );
}

function addYears(value: Date, years: number): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear() + years,
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}

function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isoWeekStart(year: number, week: number): Date | null {
  if (week < 1 || week > 53) return null;
  const januaryFourth = utcDate(year, 1, 4);
  if (!januaryFourth) return null;
  const mondayOffset = (januaryFourth.getUTCDay() + 6) % 7;
  const start = addDays(januaryFourth, -mondayOffset + (week - 1) * 7);
  const thursday = addDays(start, 3);
  return thursday.getUTCFullYear() === year ? start : null;
}

function fiscalPeriod(
  year: number,
  fiscalYearEnd: FiscalYearEnd,
  quarter?: number,
): DateRange | null {
  const monthOfYear = ((fiscalYearEnd.month - 1) % 12) + 1;
  const yearOffset = Math.floor((fiscalYearEnd.month - 1) / 12);
  const fiscalEnd = utcDate(
    year - 1 + yearOffset,
    monthOfYear,
    fiscalYearEnd.day,
  );
  if (!fiscalEnd) return null;

  let start = addDays(fiscalEnd, 1);
  if (monthOfYear === 2 && fiscalYearEnd.day === 28) {
    start = new Date(Date.UTC(start.getUTCFullYear(), 2, 1));
  }

  if (quarter === undefined) {
    return { start, endExclusive: addYears(start, 1) };
  }
  if (quarter < 1 || quarter > 4 || start.getUTCDate() !== 1) return null;
  start = addMonths(start, (quarter - 1) * 3);
  return { start, endExclusive: addMonths(start, 3) };
}

function parseDateToken(
  token: string,
  fiscalYearEnd: FiscalYearEnd,
): DateRange | null {
  const value = token.trim().toLowerCase();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const start = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return start ? { start, endExclusive: addDays(start, 1) } : null;
  }

  match = /^(\d{4})-(\d{2})$/.exec(value);
  if (match) {
    const start = utcDate(Number(match[1]), Number(match[2]), 1);
    return start ? { start, endExclusive: addMonths(start, 1) } : null;
  }

  match = /^(\d{4})$/.exec(value);
  if (match) {
    const start = utcDate(Number(match[1]), 1, 1);
    return start ? { start, endExclusive: addYears(start, 1) } : null;
  }

  match = /^(\d{4})-q([1-4])$/.exec(value);
  if (match) {
    const start = utcDate(Number(match[1]), (Number(match[2]) - 1) * 3 + 1, 1);
    return start ? { start, endExclusive: addMonths(start, 3) } : null;
  }

  match = /^(\d{4})-w(\d{2})$/.exec(value);
  if (match) {
    const start = isoWeekStart(Number(match[1]), Number(match[2]));
    return start ? { start, endExclusive: addDays(start, 7) } : null;
  }

  match = /^fy(\d{4})(?:-q([1-4]))?$/.exec(value);
  if (match) {
    return fiscalPeriod(
      Number(match[1]),
      fiscalYearEnd,
      match[2] ? Number(match[2]) : undefined,
    );
  }

  return null;
}

/** Parse the same concrete date forms accepted by Fava's time filter. */
export function parseConcreteTimeFilter(
  timeFilter: string,
  fiscalYearEnd: FiscalYearEnd = DEFAULT_FISCAL_YEAR_END,
): { startDate: string; endDate: string } | null {
  const selection = timeFilter.trim();
  if (!selection) return null;

  const rangeMatch = /^(.*?)(?:-|to)(?=\s*(?:fy)*\d{4})(.*)$/i.exec(selection);
  const startRange = parseDateToken(
    rangeMatch?.[1] ?? selection,
    fiscalYearEnd,
  );
  const endRange = rangeMatch
    ? parseDateToken(rangeMatch[2], fiscalYearEnd)
    : startRange;
  if (!startRange || !endRange || startRange.start >= endRange.endExclusive) {
    return null;
  }

  return {
    startDate: toISODate(startRange.start),
    endDate: toISODate(addDays(endRange.endExclusive, -1)),
  };
}

function validReportDates(reportDates: readonly string[]): string[] {
  return [
    ...new Set(
      reportDates.filter((value) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        return Boolean(
          match &&
          utcDate(Number(match[1]), Number(match[2]), Number(match[3])),
        );
      }),
    ),
  ].sort();
}

function intervalStart(
  reportDate: string,
  interval: ChartInterval | undefined,
): string | null {
  const [year, month, day] = reportDate.split("-").map(Number);
  const value = utcDate(year, month, day);
  if (!value || !interval) return null;

  if (interval === "yearly") return toISODate(utcDate(year, 1, 1)!);
  if (interval === "quarterly") {
    return toISODate(utcDate(year, Math.floor((month - 1) / 3) * 3 + 1, 1)!);
  }
  if (interval === "monthly") return toISODate(utcDate(year, month, 1)!);
  if (interval === "weekly") {
    const mondayOffset = (value.getUTCDay() + 6) % 7;
    return toISODate(addDays(value, -mondayOffset));
  }
  return reportDate;
}

export function resolveReportingPeriod({
  kind,
  timeFilter,
  reportDates,
  fiscalYearEnd,
  interval,
}: {
  kind: StatementKind;
  timeFilter: string;
  reportDates: readonly string[];
  fiscalYearEnd?: FiscalYearEnd;
  interval?: ChartInterval;
}): StatementReportingPeriod {
  const selection = timeFilter.trim();
  const explicit = parseConcreteTimeFilter(
    selection,
    fiscalYearEnd ?? DEFAULT_FISCAL_YEAR_END,
  );
  const validDates = validReportDates(reportDates);
  const earliestDate = validDates.at(0) ?? null;
  const latestDate = validDates.at(-1) ?? null;

  if (kind === "balance_sheet") {
    return {
      startDate: null,
      endDate: null,
      asOfDate: explicit?.endDate ?? latestDate,
      isExplicit: explicit !== null,
      selection,
    };
  }

  const inferredStartDate =
    explicit === null &&
    earliestDate !== null &&
    validDates.length < MAX_RETURNED_INTERVALS
      ? intervalStart(earliestDate, interval)
      : null;

  return {
    startDate: explicit?.startDate ?? inferredStartDate,
    endDate: explicit?.endDate ?? latestDate,
    asOfDate: null,
    isExplicit: explicit !== null,
    selection,
  };
}
