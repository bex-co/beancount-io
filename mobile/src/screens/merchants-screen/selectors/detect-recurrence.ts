/**
 * Pure recurrence detector: a per-payee series of (date, currency, amount) →
 * a cadence verdict, or null when the series is too short or too irregular.
 *
 * "Today" is an explicit parameter — never read the clock here — so tests can
 * pin the overdue boundary without flaking. Free of `@/` value imports so the
 * jest-lite runner can require it.
 */
import { utcDate, utcTime } from "../../../common/calendar-date";

export type Cadence =
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

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
  /**
   * The currency the bill is usually paid in: the one with the most charges, the
   * latest charge's on a tie. A single charge abroad (¥980 against a monthly
   * $10.99) is in the amounts above but is not what the bill costs (w21/615).
   */
  primaryCurrency: string;
  /** True when any currency's amount spread exceeds ~10% of its median. */
  isApproximate: boolean;
  /**
   * The next event as `YYYY-MM-DD`: for a bill kept on one day of the month,
   * that day in the next period's month; otherwise last event + median gap.
   */
  nextExpected: string;
  /**
   * True when `today` is past `nextExpected` by more than the grace window, but
   * not yet by `LAPSE_PERIODS` periods: a missed bill, not a stopped one.
   */
  isOverdue: boolean;
  /**
   * True once `today` is `LAPSE_PERIODS` periods past `nextExpected` with
   * nothing pre-entered: the series has stopped (a cancelled subscription, or
   * a monthly bill that became one annual payment), so it is no longer
   * "Overdue" (w21/267).
   */
  isLapsed: boolean;
  /** The latest payment made, `YYYY-MM-DD`. */
  lastPaid: string;
  /**
   * The earliest pre-entered event after today, `YYYY-MM-DD`. It is the
   * upcoming occurrence, not a payment made: counted as paid, a pre-entered
   * rent cheque hid the missed month before it (w21/167).
   */
  scheduled?: string;
}

/** Whether two amounts differ by no more than float round-off. */
function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Minimum distinct event dates before a cadence can be inferred. */
const MIN_EVENT_DATES = 3;

/** Accept a median gap only when MAD/median stays under this. */
const MAX_GAP_DISPERSION = 0.25;

/** Flag typical amount as approximate when (max−min)/|median| exceeds this. */
const APPROXIMATE_AMOUNT_SPREAD = 0.1;

/** How many of the latest charges say what a bill costs now. */
const RECENT_CHARGES = 3;

/** Overdue grace as a fraction of the median gap. */
const OVERDUE_GRACE_FRACTION = 0.25;

/** Periods past the expected date after which a series counts as stopped. */
const LAPSE_PERIODS = 3;

/**
 * ...but never more than this many days: three periods of a six-monthly bill
 * is eighteen months, and a cancelled one stayed red above the live bills
 * until then (w21/409). A quarter and a half-year lapse after about four
 * months; weekly to bimonthly bills are as before.
 */
const MAX_LAPSE_DAYS = 120;

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
  // Every two months (59–62 days) and every six (181–184): water and
  // utility bills, car insurance (w21/269).
  { cadence: "bimonthly", min: 56, max: 66 },
  { cadence: "quarterly", min: 84, max: 98 },
  { cadence: "semiannual", min: 175, max: 190 },
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
  const ms = utcTime(year, month - 1, day);
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
  // Four digits, as a ledger writes 0050 (w21/043).
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar months a monthly-or-longer bill advances by. */
const CADENCE_MONTHS: Partial<Record<Cadence, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

type CalendarDay = { year: number; month: number; day: number };

function calendarDay(dayNumber: number): CalendarDay {
  const date = new Date(dayNumber * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month + 1, 0).getUTCDate();
}

