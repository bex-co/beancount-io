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
import {
  currencyMinorUnits,
  isFiatCurrency,
} from "../../../common/currency-util";
import { getFormatDate } from "../../../common/format-util";
import type {
  JournalAmount,
  JournalCustom,
} from "../../transactions-screen/types";
import { utcTime } from "../../../common/calendar-date";
import {
  amountScale,
  COMMODITY_MONEY_DIGITS,
  formatMoneyWithCurrency,
} from "../../../common/number-utils";

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
  return `${String(year).padStart(4, "0")}-${mm}-${dd}`;
}

/** Epoch ms at UTC midnight — the canonical form for all day arithmetic. */
function toEpoch({ year, month, day }: YearMonthDay): number {
  return utcTime(year, month - 1, day);
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

  // The journal returns entries newest first, so two directives on one date
  // arrive later-first. Reversed into ledger order, the stable date sort below
  // keeps them in that order and the later one — what Update Budget writes on
  // the same day — becomes the current target, the last history step and the
  // chart's basis (w21/040; the dashboard's w4/232).
  for (const entry of [...(entries ?? [])].reverse()) {
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

/**
 * An all-time series with its current period read up to today. The all-time
 * totals query runs to the last posting, even a pre-entered one: one rent
 * cheque for next month made every card on ALL describe November, at a budget
 * of 0 (w21/168). Cutting the series at the end of the current period fixed
 * that but kept a future entry inside the current month, quarter or year, so
 * ALL read $300 spent where YTD, which the server ends at today, read $0
 * (w21/332). The periods that ended before today's keep the all-time totals;
 * the current one comes from `current`, the same query run from the period's
 * start to today, as a windowed range is. While `current` has not arrived the
 * series stops short of the current period rather than show the wrong one.
 */
export function allTimeThroughToday<T extends { date: string }>(
  fetched: readonly T[],
  current: readonly T[] | undefined,
  interval: string,
  today: string,
): T[] {
  const { start } = currentPeriodRange(interval, today);
  return [...fetched.filter((item) => item.date < start), ...(current ?? [])];
}

/**
 * The period-end dates strictly between `from`'s period and `to`'s: the empty
 * periods a series jumps over when the current period's row follows an old
 * posting (w21/670).
 */
export function periodsBetween(
  from: string,
  interval: string,
  to: string,
): string[] {
  return periodsThrough(from, interval, to).filter((end) => end < to);
}

/**
 * The period-end dates after `lastDate`'s period, through the period that
 * contains `today`. An all-time totals query returns only periods with
 * postings, so a budget active since the last one lost its recent, unspent
 * periods — and the card reported an old month as the current one (w21/010).
 * Bounded: an unwindowed query never reaches back past the ledger's first
 * posting, and each step advances by one whole period.
 */
export function periodsThrough(
  lastDate: string,
  interval: string,
  today: string,
): string[] {
  const ends: string[] = [];
  let previous = lastDate;
  let start = nextIntervalStartISO(lastDate, interval);
  // A malformed date comes back unchanged; only ever step forward.
  while (start > previous && start <= today) {
    const next = nextIntervalStartISO(start, interval);
    ends.push(addDaysISO(next, -1));
    previous = start;
    start = next;
  }
  return ends;
}

/**
 * Whether the figures for the current period are in. A windowed range ends
 * today on the server, so it always is; all time ends at the last posting and
 * reads the current period on its own (w21/168, w21/332), and until that read
 * has data (pending, or failed offline) the period is unknown, not zero: the
 * series must not invent a $0 actual for it, nor judge the budget on it
 * (w21/455).
 */
export function currentPeriodKnown(
  time: string | undefined,
  currentWindowData: unknown,
): boolean {
  return time !== undefined || currentWindowData !== undefined;
}

/**
 * What a budget card makes of its actuals reads. A refresh that failed over
 * figures already loaded is stale data, not a failure: Apollo keeps the old
 * `data` and sets `error`, and the card replaced the chart with "Failed to load
 * budgets" and dropped Actual, Variance and the meter (w21/576). `error` is a
 * failure only when nothing is held; `stale` is a failure over held figures,
 * which the card shows under the stale banner; `settled` is whether the series
 * ends on a period whose figures are in.
 */
export function budgetActualsState({
  data,
  currentData,
  error,
  time,
}: {
  data: unknown;
  currentData: unknown;
  error: unknown;
  time: string | undefined;
}): { error: unknown; stale: boolean; settled: boolean } {
  const held = data !== undefined && currentPeriodKnown(time, currentData);
  return {
    error: held ? undefined : error,
    stale: held && Boolean(error),
    settled: held,
  };
}

/**
 * The fraction digits a budget's amounts are recorded at: 3 for `0.003 BTC`,
 * 0 for `1500 JPY`. For display, where the currency's own minor units already
 * set the floor — a floor of cents here printed "¥1,016.13" (w21/425).
 */
export function budgetDisplayScale(
  history: readonly { amount?: string }[] | null | undefined,
): number {
  return Math.max(
    0,
    ...(history ?? []).map((entry) =>
      amountScale(entry.amount?.trim().split(/\s+/)[0] ?? ""),
    ),
  );
}

/**
 * The same, never below cents: money is judged — prorated and compared for a
 * variance — at least to the cent, and a fractional commodity at the precision
 * its budget was written in (w21/290).
 *
 * The floor is the currency's own minor unit when it is given for a status
 * (w21/596): a yen budget prorated to cents (967.74) was compared with ¥968
 * spent at cents, so "Budget ¥968 · Actual ¥968 · Variance +¥0" read "Above
 * target" in red. Judged at the scale the card shows, it is on target.
 */
export function budgetScale(
  history: readonly { amount?: string }[] | null | undefined,
  currency?: string,
): number {
  const floor = currency === undefined ? 2 : currencyMinorUnits(currency);
  return Math.max(floor, budgetDisplayScale(history));
}

/**
 * The precision a budget's status is judged at: that of the figures beside
 * it. A commodity's budget, actual and variance print every digit they hold,
 * to eight places (w21/595), so judged at half its written digit, ±0.0005 for
 * "0.003 BTC", the card read a green "On target" beside "Variance +0.0003742
 * BTC", 17% over (w21/804). Money keeps `budgetScale`.
 */
export function statusScale(
  history: readonly { amount?: string }[] | null | undefined,
  currency?: string,
): number {
  const scale = budgetScale(history, currency);
  return currency !== undefined && currency !== "" && !isFiatCurrency(currency)
    ? Math.max(scale, COMMODITY_MONEY_DIGITS)
    : scale;
}

/**
 * A history entry's "300 USD" amount as the card shows its budget: the
 * magnitude, grouped and annotated with its currency. An income target is
 * stored negative; printing the stored text showed `-4250.50 USD` ungrouped
 * beside a card that reads $4,250.50 (w21/399). `fallbackCurrency` stands in
 * for an amount that names none.
 */
export function formatBudgetEntryAmount(
  amount: string,
  fallbackCurrency: string,
): string {
  const [number = "", code] = amount.trim().split(/\s+/);
  const value = Number.parseFloat(number);
  if (!Number.isFinite(value)) return amount;
  return formatMoneyWithCurrency(
    Math.abs(value),
    code || fallbackCurrency,
    amountScale(number),
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
  asOf?: string,
  windowStart?: string,
  endsOn?: string,
): number {
  return budgetForInterval(
    intervalEnd,
    chartInterval,
    prepareBudgetHistory(history),
    asOf,
    windowStart,
    endsOn,
  );
}

/** `calculateBudgetForInterval` over an already-prepared history. */
export function budgetForInterval(
  intervalEnd: string,
  chartInterval: string,
  ordered: PreparedBudgetHistory,
  asOf?: string,
  windowStart?: string,
  endsOn?: string,
): number {
  // The server starts a window's series on its first day, so a 1Y window's
  // first month (or a YTD's first week) holds only part of a period; budget it
  // for that part too, as `asOf` does for the end (w21/102).
  const periodStart = intervalStartISO(intervalEnd, chartInterval);
  const start =
    windowStart !== undefined && windowStart > periodStart
      ? windowStart
      : periodStart;
  // A budget is compared with actuals, which cannot run past today: a period
  // still in progress is budgeted only up to `asOf`, and one not yet begun has
  // no budget. Otherwise a window without an end (all time) set a full month's
  // target against a partial month's spending.
  let end = asOf !== undefined && asOf < intervalEnd ? asOf : intervalEnd;
  // A budget on a closed account ends with it: nothing after its close date is
  // budgeted (w21/398).
  if (endsOn !== undefined && endsOn < end) end = endsOn;
  if (end < start) {
    return 0;
  }

  // The common case by far: a single directive, already in effect at the start
  // of a *whole* period, whose cadence is the one being charted. Every day then
  // contributes value/days and the walk below sums back to exactly `value` —
  // so skip it. Without this a yearly budget walks 365 days per chart point,
  // and the server returns up to 100 points. A partial period (a window ending
  // mid-month) must take the walk, or it would read the whole period's target.
  // The first directive back-fills the period it falls in: a budget set on the
  // 21st is a budget for that month, not for its last ten days, so the first
  // period is not judged as a spend of the whole month against a target for the
  // tail of it (w21/301; the dashboard budgets the full month too). Only once
  // the directive is in effect: one dated after `end` has not started.
  const firstDate = ordered[0]?.date;
  const backfilled =
    firstDate !== undefined &&
    firstDate > periodStart &&
    firstDate <= intervalEnd &&
    firstDate <= end;
  // Back to the start of the first budget's own period, not the chart's: a
  // Monthly budget set on Oct 21 and changed to Yearly the next day covered
  // the whole year on the yearly chart, "Budget $2,922.95" for $222.95
  // (w21/762). The budget that governs that first day sets the period.
  const governing =
    firstDate === undefined
      ? undefined
      : ordered.filter((entry) => entry.date === firstDate).at(-1);
  const backfillStart =
    governing === undefined
      ? periodStart
      : [periodStart, intervalStartISO(governing.date, governing.interval)]
          .sort()
          .at(-1)!;
  // Every directive dated on the first date, not only the first of them: a
  // budget corrected the same day it was set (500, then 300) left the replaced
  // one covering the period start and the correction governing only from its
  // own date, so "Budget $341.94" read where 300 a month gives $212.90 (w21/622).
  const effectiveFrom = (index: number): string =>
    backfilled && ordered[index].date === firstDate
      ? backfillStart
      : ordered[index].date;

  const only = ordered.length === 1 ? ordered[0] : null;
  if (
    only &&
    effectiveFrom(0) <= start &&
    start === periodStart &&
    normalizeInterval(only.interval) === normalizeInterval(chartInterval) &&
    end === addDaysISO(nextIntervalStartISO(start, chartInterval), -1)
  ) {
    return only.value;
  }

  let activeIndex = -1;
  let total = 0;
  // The denominator only changes when the active directive changes or its own
  // period rolls over, so carry it instead of recomputing it every day.
  let periodEnd = "";
  let periodDays = 1;

  for (let day = start; day <= end; day = addDaysISO(day, 1)) {
    let changed = false;
    while (
      activeIndex + 1 < ordered.length &&
      effectiveFrom(activeIndex + 1) <= day
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
  // variance and progress figure downstream. A fractional commodity keeps its
  // recorded scale and a few guard digits: cents turned 0.003 BTC prorated to
  // today into 0, a budget that read as none (w21/290). Its currency's own
  // minor unit is the floor: rounded to cents, 100 KWD prorated to 74.1935
  // read 74.19, and 74.193 spent "Above target" (w21/805).
  const currency = ordered
    .map((entry) => entry.amount?.trim().split(/\s+/)[1])
    .find((code) => code !== undefined && code !== "");
  const scale = budgetScale(ordered, currency);
  const decimals = scale <= 2 ? 2 : scale + 4;
  const factor = 10 ** decimals;
  return Math.round(total * factor) / factor;
}

/**
 * Income budgets are written as negative amounts; over-target is *good* for
 * them and bad for expenses. Callers compare magnitudes and use this to decide
 * which side is favorable.
 */
export function budgetDirection(budgetValue: number): 1 | -1 {
  return budgetValue < 0 ? -1 : 1;
}

/**
 * The direction of a budget, from its history rather than from the amount in
 * effect today. Zeroing an income target (the natural way to stop tracking it,
 * since Delete rewrites history) is stored as "0", whose sign says nothing, and
 * the whole card then ran on expense rules: income drawn as negative bars and a
 * missed month green (w21/394). The newest entry that has a sign decides; a
 * budget that was only ever zero is an expense cap.
 */
export function groupDirection(group: BudgetGroup): 1 | -1 {
  for (let i = group.budgetHistory.length - 1; i >= 0; i -= 1) {
    const value = Number.parseFloat(group.budgetHistory[i].amount);
    if (Number.isFinite(value) && value !== 0) return budgetDirection(value);
  }
  return budgetDirection(group.value);
}

/**
 * The currencies each account has a budget in. Spending in one of them is
 * that budget's actual: carried as another card's "Not in total", it withheld
 * both cards' status, and each listed what the other already counts
 * (w21/806).
 */
export function budgetCurrenciesByAccount(
  groups: readonly Pick<BudgetGroup, "account" | "currency">[],
): Map<string, string[]> {
  const byAccount = new Map<string, string[]>();
  for (const { account, currency } of groups) {
    const list = byAccount.get(account) ?? [];
    if (!list.includes(currency)) list.push(currency);
    byAccount.set(account, list);
  }
  return byAccount;
}

/** Holdings a budget leaves out, less those its account budgets on its own. */
export function budgetNotInTotal<T extends { currency: string }>(
  holdings: readonly T[],
  budgetedCurrencies: readonly string[] = [],
): T[] {
  return holdings.filter(
    (holding) => !budgetedCurrencies.includes(holding.currency),
  );
}

export type VarianceStatus = "above" | "below" | "on";

/**
 * Half a unit of the budget's last recorded digit — half a cent for money.
 * Actuals and prorated budgets are both floating point, so an exact-zero
 * variance never occurs in practice; without a tolerance "on target" would be
 * unreachable and a matched budget would render as a phantom fraction-of-a-cent
 * overage. A fixed half cent was also the tolerance for a 0.003 BTC budget, so
 * a 33% overspend read "On target"; it scales with the budget's own precision
 * (w21/290).
 */
export function varianceStatus(variance: number, scale = 2): VarianceStatus {
  // `budgetScale` is already never below the cent for money in cents, and is
  // the currency's own minor unit for one without (w21/596).
  const epsilon = 5 * 10 ** -(scale + 1);
  if (variance > epsilon) {
    return "above";
  }
  return variance < -epsilon ? "below" : "on";
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

/**
 * The interval row in progress on `today`: the first one that has not ended. The
 * ledger dates each interval's row at its period's last day (`range.endInclusive`
 * in interval-series.ts), so the row for October is dated 2026-10-31 and the
 * first one on or after today is the period in progress. It returns a row for
 * every interval in the window, empty future ones included, so a window running
 * to the end of the month also holds next week's (or tomorrow's) row, which holds
 * nothing and read as "$0 spent" for a weekly or daily budget (w21/364). The
 * first version took the latest row dated on or before today, which assumed rows
 * dated at the period's start and read last month's row for every monthly budget
 * (w21/469). Null when every row has ended.
 */
export function currentIntervalItem<T extends { date: string }>(
  items: readonly T[],
  today: string,
): T | null {
  const day = today.slice(0, 10);
  let current: T | null = null;
  for (const item of items) {
    if (item.date.slice(0, 10) >= day) {
      if (current === null || item.date < current.date) current = item;
    }
  }
  return current;
}

export type BudgetHistoryRow = BudgetHistoryEntry & {
  /** True for the entry currently in effect. */
  isCurrent: boolean;
};

/**
 * History for display: newest first, since the most recent change is what
 * someone opening the list is looking for. Which entry is in effect was
 * already resolved by `groupBudgetEntries` — `group.entry_hash` is that entry,
 * so a future-dated entry sorts to the top without being marked live. With
 * every entry in the future, that is the earliest, which previews the budget
 * but is not yet in effect: it was highlighted under a "Starts Nov 1" badge
 * (w21/765).
 */
export function selectHistoryRows(
  group: BudgetGroup,
  today: string = getFormatDate(new Date()),
): BudgetHistoryRow[] {
  return [...group.budgetHistory].reverse().map((entry) => ({
    ...entry,
    isCurrent: entry.entry_hash === group.entry_hash && entry.date <= today,
  }));
}

/**
 * The date of the entry in effect, which an Update cannot be dated before
 * (w21/623). A later entry already written down (next year's budget) is not
 * the floor: it would leave today's budget uncorrectable (w21/661).
 */
export function budgetInEffectDate(group: BudgetGroup): string | undefined {
  return group.budgetHistory.find((h) => h.entry_hash === group.entry_hash)
    ?.date;
}
