/**
 * Budget domain logic, ported from the dashboard's `budget-utils.ts` with the
 * same Fava semantics:
 *
 * - one budget history per account **and currency** (a newer directive
 *   supersedes the previous one for that pair, even when the cadence changes),
 * - daily-equivalent proration when converting a directive's cadence to a
 *   chart interval, which makes cross-cadence conversion and mid-period
 *   effective dates exact.
 *
 * Mobile has no date-fns, so dates are handled as "YYYY-MM-DD" strings with
 * UTC-based arithmetic: results never shift with the device timezone. Only
 * the default "today" reads local time, because it is a local-calendar question.
 *
 * Imports stay relative and React-Native-free so the jest-lite runner can
 * exercise this module directly.
 */
import { getFormatDate } from "../../../common/format-util";
import type {
  JournalAmount,
  JournalCustom,
} from "../../transactions-screen/types";

/**
 * A `custom "budget"` directive as the journal serializes it: the positional
 * `values` are `[account, interval, amount]`. Narrowed from the shared journal
 * vocabulary rather than restated, so the payload has one definition.
 */
export type BudgetEntry = Omit<JournalCustom, "values"> & {
  values: (string | JournalAmount)[];
};

/** One dated directive inside a group's history. */
export interface BudgetHistoryEntry {
  date: string;
  interval: string;
  /** Raw "300 USD" display string, as the dashboard stores it. */
  amount: string;
  entry_hash: string;
}

/** All directives for one account+currency pair, newest-effective first-class. */
export interface BudgetGroup {
  account: string;
  interval: string;
  currency: string;
  /** Amount of the entry in effect on the active date, e.g. "300 USD". */
  amount: string;
  /** That amount as a number — negative for an income target. */
  value: number;
  entry_hash: string;
  /** Every entry for this account+currency, sorted by date ascending. */
  budgetHistory: BudgetHistoryEntry[];
}

interface ParsedBudgetAmount {
  value: number;
  currency: string;
}

interface BudgetFields extends ParsedBudgetAmount {
  account: string;
  interval: string;
  amount: string;
}

type YearMonthDay = { year: number; month: number; day: number };

const MS_PER_DAY = 86400000;

function parseISODate(iso: string): YearMonthDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatISODate({ year, month, day }: YearMonthDay): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Epoch ms at UTC midnight — the canonical form for all day arithmetic. */
function toEpoch({ year, month, day }: YearMonthDay): number {
  return Date.UTC(year, month - 1, day);
}

