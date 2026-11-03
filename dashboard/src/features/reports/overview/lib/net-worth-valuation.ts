import {
  negateDecimalNumber,
  parseDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { toFiniteAmount } from "./unit-amounts";

/**
 * What a Net Worth valued at market has to say about itself (w4/m26, w4/m27).
 *
 * The balance modules read `at_value`, which the ledger service computes lot by
 * lot: a lot held at cost is worth units × the latest price on or before the
 * figure's date in its cost currency, or its cost when there is no such price;
 * a lot with no cost stays in its own units. The figure alone cannot tell a
 * reader which of those happened, so this reads two more views of the same
 * point — the `at_cost` balance and the `units_by_cost` units, which key each
 * holding by the currency its lots cost (`VTI {EUR}`, `EUR {}`, w4/m58) — plus
 * the ledger's price dates and managed price sources, and describes every
 * holding by the quote that actually valued it (w4/1031).
 */

type Balance = Record<string, unknown> | null | undefined;

/** One `getLedgerCommodities` pair; only the price dates matter here. */
export type PricePair = {
  base: string;
  quote: string;
  prices: ReadonlyArray<{ date: string }>;
};

/** One `getLedgerManagedPrices` source; its freshness is the feed's own. */
export type ManagedSource = {
  commodity: string | null;
  quote: string | null;
  freshness: string;
};

/** A held commodity, one per cost currency, and how the figure values it. */
export type HeldCommodity = {
  currency: string;
  /**
   * The currency its lots cost, which prices and values them; null for units
   * held without a cost. A commodity bought in two currencies is two holdings.
   */
  costCurrency: string | null;
  units: number;
  /** The units as the ledger recorded them, which a double can round. */
  unitsExact?: string;
  /**
   * `market` — valued at a price in its cost currency, `cost` — held at cost
   * with no such price, `notInTotal` — no cost, so it stays in its own units
   * and out of the operating-currency figure.
   */
  basis: "market" | "cost" | "notInTotal";
  /**
   * Latest date of the price that values it — the commodity in its cost
   * currency — on or before the figure's date; null without one.
   */
  priceDate: string | null;
  /** Whether that price is older than this holding's own threshold. */
  stale: boolean;
  /** That price comes from a managed Beancount.io feed, not the ledger. */
  managed: boolean;
};

export type NetWorthValuation = {
  /** Every held commodity, sorted by symbol. */
  holdings: HeldCommodity[];
  /** Oldest price date among the stale holdings; null when none is stale. */
  staleSince: string | null;
  /** The same figure at cost, when the point holds one. */
  costBasis: number | null;
  /** Market − cost, when both exist. */
  unrealized: number | null;
  /** The same two figures as exact decimals, for display (w4/1015). */
  costBasisExact?: string | null;
  unrealizedExact?: string | null;
};

/** A balance amount as the ledger's decimal, or null. */
function exactOf(value: unknown): string | null {
  return value === null || value === undefined
    ? null
    : parseDecimalNumber(String(value));
}

/** Floor for a ledger-authored price's threshold, and the cadence of a sparse one. */
export const MIN_STALE_DAYS = 7;
/** A managed feed is judged by days, never by its minute-level status. */
export const MANAGED_STALE_DAYS = 3;
/** Cadence multiple a ledger-authored price may lag before it is stale. */
export const CADENCE_MULTIPLE = 3;
/** How many recent price points set a ledger-authored price's cadence. */
const CADENCE_POINTS = 10;

const DAY_MS = 86_400_000;

function dayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  // Not Date.UTC, which reads years 0–99 as 1900–1999: a 0099-12-30 quote was
  // then 693,928 days in the future of 0100-01-31 (w4/1032).
  const value = new Date(0);
  value.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return value.getTime() / DAY_MS;
}

/**
 * A `units_by_cost` key: `VTI {EUR}` is VTI held at a EUR cost, `EUR {}` is
 * EUR held without one. Any other key reads as units without a cost.
 */