/** `months` calendar months after `dayNumber`, on day `anchor` clamped to the month. */
function addMonthsClamped(
  dayNumber: number,
  months: number,
  anchor = calendarDay(dayNumber).day,
): number {
  const { year, month } = calendarDay(dayNumber);
  const target = utcDate(year, month + months, 1);
  const lastDay = daysInMonth(target.getUTCFullYear(), target.getUTCMonth());
  return (
    Math.floor(target.getTime() / MS_PER_DAY) + Math.min(anchor, lastDay) - 1
  );
}

/**
 * How many events each day of the month could be the anchor of. An event on its
 * month's last day also counts for any later anchor: a bill due on the 31st is
 * paid on the 30th in a 30-day month and the 28th in February, so counting the
 * days as they fell made the 30th win a quarter-end series and Next came a day
 * early (w21/529).
 */
function anchorCounts(days: readonly CalendarDay[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of days) counts.set(d.day, (counts.get(d.day) ?? 0) + 1);
  const lastDays = days.filter((d) => d.day === daysInMonth(d.year, d.month));
  for (const anchor of [...counts.keys()]) {
    for (const d of lastDays) {
      if (d.day < anchor) counts.set(anchor, counts.get(anchor)! + 1);
    }
  }
  return counts;
}

/** How far a payment may sit from its due day and still be that month's. */
const ANCHOR_TOLERANCE_DAYS = 3;

/**
 * The day of the month a series is kept on, or null when it is not: the day
 * most events fall on (at least two, and half of them), with every event within
 * `ANCHOR_TOLERANCE_DAYS` of that day in its own month (clamped at a short
 * month's end, so a 31st bill paid on 30 Jun still counts) and each is
 * `months` after the one before. A payment shifted to the weekend, or to the
 * month's last day for a bill due on the 1st, is still that month's, so one of
 * them no longer drops the anchor (w21/271). Every-four-weeks payments share
 * the monthly gap band but drift through the month, so they keep the day-count
 * step (w21/007). `lastDue` is the last event's due date, which is where the
 * next period counts from.
 */
function monthDayAnchor(
  eventDays: readonly number[],
  months: number,
): { anchor: number; lastDue: number } | null {
  // Two or more gaps that are all about four weeks are not a month's: February
  // is the only month that short, so it can be one gap of a monthly bill, never
  // several. A four-weekly series that spans February puts two payments on the
  // same day (02-02, 03-02) and read as "the 2nd", which made Next come five days
  // late (w21/408).
  if (months === 1 && eventDays.length >= 3) {
    const gaps = eventDays.slice(1).map((day, i) => day - eventDays[i]!);
    if (gaps.every((gap) => gap >= 27 && gap <= 29)) return null;
  }
  const days = eventDays.map(calendarDay);
  const counts = anchorCounts(days);
  let anchor = 0;
  let best = 0;
  for (const [day, count] of counts) {
    if (count > best || (count === best && day > anchor)) {
      anchor = day;
      best = count;
    }
  }
  if (best < 2 || best * 2 < days.length) return null;

  const dueOn = (monthIndex: number): number => {
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex - year * 12;
    const first = Math.floor(utcDate(year, month, 1).getTime() / MS_PER_DAY);
    return first + Math.min(anchor, daysInMonth(year, month)) - 1;
  };
  let previous: number | null = null;
  let lastDue = 0;
  for (let i = 0; i < days.length; i++) {
    const d = days[i]!;
    const own = d.year * 12 + d.month;
    // Its own month's due day, or a neighbour's when paid across the boundary.
    let nominal = own;
    let distance = Infinity;
    for (const candidate of [own, own - 1, own + 1]) {
      const gap = Math.abs(eventDays[i]! - dueOn(candidate));
      if (gap < distance) {
        distance = gap;
        nominal = candidate;
      }
    }
    if (distance > ANCHOR_TOLERANCE_DAYS) return null;
    // The next period or, after a paused or combined one, a later whole number
    // of them; two payments in one period still end the anchor (w21/459).
    if (previous !== null) {
      const step = nominal - previous;
      if (step <= 0 || step % months !== 0) return null;
    }
    previous = nominal;
    lastDue = dueOn(nominal);
  }
  return { anchor, lastDue };
}

