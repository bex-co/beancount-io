import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { inheritDirectiveSourceId } from "./provenance";
import { pluginError, type PluginContext, type PluginResult } from "./types";

/**
 * TypeScript port of the repository's MIT-licensed `fava.plugins.forecast`
 * implementation. `#`-flagged transactions with a recurrence marker are
 * replaced by concrete copies; every other directive passes through.
 *
 * This intentionally does not delegate to rustledger 0.21's native forecast
 * plugin. Its month-end handling, REPEAT/UNTIL precedence, invalid-date
 * behavior, and zero-count grammar differ from the Fava contract used by
 * existing ledgers.
 */

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;
type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

interface Recurrence {
  narration: string;
  frequency: Frequency;
  interval: number;
  count?: number;
  until?: string;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface CandidateDate {
  /** The concrete occurrence, absent when e.g. February has no 31st. */
  date?: string;
  /** First day of the candidate period, used to stop bounded recurrences. */
  periodStart: string;
}

interface GeneratedDirective {
  directive: Transaction;
  sourceOrder: number;
}

const FORECAST_FLAG = "#";

// Greedy narration capture selects the final compatible marker, matching
// Python's `re.search` with `(?P<narration>^.*)`. The expression deliberately
// is not end-anchored: text after the marker is discarded by the old plugin.
const MARKER_RE =
  /^(.*)\[(DAILY|WEEKLY|MONTHLY|YEARLY)(?:\s+SKIP\s+([1-9]\d*)\s+TIMES?)?(?:\s+REPEAT\s+([1-9]\d*)\s+TIMES?)?(?:\s+UNTIL\s+([\d-]+))?\]/u;

/** Absolute expansion ceiling, sized for roughly a century of daily entries. */
export const MAX_FORECAST_OCCURRENCES = 40_000;

/**
 * Frequency-aware bounds keep ordinary long-lived DAILY/WEEKLY templates valid
 * without granting MONTHLY/YEARLY recurrences an unnecessarily large output
 * budget. The old Python plugin was unbounded; a template above these limits
 * fails closed instead of silently returning incomplete books.
 */
const OCCURRENCE_LIMITS: Record<Frequency, number> = {
  DAILY: MAX_FORECAST_OCCURRENCES,
  WEEKLY: 10_000,
  MONTHLY: 1_200,
  YEARLY: 1_200,
};

export function forecast(
  directives: DirectiveJson[],
  _options: LedgerOptions,
  ctx: PluginContext,
): PluginResult {
  const regular: DirectiveJson[] = [];
  const generated: GeneratedDirective[] = [];
  const errors: PluginResult["errors"] = [];

  directives.forEach((directive, sourceOrder) => {
    if (directive.type !== "transaction" || directive.flag !== FORECAST_FLAG) {
      regular.push(directive);
      return;
    }

    try {
      const recurrence = parseMarker(directive.narration ?? "", ctx.today);
      if (recurrence === undefined) {
        // Markerless `#` entries belong to the generated section in the Python
        // plugin, after every regular directive.
        generated.push({ directive, sourceOrder });
        return;
      }

      for (const date of occurrenceDates(directive.date, recurrence)) {
        const occurrence: Transaction = {
          ...directive,
          date,
          narration: recurrence.narration,
        };
        inheritDirectiveSourceId(directive, occurrence);
        generated.push({ directive: occurrence, sourceOrder });
      }
    } catch (error) {
      // Isolate malformed/unbounded templates. One bad recurrence must not roll
      // back all successfully expanded forecast transactions. Keep the failed
      // template in the stream so the books stay balanced and surface a ledger
      // error that closes report validity until the user fixes that template.
      generated.push({ directive, sourceOrder });
      errors.push(
        pluginError(
          `Forecast template was not expanded: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { code: "TS_FORECAST_TEMPLATE_FAILED" },
        ),
      );
    }
  });

  // Fava sorts the generated section with `data.entry_sortkey`. Every item in
  // this section is a Transaction, so the observable key reduces to date then
  // original source order (Python's sort is stable for equal keys).
  generated.sort((left, right) => {
    const dateOrder = left.directive.date.localeCompare(right.directive.date);
    return dateOrder !== 0 ? dateOrder : left.sourceOrder - right.sourceOrder;
  });

  return {
    directives: [...regular, ...generated.map((item) => item.directive)],
    errors,
  };
}

function parseMarker(narration: string, today: string): Recurrence | undefined {
  const match = MARKER_RE.exec(narration);
  if (match === null) return undefined;

  const frequency = match[2] as Frequency;
  const occurrenceLimit = OCCURRENCE_LIMITS[frequency];
  const skip = match[3] === undefined ? 0 : parsePositiveInteger(match[3]);
  const count =
    match[4] === undefined ? undefined : parsePositiveInteger(match[4]);
  if (count !== undefined && count > occurrenceLimit) {
    throw new Error(
      `Forecast recurrence requests ${count} occurrences, exceeding the ${frequency} maximum of ${occurrenceLimit}.`,
    );
  }

  let until: string | undefined;
  if (count === undefined) {
    if (match[5] !== undefined) {
      const parsed = parseCalendarDate(match[5]);
      if (parsed === undefined) {
        throw new Error(`Invalid forecast UNTIL date: ${match[5]}`);
      }
      until = formatCalendarDate(parsed);
    } else {
      const parsedToday = parseCalendarDate(today);
      if (parsedToday === undefined) {
        throw new Error(`Invalid forecast evaluation date: ${today}`);
      }
      until = formatCalendarDate({
        year: parsedToday.year,
        month: 12,
        day: 31,
      });
    }
  }

  return {
    narration: match[1].trim(),
    frequency,
    interval: skip + 1,
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until }),
  };
}

function occurrenceDates(start: string, recurrence: Recurrence): string[] {
  const parsedStart = parseCalendarDate(start);
  if (parsedStart === undefined) {
    throw new Error(`Invalid forecast template date: ${start}`);
  }

  const dates: string[] = [];
  const occurrenceLimit = OCCURRENCE_LIMITS[recurrence.frequency];
  const attemptLimit = occurrenceLimit * 5;
  for (let ordinal = 0; ordinal < attemptLimit; ordinal += 1) {
    const candidate = candidateAt(
      parsedStart,
      recurrence.frequency,
      recurrence.interval,
      ordinal,
    );

    if (
      recurrence.until !== undefined &&
      candidate.periodStart > recurrence.until
    ) {
      return dates;
    }
    if (
      candidate.date !== undefined &&
      recurrence.until !== undefined &&
      candidate.date > recurrence.until
    ) {
      return dates;
    }
    if (candidate.date !== undefined) {
      if (dates.length === occurrenceLimit) {
        throw new Error(
          `Forecast recurrence exceeds the ${recurrence.frequency} maximum of ${occurrenceLimit} occurrences.`,
        );
      }
      dates.push(candidate.date);
      if (recurrence.count !== undefined && dates.length === recurrence.count) {
        return dates;
      }
    }
  }

  throw new Error(
    `Forecast recurrence could not complete within ${attemptLimit} calendar periods.`,
  );
}

function candidateAt(
  start: CalendarDate,
  frequency: Frequency,
  interval: number,
  ordinal: number,
): CandidateDate {
  const offset = safeProduct(interval, ordinal);
  if (frequency === "DAILY" || frequency === "WEEKLY") {
    const days = frequency === "WEEKLY" ? safeProduct(offset, 7) : offset;
    const date = addDays(start, days);
    return { date, periodStart: date };
  }

  if (frequency === "MONTHLY") {
    const monthIndex = safeSum(
      safeProduct(start.year, 12),
      start.month - 1,
      offset,
    );
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    assertSupportedYear(year);
    const periodStart = formatCalendarDate({ year, month, day: 1 });
    if (start.day > daysInMonth(year, month)) return { periodStart };
    return {
      date: formatCalendarDate({ year, month, day: start.day }),
      periodStart,
    };
  }

  const year = safeSum(start.year, offset);
  assertSupportedYear(year);
  const periodStart = formatCalendarDate({ year, month: 1, day: 1 });
  if (start.day > daysInMonth(year, start.month)) return { periodStart };
  return {
    date: formatCalendarDate({
      year,
      month: start.month,
      day: start.day,
    }),
    periodStart,
  };
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid forecast recurrence count: ${value}`);
  }
  return parsed;
}

function parseCalendarDate(value: string): CalendarDate | undefined {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(value);
  if (match === null) return undefined;
  const date = {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  };
  if (date.year < 1 || date.year > 9999) return undefined;
  if (date.month < 1 || date.month > 12) return undefined;
  if (date.day < 1 || date.day > daysInMonth(date.year, date.month)) {
    return undefined;
  }
  return date;
}

function formatCalendarDate(date: CalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function addDays(start: CalendarDate, days: number): string {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(start.year, start.month - 1, start.day);
  date.setUTCDate(date.getUTCDate() + days);
  const result = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  assertSupportedYear(result.year);
  return formatCalendarDate(result);
}

function safeProduct(left: number, right: number): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Forecast recurrence exceeds the supported date range.");
  }
  return result;
}

function safeSum(...values: number[]): number {
  const result = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Forecast recurrence exceeds the supported date range.");
  }
  return result;
}

function assertSupportedYear(year: number): void {
  if (!Number.isSafeInteger(year) || year < 1 || year > 9999) {
    throw new Error("Forecast recurrence exceeds the supported date range.");
  }
}
