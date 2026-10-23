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
import {
  type DecimalFraction,
  isPositiveDecimalNumber,
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalFractions,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import type {
  BudgetEntry,
  BudgetGroup,
  BudgetHistoryEntry,
  BudgetValue,
} from "./types";

interface ParsedBudgetAmount {
  /**
   * The ledger's decimal. Budget text and arithmetic use it: a double reads
   * 9007199254740993 as …992 and loses the one-unit variance (w4/m55).
   */
  exact: string;
  currency: string;
}

interface BudgetFields {
  account: string;
  interval: string;
  currency: string;
  amount: string;
}

export function parseBudgetAmount(amount: string): ParsedBudgetAmount {
  const [number = "0", currency = ""] = amount.trim().split(/\s+/);
  const exact = parseDecimalNumber(number) ?? "0";
  return { exact, currency };
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
    const { exact } = parseBudgetAmount(group.budgetHistory[i]!.amount);
    if (exact.startsWith("-")) return -1;
    if (isPositiveDecimalNumber(exact)) return 1;
  }
  return parseBudgetAmount(group.amount).exact.startsWith("-") ? -1 : 1;
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

  const number = parseDecimalNumber(String((amountRaw as BudgetValue).number));
  const currency = String((amountRaw as BudgetValue).currency ?? "");
  if (number === null || !currency) return null;

  return {
    account,
    interval,
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
 *
 * Each day adds its directive's amount over the days in that directive's
 * period. The sum is taken exactly and rounded once to `digits` — the
 * budget's display precision — so an exactly met target compares as met and
 * a share that does not terminate (100 a month over a 7-day week) is rounded
 * the way the card writes it (w4/m55).
 */
export function calculateBudgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  history: BudgetHistoryEntry[],
  digits: number,
): string {
  const end = parseISO(intervalEnd);
  const start = getIntervalStart(end, chartInterval);
  const ordered = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, ...parseBudgetAmount(entry.amount) }));

  // Consecutive days under one directive and period length are one term.
  const terms: DecimalFraction[] = [];
  let activeIndex = -1;
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
    const periodDays = getDaysInBudgetPeriod(day, active.interval);
    const last = terms.at(-1);
    if (last?.value === active.exact && last.denominator === periodDays) {
      last.numerator += 1;
    } else {
      terms.push({
        value: active.exact,
        numerator: 1,
        denominator: periodDays,
      });
    }
  }

  return sumDecimalFractions(terms, digits);
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

/** Actual minus target, exactly. */
export function budgetVariance(actual: string, budget: string): string {
  return sumDecimalNumbers([actual, negateDecimalNumber(budget)]);
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
): string | null {
  const value = balance[currency];
  if (value === null || value === undefined) return "0";
  const exact = parseDecimalNumber(String(value));
  if (exact === null) return null;
  return direction < 0 ? negateDecimalNumber(exact) : exact;
}
