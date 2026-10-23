import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import type {
  BudgetEntry,
  BudgetGroup,
  BudgetHistoryEntry,
  BudgetValue,
} from "./types";

interface ParsedBudgetAmount {
  value: number;
  currency: string;
}

interface BudgetFields extends ParsedBudgetAmount {
  account: string;
  interval: string;
  amount: string;
}

export function parseBudgetAmount(amount: string): ParsedBudgetAmount {
  const [number = "0", currency = ""] = amount.trim().split(/\s+/);
  const value = Number.parseFloat(number);
  return { value: Number.isNaN(value) ? 0 : value, currency };
}

/**
 * The direction of a budget, from its history rather than from the amount in
 * effect today: `-1` for an income target (written as a negative amount), `1`
 * for an expense cap. Zeroing an income target (Delete rewrites history, so
 * "0" is the natural way to stop tracking one) stores a sign-less "0", and the
 * chart then ran on expense rules: income drawn as negative bars and a missed
 * month on the favourable side (w21/475, as mobile's `groupDirection`). The
 * newest entry that has a sign decides; a budget that was only ever zero is an
 * expense cap.
 */
export function budgetGroupDirection(
  group: Pick<BudgetGroup, "amount" | "budgetHistory">,
): 1 | -1 {
  for (let i = group.budgetHistory.length - 1; i >= 0; i -= 1) {
    const { value } = parseBudgetAmount(group.budgetHistory[i]!.amount);
    if (value !== 0) return value < 0 ? -1 : 1;
  }
  return parseBudgetAmount(group.amount).value < 0 ? -1 : 1;
}

function getBudgetFields(entry: BudgetEntry): BudgetFields | null {
  const account = typeof entry.values[0] === "string" ? entry.values[0] : "";
  const interval = typeof entry.values[1] === "string" ? entry.values[1] : "";
  const amountRaw = entry.values[2];

  if (
    !account ||
    !interval ||
    !amountRaw ||
    typeof amountRaw !== "object" ||
    !("number" in amountRaw)
  ) {
    return null;
  }

  const value = Number.parseFloat(String((amountRaw as BudgetValue).number));
  const currency = String((amountRaw as BudgetValue).currency ?? "");
  if (Number.isNaN(value) || !currency) return null;

  return {
    account,
    interval,
    value,
    currency,
    amount: `${(amountRaw as BudgetValue).number} ${currency}`,
  };
}

/**
 * Fava keeps one budget history per account and currency. A newer directive
 * replaces the previous directive for that pair, even when its cadence changes.
 *
 * `entries` arrive as the journal returns them, newest first. Reversing them
 * before the stable date sort keeps two directives on the same date in
 * ledger order, so the later one is the current target (w4/232).
 */
export function groupBudgetEntries(
  entries: BudgetEntry[],
  activeDate = format(new Date(), "yyyy-MM-dd"),
): BudgetGroup[] {
  const groups = new Map<
    string,
    Array<{ entry: BudgetEntry; fields: BudgetFields }>
  >();

  for (const entry of [...entries].reverse()) {
    const fields = getBudgetFields(entry);
    if (!fields) continue;
    const key = `${fields.account}::${fields.currency}`;
    const group = groups.get(key) ?? [];
    group.push({ entry, fields });
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((groupEntries) => {
      const sorted = [...groupEntries].sort((a, b) =>
        a.entry.date.localeCompare(b.entry.date),
      );
      const current =
        [...sorted].reverse().find(({ entry }) => entry.date <= activeDate) ??
        sorted[0];

      return {
        account: current.fields.account,
        interval: current.fields.interval,
        currency: current.fields.currency,
        amount: current.fields.amount,
        entry_hash: current.entry.entry_hash,
        budgetHistory: sorted.map(({ entry, fields }) => ({
          date: entry.date,
          interval: fields.interval,
          amount: fields.amount,
          entry_hash: entry.entry_hash,
        })),
      };
    })
    .sort(
      (a, b) =>
        a.account.localeCompare(b.account) ||
        a.currency.localeCompare(b.currency),
    );
}

function normalizeInterval(interval: string): string {
  const normalized = interval.toLowerCase();
  return normalized === "daily" ? "day" : normalized.replace(/ly$/, "");
}

function getIntervalStart(date: Date, interval: string): Date {
  switch (normalizeInterval(interval)) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "quarter":
      return startOfQuarter(date);
    case "year":
      return startOfYear(date);
    default:
      return startOfMonth(date);
  }
}