function fromEpoch(epoch: number): YearMonthDay {
  const date = new Date(epoch);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function addDaysISO(iso: string, days: number): string {
  const parsed = parseISODate(iso);
  if (!parsed) {
    return iso;
  }
  return formatISODate(fromEpoch(toEpoch(parsed) + days * MS_PER_DAY));
}

/**
 * "monthly" → "month", "daily" → "day". Unknown cadences fall through to the
 * monthly branch of the callers' switch, matching the dashboard.
 */
function normalizeInterval(interval: string): string {
  const normalized = interval.toLowerCase();
  return normalized === "daily" ? "day" : normalized.replace(/ly$/, "");
}

/** First day of the period containing `iso`. Weeks start Monday (Fava's rule). */
export function intervalStartISO(iso: string, interval: string): string {
  const parsed = parseISODate(iso);
  if (!parsed) {
    return iso;
  }
  switch (normalizeInterval(interval)) {
    case "day":
      return formatISODate(parsed);
    case "week": {
      // getUTCDay(): 0 = Sunday. Shift so Monday is 0.
      const weekday = (new Date(toEpoch(parsed)).getUTCDay() + 6) % 7;
      return formatISODate(fromEpoch(toEpoch(parsed) - weekday * MS_PER_DAY));
    }
    case "quarter": {
      const month = Math.floor((parsed.month - 1) / 3) * 3 + 1;
      return formatISODate({ year: parsed.year, month, day: 1 });
    }
    case "year":
      return formatISODate({ year: parsed.year, month: 1, day: 1 });
    default:
      return formatISODate({ year: parsed.year, month: parsed.month, day: 1 });
  }
}

/** First day of the period *after* the one containing `iso`. */
export function nextIntervalStartISO(iso: string, interval: string): string {
  const start = parseISODate(intervalStartISO(iso, interval));
  if (!start) {
    return iso;
  }
  switch (normalizeInterval(interval)) {
    case "day":
      return addDaysISO(formatISODate(start), 1);
    case "week":
      return addDaysISO(formatISODate(start), 7);
    case "quarter":
      return formatISODate(addMonths(start, 3));
    case "year":
      return formatISODate({ year: start.year + 1, month: 1, day: 1 });
    default:
      return formatISODate(addMonths(start, 1));
  }
}

function addMonths(ymd: YearMonthDay, months: number): YearMonthDay {
  const zeroBased = ymd.month - 1 + months;
  return {
    year: ymd.year + Math.floor(zeroBased / 12),
    month: (((zeroBased % 12) + 12) % 12) + 1,
    day: ymd.day,
  };
}

/**
 * Calendar days in the period containing `iso` — 28..31 for months, 90..92 for
 * quarters, 365/366 for years. This is the denominator of the daily-equivalent
 * conversion, so leap years matter.
 */
export function daysInBudgetPeriod(iso: string, interval: string): number {
  const start = parseISODate(intervalStartISO(iso, interval));
  const next = parseISODate(nextIntervalStartISO(iso, interval));
  if (!start || !next) {
    return 1;
  }
  return Math.round((toEpoch(next) - toEpoch(start)) / MS_PER_DAY);
}

/** Split a "300 USD" directive amount. Unparseable numbers become 0. */
function parseBudgetAmount(amount: string): ParsedBudgetAmount {
  const [number = "0", currency = ""] = amount.trim().split(/\s+/);
  const value = Number.parseFloat(number);
  return { value: Number.isNaN(value) ? 0 : value, currency };
}

function getBudgetFields(entry: BudgetEntry): BudgetFields | null {
  const values = entry.values ?? [];
  const account = typeof values[0] === "string" ? values[0] : "";
  const interval = typeof values[1] === "string" ? values[1] : "";
  const amountRaw = values[2];

  if (
    !account ||
    !interval ||
    !amountRaw ||
    typeof amountRaw !== "object" ||
    !("number" in amountRaw)
  ) {
    return null;
  }

  const value = Number.parseFloat(String(amountRaw.number));
  const currency = String(amountRaw.currency ?? "");
  if (Number.isNaN(value) || !currency) {
    return null;
  }

  return {
    account,
    interval,
    value,
    currency,
    amount: `${amountRaw.number} ${currency}`,
  };
}

/**
 * Group raw budget directives into one history per account+currency, resolving
 * which entry is in effect on `activeDate`. Malformed directives are dropped.
 */
export function groupBudgetEntries(
  entries: BudgetEntry[],
  activeDate: string = getFormatDate(new Date()),
): BudgetGroup[] {
  const groups = new Map<
    string,
    Array<{ entry: BudgetEntry; fields: BudgetFields }>
  >();

  for (const entry of entries ?? []) {
    const fields = entry && getBudgetFields(entry);
    if (!fields) {
      continue;
    }
    const key = `${fields.account}::${fields.currency}`;
    const group = groups.get(key) ?? [];
    group.push({ entry, fields });
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((groupEntries) => {
      const sorted = groupEntries.sort((a, b) =>
        a.entry.date.localeCompare(b.entry.date),
      );
      // The entry in effect is the newest one dated on or before activeDate;
      // when every directive is in the future, the earliest one previews.
      let current = sorted[0];
      for (const item of sorted) {
        if (item.entry.date <= activeDate) {
          current = item;
        }
      }

      return {
        account: current.fields.account,
        interval: current.fields.interval,
        currency: current.fields.currency,
        amount: current.fields.amount,
        value: current.fields.value,
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

/** A history entry with its "300 USD" amount already split into value+currency. */
export type PreparedBudgetHistory = ReadonlyArray<
  BudgetHistoryEntry & ParsedBudgetAmount
>;

/**
 * Sort and parse a group's history once. `budgetForInterval` runs per charted
 * period, so preparing inside it would re-copy and re-parse the same immutable
 * history for every point on the chart.
 */
export function prepareBudgetHistory(
  history: BudgetHistoryEntry[],
): PreparedBudgetHistory {
  return [...(history ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ ...entry, ...parseBudgetAmount(entry.amount) }));
}

/**
 * Budget for the chart period ending at `intervalEnd`, expressed in
 * `chartInterval`. Mirrors Fava's daily-equivalent calculation: every day in
 * the period contributes the active directive's amount divided by the length of
 * *that directive's own* period, so a monthly 310 becomes 70 on a weekly chart
 * and a directive effective mid-period is prorated.
 *
 * Callers charting a whole series should prepare the history once and use
 * `budgetForInterval` instead.
 */
export function calculateBudgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  history: BudgetHistoryEntry[],
): number {
  return budgetForInterval(
    intervalEnd,
    chartInterval,
    prepareBudgetHistory(history),
  );
}

/** `calculateBudgetForInterval` over an already-prepared history. */
export function budgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  ordered: PreparedBudgetHistory,
): number {
  const start = intervalStartISO(intervalEnd, chartInterval);

  // The common case by far: a single directive, already in effect at the start
  // of the period, whose cadence is the one being charted. Every day then
  // contributes value/days and the walk below sums back to exactly `value` —
  // so skip it. Without this a yearly budget walks 365 days per chart point,
  // and the server returns up to 100 points.
  const only = ordered.length === 1 ? ordered[0] : null;
  if (
    only &&
    only.date <= start &&
    normalizeInterval(only.interval) === normalizeInterval(chartInterval)
  ) {
    return only.value;
  }

  let activeIndex = -1;
  let total = 0;
  // The denominator only changes when the active directive changes or its own
  // period rolls over, so carry it instead of recomputing it every day.
  let periodEnd = "";
  let periodDays = 1;

  for (let day = start; day <= intervalEnd; day = addDaysISO(day, 1)) {
    let changed = false;
    while (
      activeIndex + 1 < ordered.length &&
      ordered[activeIndex + 1].date <= day
    ) {
      activeIndex += 1;
      changed = true;
    }

    const active = ordered[activeIndex];
    if (!active) {
      continue;
    }
    if (changed || day > periodEnd) {
      periodDays = daysInBudgetPeriod(day, active.interval);
      periodEnd = addDaysISO(nextIntervalStartISO(day, active.interval), -1);
    }
    total += active.value / periodDays;
  }

  // Summing daily equivalents accumulates binary-float error — a 5000/month
  // budget over 31 days lands on 5000.000000000001. A budget is money, so
  // settle it at money precision rather than carrying the noise into every
  // variance and progress figure downstream.
  return Math.round(total * 100) / 100;
}

/**
 * Income budgets are written as negative amounts; over-target is *good* for
 * them and bad for expenses. Callers compare magnitudes and use this to decide
 * which side is favorable.
 */
export function budgetDirection(budgetValue: number): 1 | -1 {
  return budgetValue < 0 ? -1 : 1;
}

export type VarianceStatus = "above" | "below" | "on";

/**
 * Half a cent. Actuals and prorated budgets are both floating point, so an
 * exact-zero variance never occurs in practice; without a tolerance "on target"
 * would be unreachable and a matched budget would render as a phantom
 * fraction-of-a-cent overage.
 */
const VARIANCE_EPSILON = 0.005;

export function varianceStatus(variance: number): VarianceStatus {
  if (variance > VARIANCE_EPSILON) {
    return "above";
  }
  return variance < -VARIANCE_EPSILON ? "below" : "on";
}

/** Under target is favorable for expenses; over target is favorable for income. */
export function isFavorableVariance(
  status: VarianceStatus,
  direction: 1 | -1,
): boolean {
  if (status === "on") {
    return true;
  }
  return direction > 0 ? status === "below" : status === "above";
}

/** Inclusive date range of the period containing `date` for a given cadence. */
export function currentPeriodRange(
  interval: string,
  date: string = getFormatDate(new Date()),
): { start: string; end: string } {
  const start = intervalStartISO(date, interval);
  return { start, end: addDaysISO(nextIntervalStartISO(date, interval), -1) };
}

export type BudgetHistoryRow = BudgetHistoryEntry & {
  /** True for the entry currently in effect. */
  isCurrent: boolean;
};

/**
 * History for display: newest first, since the most recent change is what
 * someone opening the list is looking for. Which entry is in effect was
 * already resolved by `groupBudgetEntries` — `group.entry_hash` is that entry,
 * so a future-dated entry sorts to the top without being marked live.
 */
export function selectHistoryRows(group: BudgetGroup): BudgetHistoryRow[] {
  return [...group.budgetHistory].reverse().map((entry) => ({
    ...entry,
    isCurrent: entry.entry_hash === group.entry_hash,
  }));
}
