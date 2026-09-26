import { toFiniteAmount } from "./unit-amounts";

/**
 * What a Net Worth valued at market has to say about itself (w4/m26, w4/m27).
 *
 * The balance modules read `at_value`, which the ledger service computes lot by
 * lot: a lot held at cost is worth units × the latest price on or before the
 * figure's date in its cost currency, or its cost when there is no such price;
 * a lot with no cost stays in its own units. The figure alone cannot tell a
 * reader which of those happened, so this reads two more views of the same
 * point — the `at_cost` balance and the raw `units` — plus the ledger's price
 * dates and managed price sources, and describes every held commodity.
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

/** A held commodity and how the figure values it. */
export type HeldCommodity = {
  currency: string;
  units: number;
  /**
   * `market` — valued at a price, `cost` — held at cost with no price,
   * `notInTotal` — no cost and no price, so left out of the figure.
   */
  basis: "market" | "cost" | "notInTotal";
  /** Latest price date on or before the figure's date; null without one. */
  priceDate: string | null;
  /** Whether that price is older than this holding's own threshold. */
  stale: boolean;
  /** Priced by a managed Beancount.io feed rather than the ledger itself. */
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
};

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
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_MS;
}

function nonZero(balance: Balance, currency: string): number | null {
  const value = toFiniteAmount(balance?.[currency]);
  return value === null || value === 0 ? null : value;
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
  const latest = market.at(-1);
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
 * A commodity counts as held at cost when the `units` balance holds it and the
 * `at_cost` balance does not (valuing at cost converted it away). One the
 * `at_cost` balance still shows under its own key has no cost, so without a
 * price it stays out of the operating-currency figure.
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
  for (const commodity of Object.keys(units ?? {}).sort()) {
    const held = nonZero(units, commodity);
    if (commodity === currency || held === null) continue;
    const hasCost = nonZero(cost, commodity) === null;
    const dates = priceDatesUpTo(pricePairs, commodity, currency, date);
    const priceDate = dates.at(-1) ?? null;
    const managedSource = managedSources.find(
      (source) =>
        source.commodity !== null &&
        source.quote !== null &&
        pairMatches(source.commodity, source.quote, commodity, currency),
    );
    const priceDay = priceDate === null ? null : dayNumber(priceDate);
    const stale =
      hasCost &&
      priceDay !== null &&
      referenceDay !== null &&
      isPriceStale({
        ageDays: referenceDay - priceDay,
        managedFreshness: managedSource?.freshness ?? null,
        priceDates: dates,
      });
    holdings.push({
      currency: commodity,
      units: held,
      basis: !hasCost
        ? nonZero(market, commodity) === null
          ? "market"
          : "notInTotal"
        : priceDate === null
          ? "cost"
          : "market",
      priceDate,
      stale,
      managed: managedSource !== undefined,
    });
  }
  if (holdings.length === 0) return null;

  const staleDates = holdings
    .filter((holding) => holding.stale && holding.priceDate !== null)
    .map((holding) => holding.priceDate as string)
    .sort();
  const marketValue = toFiniteAmount(market?.[currency]);
  const costBasis = toFiniteAmount(cost?.[currency]);
  return {
    holdings,
    staleSince: staleDates[0] ?? null,
    costBasis,
    unrealized:
      marketValue === null || costBasis === null
        ? null
        : marketValue - costBasis,
  };
}
