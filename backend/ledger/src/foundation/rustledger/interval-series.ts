import type { DirectiveJson } from "@rustledger/wasm";
import type { PriceMap } from "./price-map";
import { LotInventory, parseConversion } from "./lot-inventory";
import { utcDate } from "./utc-date";

/**
 * beancount `FLAG_UNREALIZED` (`fava/beans/flags.py`). Fava's cumulative
 * `account_balance` and `net_worth` chart series exclude transactions carrying
 * this flag — the `unrealized` plugin books unrealized gains as `U`-flagged
 * transactions that must NOT count toward realized balances or net worth
 * (`fava/modules/chart.py`: `entry.flag != FLAG_UNREALIZED`). Note the
 * per-interval flow series (`interval_totals`) deliberately does NOT filter it.
 */
const FLAG_UNREALIZED = "U";

export interface DateBalance {
  date: string;
  balance: Record<string, string>;
}

export interface DateBalanceWithAccounts extends DateBalance {
  account_balances: Record<string, Record<string, string>>;
}

export type IntervalKey =
  | "year"
  | "yearly"
  | "quarter"
  | "quarterly"
  | "month"
  | "monthly"
  | "week"
  | "weekly"
  | "day"
  | "daily";

// --- date helpers (UTC, deterministic; no timezone drift) -------------------

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return [y, m, d];
}
function iso(y: number, m: number, d: number): string {
  const pad = (n: number, width: number): string =>
    String(n).padStart(width, "0");
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = parts(isoDate);
  const dt = utcDate(y, m - 1, d);
  dt.setUTCDate(dt.getUTCDate() + days);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

interface Interval {
  getPrev(isoDate: string): string;
  getNext(isoDate: string): string;
}

const INTERVALS: Record<string, Interval> = {
  year: {
    getPrev: (s) => iso(parts(s)[0], 1, 1),
    getNext: (s) => iso(parts(s)[0] + 1, 1, 1),
  },
  quarter: {
    getPrev: (s) => {
      const [y, m] = parts(s);
      for (const i of [10, 7, 4]) if (m > i) return iso(y, i, 1);
      return iso(y, 1, 1);
    },
    getNext: (s) => {
      const [y, m] = parts(s);
      for (const i of [4, 7, 10]) if (m < i) return iso(y, i, 1);
      return iso(y + 1, 1, 1);
    },
  },
  month: {
    getPrev: (s) => {
      const [y, m] = parts(s);
      return iso(y, m, 1);
    },
    getNext: (s) => {
      const [y, m] = parts(s);
      const month = (m % 12) + 1;
      const year = y + (m + 1 > 12 ? 1 : 0);
      return iso(year, month, 1);
    },
  },
  week: {
    getPrev: (s) => {
      const [y, m, d] = parts(s);
      const mondayBased = (utcDate(y, m - 1, d).getUTCDay() + 6) % 7;
      return addDays(s, -mondayBased);
    },
    getNext: (s) => {
      const [y, m, d] = parts(s);
      const mondayBased = (utcDate(y, m - 1, d).getUTCDay() + 6) % 7;
      return addDays(s, 7 - mondayBased);
    },
  },
  day: {
    getPrev: (s) => s,
    getNext: (s) => addDays(s, 1),
  },
};

/**
 * Canonical interval for every accepted {@link IntervalKey} spelling. An
 * explicit map — NOT an `ly`-suffix strip, which turns "daily" into "dai" and
 * silently degraded daily series to monthly. `Record<IntervalKey, …>` makes
 * the compiler enforce that every union member is covered.
 */
const INTERVAL_ALIASES: Record<IntervalKey, Interval> = {
  year: INTERVALS.year,
  yearly: INTERVALS.year,
  quarter: INTERVALS.quarter,
  quarterly: INTERVALS.quarter,
  month: INTERVALS.month,
  monthly: INTERVALS.month,
  week: INTERVALS.week,
  weekly: INTERVALS.week,
  day: INTERVALS.day,
  daily: INTERVALS.day,
};

function resolveInterval(key: IntervalKey): Interval {
  // The fallback guards against out-of-union strings arriving at runtime
  // (interval keys ultimately come from request params); it preserves the
  // previous behavior of defaulting unknown values to monthly.
  return INTERVAL_ALIASES[key] ?? INTERVALS.month;
}

export interface DateRange {
  begin: string;
  end: string; // exclusive
  endInclusive: string;
}

/**
 * Faithful port of fava's `dateranges(first, last, interval, complete)`
 * (`fava/util/date.py::interval_ends`). With `complete` (the default, matching
 * the unfiltered `FilteredLedger.interval_ranges` where `complete = not
 * date_range`) the first/last intervals are rounded out to their natural
 * boundaries (`get_prev(first)` … a trailing `get_next`). With `complete=false`
 * — the case Fava uses when a `time` filter sets a `date_range` — the sequence
 * starts EXACTLY at `firstDate` and ends EXACTLY at `lastDate`, with interior
 * boundaries at each interval step. This boundary difference is why a
 * `time`-filtered report's intervals span `[begin, end)` rather than the
 * transaction span.
 */
export function intervalRanges(
  firstDate: string,
  lastDate: string,
  key: IntervalKey,
  complete = true,
): DateRange[] {
  if (firstDate >= lastDate && firstDate !== lastDate) return [];
  const interval = resolveInterval(key);
  const ends: string[] = [];
  // `interval_ends`: current = get_prev(begin) if complete else begin.
  let current = complete ? interval.getPrev(firstDate) : firstDate;
  // Guard against pathological loops.
  let guard = 0;
  while (current < lastDate && guard < 100_000) {
    ends.push(current);
    current = interval.getNext(current);
    guard += 1;
  }
  // Final yielded end: `current if complete else end`.
  ends.push(complete ? current : lastDate);
  const ranges: DateRange[] = [];
  for (let i = 0; i + 1 < ends.length; i += 1) {
    ranges.push({
      begin: ends[i],
      end: ends[i + 1],
      endInclusive: addDays(ends[i + 1], -1),
    });
  }
  return ranges;
}

/**
 * The default (no-`time`-filter) chart span, matching Fava's `FilteredLedger`
 * (`ledger.py`): the first date is the earliest **Transaction** date, and the
 * last date is the latest **Transaction or Price** date **+ 1 day**. Other
 * directive types (`open`/`close`/`commodity`/`balance`, and old seed `price`s
 * that precede any transaction) must NOT widen the span — otherwise a
 * `1792-01-01 commodity USD` or a `2009-05-01 commodity RGAGX` would drag the
 * income-statement/net-worth axis back years before the first real activity.
 * Returns `[date_first, date_last]` where `date_last` is exclusive (the +1-day
 * offset), for `intervalRanges(..., complete=true)`.
 */
function firstAndLastDate(
  directives: DirectiveJson[],
): [string, string] | null {
  let first: string | null = null;
  let last: string | null = null;
  directives.forEach((d) => {
    if (d.type === "transaction") {
      if (first === null || d.date < first) first = d.date;
    }
    if (d.type === "transaction" || d.type === "price") {
      if (last === null || d.date > last) last = d.date;
    }
  });
  return first !== null && last !== null ? [first, addDays(last, 1)] : null;
}

/**
 * Value a cost-lot inventory under the report's `target` conversion (a currency
 * code, or `units`/`at_cost`/`at_value`), drop net-zero currencies, and
 * stringify — the display shape every chart series returns.
 */
function valueRecord(
  inventory: LotInventory,
  target: string,
  priceMap: PriceMap,
  date: string,
): Record<string, string> {
  const converted = inventory.reduce(parseConversion(target), priceMap, date);
  const out: Record<string, string> = {};
  converted.forEach((value, currency) => {
    if (!value.isZero()) out[currency] = value.toString();
  });
  return out;
}

// fava `interval_totals` uses raw `str.startswith(accounts)` — a prefix match.
function matchesPrefix(account: string, prefixes: string[]): boolean {
  return prefixes.some((p) => account.startsWith(p));
}

// fava `account_balance` uses `account_tester(name, with_children=True)`:
// the account itself or a descendant under a `:` boundary.
function matchesAccountOrChild(account: string, prefixes: string[]): boolean {
  return prefixes.some((p) => account === p || account.startsWith(`${p}:`));
}

/**
 * Resolve the interval boundaries for a chart series, matching
 * `FilteredLedger.interval_ranges`: with an explicit `window` (a `time` filter's
 * `date_range`) span exactly `[begin, end)` with `complete=false` intervals;
 * without one, span the directive dates with `complete=true` intervals.
 */
function seriesRanges(
  directives: DirectiveJson[],
  key: IntervalKey,
  window?: IntervalWindow,
): DateRange[] {
  if (window) {
    return intervalRanges(window.begin, window.end, key, false);
  }
  const span = firstAndLastDate(directives);
  if (!span) return [];
  return intervalRanges(span[0], span[1], key, true);
}

/**
 * The `[begin, end)` boundary Fava's `TimeFilter` imposes on a report. When
 * present, the interval series spans exactly this range (`dateranges(begin, end,
 * interval, complete=false)`, matching `FilteredLedger.interval_ranges` with a
 * `date_range`) rather than the transaction span. Supply the parsed range from
 * {@link "./directive-filter".parseDateRange} whenever a `time` filter is set.
 */
export interface IntervalWindow {
  begin: string;
  end: string; // exclusive
}

/**
 * Per-interval flow totals for the given account prefixes (fava
 * `ChartModule.interval_totals`): sum postings within each interval, with a
 * per-account breakdown, converted at the interval end. Limited to 100.
 *
 * `window` selects the interval boundaries: absent ⇒ the transaction span with
 * complete (rounded-out) intervals; present ⇒ exactly `[begin, end)` with
 * `complete=false` intervals (the `time`-filtered case).
 */
export function intervalTotals(
  directives: DirectiveJson[],
  key: IntervalKey,
  prefixes: string[],
  target: string,
  priceMap: PriceMap,
  window?: IntervalWindow,
): DateBalanceWithAccounts[] {
  const ranges = seriesRanges(directives, key, window).slice(-100);
  const accumulators = ranges.map(() => {
    const total = new LotInventory();
    const perAccount = new Map<string, LotInventory>();
    return { total, perAccount };
  });

  // Directives and ranges are chronological. Advance through both once instead
  // of rescanning the entire ledger for each of up to 100 chart intervals.
  let rangeIndex = 0;
  for (const directive of directives) {
    if (directive.type !== "transaction") continue;
    while (
      rangeIndex < ranges.length &&
      directive.date >= ranges[rangeIndex].end
    ) {
      rangeIndex += 1;
    }
    if (rangeIndex >= ranges.length) break;
    if (directive.date < ranges[rangeIndex].begin) continue;

    const { total, perAccount } = accumulators[rangeIndex];
    directive.postings.forEach((posting) => {
      if (!posting.units || !matchesPrefix(posting.account, prefixes)) return;
      total.addPosting(posting);
      let acct = perAccount.get(posting.account);
      if (!acct) {
        acct = new LotInventory();
        perAccount.set(posting.account, acct);
      }
      acct.addPosting(posting);
    });
  }

  return ranges.map((range, index) => {
    const { total, perAccount } = accumulators[index];
    const account_balances: Record<string, Record<string, string>> = {};
    perAccount.forEach((inventory, account) => {
      account_balances[account] = valueRecord(
        inventory,
        target,
        priceMap,
        range.endInclusive,
      );
    });
    return {
      date: range.endInclusive,
      balance: valueRecord(total, target, priceMap, range.endInclusive),
      account_balances,
    };
  });
}

/**
 * Cumulative end-of-interval balance for an account subtree (fava
 * `ChartModule.account_balance` / `net_worth` when given the asset+liability
 * roots). Postings accumulate across intervals.
 *
 * `window` selects the interval boundaries exactly as in {@link intervalTotals}:
 * a `time` filter's `[begin, end)` (complete=false) vs. the transaction span.
 * The running inventory still accumulates from the earliest directive, so the
 * synthetic opening-balance entries (dated `begin - 1`, produced by the clamp)
 * are folded into the balance before the first in-window interval end.
 *
 * `U`-flagged (`FLAG_UNREALIZED`) transactions are excluded — matching Fava's
 * `account_balance`/`net_worth`, which value only realized activity.
 */
export function accountBalanceSeries(
  directives: DirectiveJson[],
  key: IntervalKey,
  prefixes: string[],
  target: string,
  priceMap: PriceMap,
  window?: IntervalWindow,
): DateBalance[] {
  const ranges = seriesRanges(directives, key, window);
  if (ranges.length === 0) return [];
  const txns = directives
    .filter(
      (d): d is Extract<DirectiveJson, { type: "transaction" }> =>
        d.type === "transaction" && d.flag !== FLAG_UNREALIZED,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const inventory = new LotInventory();
  let idx = 0;
  return ranges.map((range) => {
    while (idx < txns.length && txns[idx].date < range.end) {
      txns[idx].postings.forEach((posting) => {
        if (posting.units && matchesAccountOrChild(posting.account, prefixes)) {
          inventory.addPosting(posting);
        }
      });
      idx += 1;
    }
    return {
      date: range.endInclusive,
      balance: valueRecord(inventory, target, priceMap, range.endInclusive),
    };
  });
}

/**
 * Running-balance line chart for an account subtree (fava
 * `ChartModule.linechart`): a point at each date the balance changed, valued at
 * that date. Currencies that drop to zero are re-emitted as `"0"` for one point
 * so the chart shows the decline (fava's `last_currencies` behavior).
 */
export function linechartSeries(
  directives: DirectiveJson[],
  prefixes: string[],
  target: string,
  priceMap: PriceMap,
): DateBalance[] {
  const running = new LotInventory();
  let lastDate: string | null = null;
  const points: Array<{ date: string; balance: LotInventory }> = [];

  directives.forEach((directive) => {
    if (directive.type !== "transaction") return;
    directive.postings.forEach((posting) => {
      if (!posting.units || !matchesAccountOrChild(posting.account, prefixes))
        return;
      if (lastDate !== null && directive.date > lastDate) {
        points.push({ date: lastDate, balance: running.clone() });
      }
      running.addPosting(posting);
      lastDate = directive.date;
    });
  });
  if (lastDate !== null)
    points.push({ date: lastDate, balance: running.clone() });

  let lastCurrencies: Set<string> | null = null;
  return points.map((point) => {
    const balance = valueRecord(point.balance, target, priceMap, point.date);
    const currencies = new Set(Object.keys(balance));
    if (lastCurrencies) {
      lastCurrencies.forEach((currency) => {
        if (!currencies.has(currency)) balance[currency] = "0";
      });
    }
    lastCurrencies = currencies;
    return { date: point.date, balance };
  });
}
