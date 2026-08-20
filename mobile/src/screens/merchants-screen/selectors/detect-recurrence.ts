/**
 * Pure recurrence detector: a per-payee series of (date, currency, amount) →
 * a cadence verdict, or null when the series is too short or too irregular.
 *
 * "Today" is an explicit parameter — never read the clock here — so tests can
 * pin the overdue boundary without flaking. Free of `@/` value imports so the
 * jest-lite runner can require it.
 */

export type Cadence =
  "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

/** One posting event feeding detection. Dates are ledger `YYYY-MM-DD`. */
export interface SeriesPoint {
  date: string;
  currency: string;
  amount: number;
}

export interface RecurrenceVerdict {
  cadence: Cadence;
  /** Median amount per currency (signed as in the series). */
  typicalAmountByCurrency: Record<string, number>;
  /** True when any currency's amount spread exceeds ~10% of its median. */
  isApproximate: boolean;
  /** Last event date + median gap, as `YYYY-MM-DD`. */
  nextExpected: string;
  /** True when `today` is past `nextExpected` by more than the grace window. */
  isOverdue: boolean;
}

/** Minimum distinct event dates before a cadence can be inferred. */
export const MIN_EVENT_DATES = 3;

/** Accept a median gap only when MAD/median stays under this. */
export const MAX_GAP_DISPERSION = 0.25;

/** Flag typical amount as approximate when (max−min)/|median| exceeds this. */
export const APPROXIMATE_AMOUNT_SPREAD = 0.1;

/** Overdue grace as a fraction of the median gap. */
export const OVERDUE_GRACE_FRACTION = 0.25;

const MS_PER_DAY = 86_400_000;

/**
 * Cadence bands in whole days. Monthly covers month-length wobble (27–32);
 * every-4-weeks lands in the same band as monthly by design.
 */
const CADENCE_BANDS: ReadonlyArray<{
  cadence: Cadence;
  min: number;
  max: number;
}> = [
  { cadence: "weekly", min: 6, max: 8 },
  { cadence: "biweekly", min: 13, max: 16 },
  { cadence: "monthly", min: 27, max: 32 },
  { cadence: "quarterly", min: 84, max: 98 },
  { cadence: "yearly", min: 350, max: 380 },
];

/**
 * Parse a ledger date as a timezone-free day number (UTC midnight epoch days).
 * Invalid or non-`YYYY-MM-DD` strings return null — never throw.
 */
export function parseLedgerDay(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(ms)) {
    return null;
  }
  const probe = new Date(ms);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(ms / MS_PER_DAY);
}

/** Format an epoch-day number back to `YYYY-MM-DD` (UTC). */
export function formatLedgerDay(dayNumber: number): string {
  const ms = dayNumber * MS_PER_DAY;
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortedCopy(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/** Median of a non-empty numeric list. Even length → mean of the two middle. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = sortedCopy(values);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/** Median absolute deviation from `center`. */
function mad(values: readonly number[], center: number): number {
  return median(values.map((value) => Math.abs(value - center))) ?? 0;
}

function classifyCadence(medianGap: number): Cadence | null {
  for (const band of CADENCE_BANDS) {
    if (medianGap >= band.min && medianGap <= band.max) {
      return band.cadence;
    }
  }
  return null;
}

function amountSpreadIsApproximate(amounts: readonly number[]): boolean {
  if (amounts.length === 0) {
    return false;
  }
  const med = median(amounts);
  if (med === null) {
    return false;
  }
  const sorted = sortedCopy(amounts);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const spread = max - min;
  if (spread === 0) {
    return false;
  }
  const scale = Math.abs(med);
  if (scale === 0) {
    return true;
  }
  return spread / scale > APPROXIMATE_AMOUNT_SPREAD;
}

/**
 * Detect a steady cadence in `series`.
 *
 * Same-day duplicates collapse for gap math (a 0-day gap must not poison the
 * median) but still contribute to per-currency amount medians. Returns null
 * for short, unclassifiable, or high-dispersion series.
 */
export function detectRecurrence(
  series: readonly SeriesPoint[],
  today: string,
): RecurrenceVerdict | null {
  if (series.length < MIN_EVENT_DATES) {
    return null;
  }

  const todayDay = parseLedgerDay(today);
  if (todayDay === null) {
    return null;
  }

  const byDay = new Map<number, SeriesPoint[]>();
  for (const point of series) {
    const day = parseLedgerDay(point.date);
    if (day === null || !Number.isFinite(point.amount)) {
      continue;
    }
    const bucket = byDay.get(day);
    if (bucket) {
      bucket.push(point);
    } else {
      byDay.set(day, [point]);
    }
  }

  const eventDays = [...byDay.keys()].sort((a, b) => a - b);
  if (eventDays.length < MIN_EVENT_DATES) {
    return null;
  }

  const gaps: number[] = [];
  for (let i = 1; i < eventDays.length; i++) {
    gaps.push(eventDays[i]! - eventDays[i - 1]!);
  }

  const medianGap = median(gaps);
  if (medianGap === null || medianGap <= 0) {
    return null;
  }

  const dispersion = mad(gaps, medianGap) / medianGap;
  if (dispersion >= MAX_GAP_DISPERSION) {
    return null;
  }

  const cadence = classifyCadence(medianGap);
  if (!cadence) {
    return null;
  }

  const amountsByCurrency = new Map<string, number[]>();
  for (const points of byDay.values()) {
    for (const point of points) {
      const currency = point.currency.trim();
      if (!currency) {
        continue;
      }
      const list = amountsByCurrency.get(currency);
      if (list) {
        list.push(point.amount);
      } else {
        amountsByCurrency.set(currency, [point.amount]);
      }
    }
  }

  if (amountsByCurrency.size === 0) {
    return null;
  }

  const typicalAmountByCurrency: Record<string, number> = {};
  let isApproximate = false;
  for (const [currency, amounts] of amountsByCurrency) {
    const med = median(amounts);
    if (med === null) {
      continue;
    }
    typicalAmountByCurrency[currency] = med;
    if (amountSpreadIsApproximate(amounts)) {
      isApproximate = true;
    }
  }

  if (Object.keys(typicalAmountByCurrency).length === 0) {
    return null;
  }

  const gapDays = Math.round(medianGap);
  const lastDay = eventDays[eventDays.length - 1]!;
  const nextExpectedDay = lastDay + gapDays;
  const graceDays = Math.max(1, Math.round(gapDays * OVERDUE_GRACE_FRACTION));
  const isOverdue = todayDay > nextExpectedDay + graceDays;

  return {
    cadence,
    typicalAmountByCurrency,
    isApproximate,
    nextExpected: formatLedgerDay(nextExpectedDay),
    isOverdue,
  };
}