function getNextIntervalStart(date: Date, interval: string): Date {
  switch (normalizeInterval(interval)) {
    case "day":
      return addDays(getIntervalStart(date, interval), 1);
    case "week":
      return addWeeks(getIntervalStart(date, interval), 1);
    case "quarter":
      return addQuarters(getIntervalStart(date, interval), 1);
    case "year":
      return addYears(getIntervalStart(date, interval), 1);
    default:
      return addMonths(getIntervalStart(date, interval), 1);
  }
}

function getDaysInBudgetPeriod(date: Date, interval: string): number {
  return differenceInCalendarDays(
    getNextIntervalStart(date, interval),
    getIntervalStart(date, interval),
  );
}

/**
 * Convert the active directives to the chart's interval. This mirrors Fava's
 * daily-equivalent calculation and correctly handles changes mid-period.
 */
export function calculateBudgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  history: BudgetHistoryEntry[],
): number {
  const end = parseISO(intervalEnd);
  const start = getIntervalStart(end, chartInterval);
  const ordered = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, ...parseBudgetAmount(entry.amount) }));

  let activeIndex = -1;
  let total = 0;

  for (let day = start; day <= end; day = addDays(day, 1)) {
    const date = format(day, "yyyy-MM-dd");
    while (
      activeIndex + 1 < ordered.length &&
      ordered[activeIndex + 1].date <= date
    ) {
      activeIndex += 1;
    }

    const active = ordered[activeIndex];
    if (!active) continue;
    total += active.value / getDaysInBudgetPeriod(day, active.interval);
  }

  return total;
}

/**
 * The period a Budget card's headline describes, as its inclusive end date and
 * the index of the interval-totals bucket that covers it (`null` when no
 * bucket does, i.e. nothing was posted in it).
 *
 * A span still running ("This year", "All time", a rolling year) headlines
 * the whole interval containing `today`: never a bucket that starts later,
 * and never a window edge that clips the period and so prorates its target.
 * A span that has ended ("Last year") headlines its final bucket.
 */
export function budgetHeadlinePeriod(
  bucketEnds: string[],
  interval: string,
  today: string,
  spanEnded: boolean,
): { end: string; bucket: number | null } | null {
  if (spanEnded) {
    if (bucketEnds.length === 0) return null;
    return {
      end: bucketEnds[bucketEnds.length - 1],
      bucket: bucketEnds.length - 1,
    };
  }
  const day = parseISO(today);
  const end = format(
    addDays(getNextIntervalStart(day, interval), -1),
    "yyyy-MM-dd",
  );
  const bucket = bucketEnds.findIndex(
    (bucketEnd) =>
      bucketEnd >= today &&
      format(getIntervalStart(parseISO(bucketEnd), interval), "yyyy-MM-dd") <=
        today,
  );
  return { end, bucket: bucket === -1 ? null : bucket };
}

/**
 * The longest period the chart prorates over, in days. One leap year plus
 * slack — the tolerance below allows one unit in the last place per day
 * summed, and this bounds that day count.
 */
const MAX_PRORATION_DAYS = 512;

/**
 * Actual minus target, with the proration's own round-off treated as zero.
 *
 * `calculateBudgetForInterval` adds one floating-point daily fraction per day,
 * so an exactly met budget lands a few units in the last place away from the
 * actual: 1650/28 summed over February is 1649.999999999999, and 1650/31
 * summed over January is 1650.0000000000005. Comparing those strictly made the
 * same exactly met 1650 USD target read "Above target +0" in one month and
 * "Below target -0" in the next.
 *
 * The tolerance scales with the numbers being compared and allows one ulp for
 * each day summed, so it absorbs that accumulation. At large amounts that
 * scale reaches whole units — 3.875 at a 3.4e13 USD target — so with the
 * card's `displayDigits` a difference that shows as nonzero at that precision
 * (half a unit or more) is never flattened to "On target" (w4/978).
 */
export function budgetVariance(
  actual: number,
  budget: number,
  displayDigits?: number,
): number {
  const difference = actual - budget;
  const roundOff =
    Math.max(Math.abs(actual), Math.abs(budget), 1) *
    Number.EPSILON *
    MAX_PRORATION_DAYS;
  const visible =
    displayDigits !== undefined &&
    Math.abs(difference) >= 0.5 * 10 ** -displayDigits;
  return !visible && Math.abs(difference) <= roundOff ? 0 : difference;
}

/**
 * Read a currency amount from a sparse interval inventory.
 * Ledger serialization omits zero currencies, so a missing key on a returned
 * interval means 0 — distinct from an empty series (handled by the caller).
 * Malformed values stay null so the UI does not invent a number.
 */
export function readSparseBalanceAmount(
  balance: Record<string, unknown>,
  currency: string,
  direction = 1,
): number | null {
  const value = balance[currency];
  if (value === null || value === undefined) return 0;
  const number = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isNaN(number) ? null : number * direction;
}