function parseHoldingKey(key: string): {
  commodity: string;
  costCurrency: string | null;
} {
  const match = / \{([^{}]*)\}$/.exec(key);
  if (!match) return { commodity: key, costCurrency: null };
  return {
    commodity: key.slice(0, match.index),
    costCurrency: match[1] || null,
  };
}

function nonZero(balance: Balance, currency: string): number | null {
  const value = toFiniteAmount(balance?.[currency]);
  return value === null || value === 0 ? null : value;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function pairMatches(
  base: string,
  quote: string,
  commodity: string,
  currency: string,
): boolean {
  return (
    (base === commodity && quote === currency) ||
    (base === currency && quote === commodity)
  );
}

/**
 * Price dates on or before `date` for `commodity` in `currency`, ascending and
 * de-duplicated, reading a pair in either direction as the price map does.
 */
function priceDatesUpTo(
  pairs: ReadonlyArray<PricePair>,
  commodity: string,
  currency: string,
  date: string,
): string[] {
  const dates = new Set<string>();
  for (const pair of pairs) {
    if (!pairMatches(pair.base, pair.quote, commodity, currency)) continue;
    for (const price of pair.prices) {
      if (price.date <= date) dates.add(price.date);
    }
  }
  return [...dates].sort();
}

/**
 * How many days a ledger-authored price normally goes between updates: the
 * median gap over its last {@link CADENCE_POINTS} dates, or
 * {@link MIN_STALE_DAYS} with fewer than three points to judge from.
 */
export function priceCadenceDays(dates: ReadonlyArray<string>): number {
  const recent = dates.slice(-CADENCE_POINTS);
  if (recent.length < 3) return MIN_STALE_DAYS;
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const a = dayNumber(recent[i - 1]);
    const b = dayNumber(recent[i]);
    if (a !== null && b !== null) gaps.push(b - a);
  }
  if (gaps.length === 0) return MIN_STALE_DAYS;
  gaps.sort((x, y) => x - y);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

/**
 * Whether a holding's latest price is stale `ageDays` after it was set: a
 * managed feed after {@link MANAGED_STALE_DAYS} days, or at once when the feed
 * is unavailable and a day has passed; a ledger-authored price after
 * {@link CADENCE_MULTIPLE} × its own cadence, never under
 * {@link MIN_STALE_DAYS}.
 */
export function isPriceStale({
  ageDays,
  managedFreshness,
  priceDates,
}: {
  ageDays: number;
  /** The managed source's freshness, or null for a ledger-authored price. */
  managedFreshness: string | null;
  priceDates: ReadonlyArray<string>;
}): boolean {
  if (managedFreshness !== null) {
    return (
      ageDays > MANAGED_STALE_DAYS ||
      (managedFreshness === "unavailable" && ageDays >= 1)
    );
  }
  const threshold = Math.max(
    MIN_STALE_DAYS,
    CADENCE_MULTIPLE * priceCadenceDays(priceDates),
  );
  return ageDays > threshold;
}

type Series = ReadonlyArray<{ date: string; balance: Record<string, unknown> }>;

/**
 * The points up to the current month. The ledger service returns months past
 * today when an entry is future-dated, and the latest point of the series then
 * read as next month: the headline showed it, with a change from this month
 * under a falling arrow. Mobile caps at today the same way (w21/995).
 */
export function throughCurrentMonth<T extends { date: string }>(
  series: ReadonlyArray<T>,
  today: string,
): T[] {
  const month = today.slice(0, 7);
  return series.filter((point) => point.date.slice(0, 7) <= month);
}

/** The series point on `date`, else the latest one. */
function balanceOn(series: Series, date: string): Balance {
  return (series.find((point) => point.date === date) ?? series.at(-1))
    ?.balance;
}

/**
 * {@link describeNetWorthValuation} for the latest market point, reading the
 * cost and units series at the same date (their latest, if they lack it).
 */
export function describeLatestNetWorth({
  market,
  cost,
  units,
  ...rest
}: {
  market: Series;
  cost: Series;
  units: Series;
  currency: string;
  today: string;
  pricePairs: ReadonlyArray<PricePair>;
  managedSources: ReadonlyArray<ManagedSource>;
}): NetWorthValuation | null {
  const latest = throughCurrentMonth(market, rest.today).at(-1);
  if (!latest) return null;
  return describeNetWorthValuation({
    ...rest,
    market: latest.balance,
    cost: balanceOn(cost, latest.date),
    units: balanceOn(units, latest.date),
    date: latest.date,
  });
}

/**
 * Describe one net-worth point, or return null when it holds no commodity:
 * such a point reads the same at cost and at market, so it carries no status.
 *
 * `units` is the point's `units_by_cost` balance. A holding with a cost is
 * valued as `at_value` does it: at the latest price of the commodity in its
 * cost currency on or before the point's date, else at its cost. A price in
 * any other currency, the operating one included, values nothing. A holding
 * without a cost stays in its own units, outside the operating-currency figure.
 */
export function describeNetWorthValuation({
  market,
  cost,
  units,
  currency,
  date,
  today,
  pricePairs,
  managedSources,
}: {
  market: Balance;
  cost: Balance;
  units: Balance;
  currency: string;
  /** The point's own date (`YYYY-MM-DD`), which its prices are read as of. */
  date: string;
  /** Today (`YYYY-MM-DD`), for a point dated after it (an interval end). */
  today: string;
  pricePairs: ReadonlyArray<PricePair>;
  managedSources: ReadonlyArray<ManagedSource>;
}): NetWorthValuation | null {
  const referenceDay = dayNumber(date < today ? date : today);
  const holdings: HeldCommodity[] = [];
  for (const key of Object.keys(units ?? {})) {
    const held = nonZero(units, key);
    const { commodity, costCurrency } = parseHoldingKey(key);
    if (commodity === currency || held === null) continue;
    const unitsExact = exactOf(units?.[key]);
    const holding = {
      currency: commodity,
      costCurrency,
      units: held,
      ...(unitsExact !== null && { unitsExact }),
    };
    if (costCurrency === null) {
      holdings.push({
        ...holding,
        basis: "notInTotal",
        priceDate: null,
        stale: false,
        managed: false,
      });
      continue;
    }
    const dates = priceDatesUpTo(pricePairs, commodity, costCurrency, date);
    const priceDate = dates.at(-1) ?? null;
    const managedSource = managedSources.find(
      (source) =>
        source.commodity !== null &&
        source.quote !== null &&
        pairMatches(source.commodity, source.quote, commodity, costCurrency),
    );
    const priceDay = priceDate === null ? null : dayNumber(priceDate);
    const stale =
      priceDay !== null &&
      referenceDay !== null &&
      isPriceStale({
        ageDays: referenceDay - priceDay,
        managedFreshness: managedSource?.freshness ?? null,
        priceDates: dates,
      });
    holdings.push({
      ...holding,
      basis: priceDate === null ? "cost" : "market",
      priceDate,
      stale,
      managed: managedSource !== undefined,
    });
  }
  holdings.sort(
    (a, b) =>
      compare(a.currency, b.currency) ||
      compare(a.costCurrency ?? "", b.costCurrency ?? ""),
  );
  if (holdings.length === 0) return null;

  const staleDates = holdings
    .filter((holding) => holding.stale && holding.priceDate !== null)
    .map((holding) => holding.priceDate as string)
    .sort();
  const marketValue = toFiniteAmount(market?.[currency]);
  const costBasis = toFiniteAmount(cost?.[currency]);
  const marketExact = exactOf(market?.[currency]);
  const costBasisExact = exactOf(cost?.[currency]);
  return {
    holdings,
    staleSince: staleDates[0] ?? null,
    costBasis,
    unrealized:
      marketValue === null || costBasis === null
        ? null
        : marketValue - costBasis,
    costBasisExact,
    unrealizedExact:
      marketExact === null || costBasisExact === null
        ? null
        : sumDecimalNumbers([marketExact, negateDecimalNumber(costBasisExact)]),
  };
}