/** The least distance between a semi-monthly bill's two days. */
const SEMIMONTHLY_MIN_SPREAD = 10;

/** The days a semi-monthly series is due on, and the occurrence it last paid. */
type SemiMonthly = { first: number; second: number; lastOccurrence: number };

/** The day number a semi-monthly bill is due for one occurrence. */
function semiMonthlyDueDay(occurrence: number, days: SemiMonthly): number {
  const month = Math.floor(occurrence / 2);
  const year = Math.floor(month / 12);
  const monthOfYear = month - year * 12;
  const anchor = occurrence % 2 === 0 ? days.first : days.second;
  const first = Math.floor(
    utcDate(year, monthOfYear, 1).getTime() / MS_PER_DAY,
  );
  return first + Math.min(anchor, daysInMonth(year, monthOfYear)) - 1;
}

/**
 * The two days of the month a series alternates between (the 1st and 15th,
 * or the 15th and the last day, clamped at a short month's end), or null.
 * Their gaps run 14, 16, 17 days, so the median read biweekly and Next came
 * two to three days early every cycle (w21/170).
 *
 * The days are the most common one and the most common one at least
 * `SEMIMONTHLY_MIN_SPREAD` away from it, and each payment may sit within
 * `ANCHOR_TOLERANCE_DAYS` of its due day, in its own month or the one beside it
 * (a payment moved off a weekend, or paid on the 31st for the 1st), and one
 * occurrence may be missing: a single early, late or skipped payment kept
 * turning "Twice a month" into "Every 2 weeks" (w21/458). Occurrences are the
 * 1st, 2nd, … due day counted from the first month, and each payment is the
 * next one or, once, the one after.
 */
function semiMonthlyDays(eventDays: readonly number[]): SemiMonthly | null {
  if (eventDays.length < 4) return null;
  const days = eventDays.map(calendarDay);
  const counts = anchorCounts(days);
  const modal = (candidates: Iterable<[number, number]>): number | null => {
    let best: [number, number] | null = null;
    for (const [day, count] of candidates) {
      if (!best || count > best[1] || (count === best[1] && day > best[0])) {
        best = [day, count];
      }
    }
    return best === null ? null : best[0];
  };
  const one = modal(counts);
  // One of the two days must be a day the bill really keeps: it repeats, and
  // is a third of the payments. Otherwise a 14-day series, whose days walk
  // through the month, fits two anchors by chance for a few payments.
  if (one === null) return null;
  const keptCount = counts.get(one) ?? 0;
  if (keptCount < 2 || keptCount * 3 < days.length) return null;
  const other = modal(
    [...counts].filter(
      ([day]) => Math.abs(day - one) >= SEMIMONTHLY_MIN_SPREAD,
    ),
  );
  if (other === null) return null;
  const found: SemiMonthly = {
    first: Math.min(one, other),
    second: Math.max(one, other),
    lastOccurrence: 0,
  };

  let previous: number | null = null;
  let missing = 0;
  for (let i = 0; i < days.length; i++) {
    const d = days[i]!;
    const own = d.year * 12 + d.month;
    // The due day nearest this payment, in its month or a neighbour's.
    let occurrence = -1;
    let distance = Infinity;
    for (const month of [own, own - 1, own + 1]) {
      for (const slot of [0, 1]) {
        const candidate = month * 2 + slot;
        const gap = Math.abs(
          eventDays[i]! - semiMonthlyDueDay(candidate, found),
        );
        if (gap < distance) {
          distance = gap;
          occurrence = candidate;
        }
      }
    }
    if (distance > ANCHOR_TOLERANCE_DAYS) return null;
    if (previous !== null) {
      const step = occurrence - previous;
      if (step < 1 || step > 2) return null;
      missing += step - 1;
      if (missing > 1) return null;
    }
    previous = occurrence;
  }
  found.lastOccurrence = previous ?? 0;
  return found;
}

/** The semi-monthly due day after the occurrence last paid. */
function nextSemiMonthlyDay(days: SemiMonthly): number {
  return semiMonthlyDueDay(days.lastOccurrence + 1, days);
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
 * Whether `series` has enough distinct, valid event dates for a cadence to be
 * inferred at all. A null `detectRecurrence` means "too short" when this is
 * false and "analysed, no steady pattern" when it is true; a manual Recurring
 * mark reads the difference (w0/039).
 */
export function hasEnoughHistory(
  series: readonly SeriesPoint[],
  today?: string,
): boolean {
  // Only what has happened counts, as in `detectRecurrence`: a pre-entered
  // payment is the next event, not history (w21/335). Without `today` nothing
  // is future.
  const todayDay = today === undefined ? null : parseLedgerDay(today);
  const days = new Set<number>();
  for (const point of withoutCounterSign(series)) {
    const day = parseLedgerDay(point.date);
    if (day === null || !Number.isFinite(point.amount)) continue;
    if (todayDay !== null && day > todayDay) continue;
    days.add(day);
  }
  return days.size >= MIN_EVENT_DATES;
}

/**
 * The points with the payee's main sign. A refund or reversal on a bill is the
 * opposite sign to its charges, and counted as an event it moved Next to the
 * refund's day, made the amount "~", and could push a short history under the
 * three events detection needs (w21/268). The main sign is the one most points
 * carry, the larger total when they tie; zero amounts stay.
 */
function withoutCounterSign(series: readonly SeriesPoint[]): SeriesPoint[] {
  let positive = 0;
  let negative = 0;
  let positiveSum = 0;
  let negativeSum = 0;
  for (const point of series) {
    if (point.amount > 0) {
      positive += 1;
      positiveSum += point.amount;
    } else if (point.amount < 0) {
      negative += 1;
      negativeSum -= point.amount;
    }
  }
  if (positive === 0 || negative === 0) {
    return [...series];
  }
  const keepPositive =
    positive !== negative ? positive > negative : positiveSum >= negativeSum;
  return series.filter((point) =>
    keepPositive ? point.amount >= 0 : point.amount <= 0,
  );
}

/**
 * Detect a steady cadence in `series`.
 *
 * Same-day duplicates collapse for gap math (a 0-day gap must not poison the
 * median) but still contribute to per-currency amount medians. Returns null
 * for short, unclassifiable, or high-dispersion series.
 */
export function detectRecurrence(
  allPoints: readonly SeriesPoint[],
  today: string,
): RecurrenceVerdict | null {
  const series = withoutCounterSign(allPoints);
  if (series.length < MIN_EVENT_DATES) {
    return null;
  }

  const todayDay = parseLedgerDay(today);
  if (todayDay === null) {
    return null;
  }

  // Only what has happened says how often it happens, when it last did, and
  // whether it is late; a pre-entered future event is the next one (w21/167).
  const byDay = new Map<number, SeriesPoint[]>();
  let scheduledDay: number | null = null;
  for (const point of series) {
    const day = parseLedgerDay(point.date);
    if (day === null || !Number.isFinite(point.amount)) {
      continue;
    }
    if (day > todayDay) {
      if (scheduledDay === null || day < scheduledDay) scheduledDay = day;
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

  // Two stable days a month is its own cadence, not a biweekly one. Gaps of
  // exactly 14 days throughout are biweekly: February is 28 days, so a short
  // biweekly series spanning it shares a day of the month between two payments
  // and fit two monthly anchors by chance (w21/530).
  const steadyBiweekly = gaps.length >= 3 && gaps.every((gap) => gap === 14);
  const semiMonthly = steadyBiweekly ? null : semiMonthlyDays(eventDays);
  if (!semiMonthly) {
    const dispersion = mad(gaps, medianGap) / medianGap;
    if (dispersion >= MAX_GAP_DISPERSION) {
      return null;
    }
  }

  const cadence = semiMonthly ? "semimonthly" : classifyCadence(medianGap);
  if (!cadence) {
    return null;
  }

  // In date order, so the latest charges can be told from the old ones.
  const amountsByCurrency = new Map<string, number[]>();
  const chargeCurrencies: string[] = [];
  let latestCurrency = "";
  for (const day of eventDays) {
    for (const point of byDay.get(day)!) {
      const currency = point.currency.trim();
      if (!currency) {
        continue;
      }
      latestCurrency = currency;
      chargeCurrencies.push(currency);
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

  // The currency the latest charges agree on is the one the bill is paid in
  // now: counted over the window, rent paid in yen until a move read
  // "¥120,000" months after it was $2,000 (w21/797). One charge abroad among
  // them is no move, and the most charges decide (w21/615).
  const recentCurrencies = chargeCurrencies.slice(-RECENT_CHARGES);
  const settledCurrency =
    recentCurrencies.length === RECENT_CHARGES &&
    recentCurrencies.every((currency) => currency === recentCurrencies[0])
      ? recentCurrencies[0]!
      : null;
  const typicalAmountByCurrency: Record<string, number> = {};
  // Per currency: the row shows the main one's amount, and yen charges that
  // varied put a "~" before a steady $10.99 (w21/798).
  const approximate = new Set<string>();
  let primaryCurrency = settledCurrency ?? latestCurrency;
  let primaryCount = 0;
  for (const [currency, amounts] of amountsByCurrency) {
    if (
      settledCurrency === null &&
      (amounts.length > primaryCount ||
        (amounts.length === primaryCount && currency === latestCurrency))
    ) {
      primaryCurrency = currency;
      primaryCount = amounts.length;
    }
    // Steady latest charges are what it costs now: over the whole window the
    // old price held until half the history was at the new one, so a rise
    // read as last year's price, without the "~" (w21/171). A bill that
    // varies keeps its long-run median.
    const overall = median(amounts);
    if (overall === null) {
      continue;
    }
    const recent = amounts.slice(-RECENT_CHARGES);
    const latest = median(recent);
    // Compared with a tolerance: 7 months at 11.87 and 3 charges of 10.99 +
    // 0.88 sum to 11.870000000000001, and an exact compare read an unchanged
    // price as "~" (w21/336).
    const changed =
      latest !== null &&
      !sameAmount(latest, overall) &&
      !amountSpreadIsApproximate(recent);
    typicalAmountByCurrency[currency] = changed ? latest : overall;
    if (changed || amountSpreadIsApproximate(amounts)) {
      approximate.add(currency);
    }
  }
  const isApproximate = approximate.has(primaryCurrency);

  if (Object.keys(typicalAmountByCurrency).length === 0) {
    return null;
  }

  const gapDays = Math.round(medianGap);
  const lastDay = eventDays[eventDays.length - 1]!;
  // A bill kept on one day of the month is due that day: the median of
  // 28–31-day gaps rounds to 31 and used to land one to three days late.
  const months = CADENCE_MONTHS[cadence];
  const kept = months === undefined ? null : monthDayAnchor(eventDays, months);
  const nextExpectedDay = semiMonthly
    ? nextSemiMonthlyDay(semiMonthly)
    : months !== undefined && kept !== null
      ? addMonthsClamped(kept.lastDue, months, kept.anchor)
      : lastDay + gapDays;
  const graceDays = Math.max(1, Math.round(gapDays * OVERDUE_GRACE_FRACTION));
  const isLate = todayDay > nextExpectedDay + graceDays;
  // A pre-entered payment means the bill is still live.
  const isLapsed =
    isLate &&
    scheduledDay === null &&
    todayDay >
      nextExpectedDay + Math.min(LAPSE_PERIODS * gapDays, MAX_LAPSE_DAYS);
  const isOverdue = isLate && !isLapsed;

  return {
    cadence,
    typicalAmountByCurrency,
    primaryCurrency,
    isApproximate,
    nextExpected: formatLedgerDay(nextExpectedDay),
    isOverdue,
    isLapsed,
    lastPaid: formatLedgerDay(lastDay),
    ...(scheduledDay === null
      ? {}
      : { scheduled: formatLedgerDay(scheduledDay) }),
  };
}
