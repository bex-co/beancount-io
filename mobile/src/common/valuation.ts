/**
 * What a balance valued at market says about itself (w4/m26).
 *
 * Balances read `at_value` (see `VALUATION_CONVERSION`). The ledger values a
 * lot held at cost at the latest price on or before the figure's date, quoted
 * in its cost currency; at its cost when there is no such price; and leaves a
 * lot with no cost in its units. The market figure alone cannot say which of
 * those happened, so this reads it back from the same balance in `units` and
 * the ledger's price dates:
 *
 * - a held commodity the market read converted away had a cost (`at_cost`
 *   converts exactly the same lots, so either read tells them apart). It is
 *   priced when the ledger has a price for it against the operating currency,
 *   in either direction, on or before the figure's date, and valued at cost
 *   otherwise;
 * - a held commodity the market read left in its units had no cost, and the
 *   operating-currency total cannot include it (m11's "not in total").
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
import { operatingKey, resolveCurrencyBalance } from "./balance-util";
import {
  amountIn,
  holdingsOf,
  notInTotalNotes,
  notInTotalOf,
  type BalanceDisplay,
  type BalanceMap,
  type Holding,
  type Translate,
  type ValueBasis,
} from "./balance-display";
import { formatLedgerDateShort } from "./date-format";
import { formatSignedMoneyWithCurrency } from "./number-utils";

/**
 * One commodity pair's price history, as `getLedgerCommodities` returns it.
 * Only the dates matter here.
 */
export type PricePair = {
  base: string;
  quote: string;
  prices: ReadonlyArray<{ date: string }>;
};

/**
 * A managed price source as `getLedgerManagedPrices` reports it. Only the
 * fields staleness reads.
 */
export type ManagedSource = {
  commodity: string | null;
  quote: string | null;
  freshness: string;
};

/** Floor on a ledger-authored price's staleness threshold, in days. */
const STALE_FLOOR_DAYS = 7;
/** A managed feed older than this many days is behind, weekends included. */
const MANAGED_STALE_DAYS = 3;
/** Cadence assumed for a commodity with too few prices to measure one. */
const DEFAULT_CADENCE_DAYS = 7;
/** Price points a cadence is measured over. */
const CADENCE_WINDOW = 10;

function pairMatches(pair: PricePair, commodity: string, currency: string) {
  return (
    (pair.base === commodity && pair.quote === currency) ||
    (pair.base === currency && pair.quote === commodity)
  );
}

/**
 * The distinct dates of every price for `commodity` against `currency`, in
 * either direction, on or before `onOrBefore` (any date when omitted),
 * ascending.
 */
function priceDates(
  pairs: readonly PricePair[],
  commodity: string,
  currency: string,
  onOrBefore?: string,
): string[] {
  const dates = new Set<string>();
  for (const pair of pairs) {
    if (!pairMatches(pair, commodity, currency)) continue;
    for (const { date } of pair.prices) {
      if (onOrBefore === undefined || date <= onOrBefore) dates.add(date);
    }
  }
  return [...dates].sort();
}

/**
 * The date of the latest price for `commodity` against `currency`, in either
 * direction, on or before `onOrBefore` — any date when omitted, as the account
 * tree values at the latest price. Null when there is none, which is exactly
 * when `at_value` falls back to cost.
 */
export function latestPriceDate(
  pairs: readonly PricePair[],
  commodity: string,
  currency: string,
  onOrBefore?: string,
): string | null {
  return priceDates(pairs, commodity, currency, onOrBefore).at(-1) ?? null;
}

/**
 * The basis `at_value` read one commodity at, or null when the ledger's prices
 * are unknown. For a single commodity's row, where the value is the figure.
 */
export function valueBasisOf(
  prices: readonly PricePair[] | undefined,
  currency: string,
  onOrBefore?: string,
): (commodity: string) => ValueBasis | null {
  return (commodity) =>
    prices === undefined
      ? null
      : latestPriceDate(prices, commodity, currency, onOrBefore) === null
        ? "cost"
        : "market";
}

/** Whole days from one ISO date to another; negative when `to` is earlier. */
function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((utc(to) - utc(from)) / 86400000);
}

/**
 * How often the ledger prices a commodity, in days: the median gap between
 * its last `CADENCE_WINDOW` price dates, or `DEFAULT_CADENCE_DAYS` with fewer
 * than three points to measure.
 */
export function priceCadenceDays(dates: readonly string[]): number {
  const recent = dates.slice(-CADENCE_WINDOW);
  if (recent.length < 3) return DEFAULT_CADENCE_DAYS;
  const gaps = recent
    .slice(1)
    .map((date, index) => daysBetween(recent[index], date))
    .sort((a, b) => a - b);
  const middle = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 1
    ? gaps[middle]
    : (gaps[middle - 1] + gaps[middle]) / 2;
}

/**
 * Whether one holding's price is behind, judged by how that holding is
 * normally priced (w4/m27 rule 3): a managed feed after `MANAGED_STALE_DAYS`,
 * or once it reports `unavailable` a day on; a ledger-authored price after
 * three of its usual gaps, never sooner than `STALE_FLOOR_DAYS`.
 */
export function isPriceStale({
  age,
  managed,
  dates,
}: {
  /** Whole days from the price's date to the figure's date or today. */
  age: number;
  managed: ManagedSource | null;
  /** The commodity's price dates up to the one in use, ascending. */
  dates: readonly string[];
}): boolean {
  if (managed !== null) {
    return (
      age > MANAGED_STALE_DAYS ||
      (managed.freshness === "unavailable" && age >= 1)
    );
  }
  return age > Math.max(STALE_FLOOR_DAYS, 3 * priceCadenceDays(dates));
}

/** A held commodity valued at a market price, with that price's date. */
export type PricedHolding = Holding & {
  priceDate: string;
  /** The price is behind how this holding is normally priced. */
  stale: boolean;
  /** The price comes from a managed feed rather than the ledger. */
  managed: boolean;
};

export type Valuation = {
  /** The total in the operating currency: priced holdings at market, the rest at cost. */
  market: number;
  /** The same total at cost; null when the cost read is unavailable. */
  cost: number | null;
  /** `market − cost`; null when the cost is unknown. */
  unrealized: number | null;
  /** Held commodities valued at a market price, each with its own date and staleness. */
  priced: PricedHolding[];
  /** Held commodities with a cost but no price, valued at that cost. */
  atCostNoPrice: Holding[];
  /** Holdings the operating-currency total cannot express. */
  notInTotal: Holding[];
  /**
   * Whether the total values a held commodity at all, at market or at cost.
   * False when the units read is unavailable: a basis that cannot be told is
   * not claimed.
   */
  valuesHoldings: boolean;
};

/**
 * Everything a total valued at market discloses, from its `at_value` balance
 * map and the same balance `at_cost` and in `units`. `date` is the figure's
 * own date — the valuation date its prices were read at — and is omitted for
 * the account tree, which values at the latest price. `cost`, `units`,
 * `prices` and `managed` are undefined while their reads are unavailable.
 */
export function selectValuation({
  market,
  cost,
  units,
  currency,
  date,
  today,
  prices,
  managed,
}: {
  market: BalanceMap;
  cost?: BalanceMap;
  units: BalanceMap;
  currency: string;
  date?: string;
  today: string;
  prices: readonly PricePair[] | undefined;
  managed?: readonly ManagedSource[];
}): Valuation {
  const marketValue = resolveCurrencyBalance(market, currency);
  const costValue =
    cost == null ? null : resolveCurrencyBalance(cost, currency);
  const key = operatingKey(market, currency);
  const converted = holdingsOf(units).filter(
    (holding) =>
      holding.currency !== currency &&
      holding.currency !== key &&
      amountIn(market, holding.currency).number === 0,
  );
  const reference = date !== undefined && date < today ? date : today;

  const priced: PricedHolding[] = [];
  const atCostNoPrice: Holding[] = [];
  if (prices !== undefined) {
    for (const holding of converted) {
      const dates = priceDates(prices, holding.currency, currency, date);
      const priceDate = dates.at(-1);
      if (priceDate === undefined) {
        atCostNoPrice.push(holding);
        continue;
      }
      const source =
        managed?.find(
          (entry) =>
            (entry.commodity === holding.currency &&
              entry.quote === currency) ||
            (entry.commodity === currency && entry.quote === holding.currency),
        ) ?? null;
      priced.push({
        ...holding,
        priceDate,
        managed: source !== null,
        stale: isPriceStale({
          age: daysBetween(priceDate, reference),
          managed: source,
          dates,
        }),
      });
    }
  }

  return {
    market: marketValue,
    cost: costValue,
    unrealized: costValue === null ? null : marketValue - costValue,
    priced,
    atCostNoPrice,
    notInTotal: notInTotalOf(market, currency),
    valuesHoldings: converted.length > 0,
  };
}

/** The priced holdings whose price is behind, oldest price first. */
export function stalePrices(valuation: Valuation): PricedHolding[] {
  return valuation.priced
    .filter((holding) => holding.stale)
    .sort((a, b) => a.priceDate.localeCompare(b.priceDate));
}

/**
 * The one status line a valued total carries (w4/m27 rule 1): its basis, then
 * only what needs attention — prices not updated since their oldest date,
 * holdings still at cost, holdings left out — as counts. The holdings behind
 * the counts live in the detail sheet. No line for a total that values no
 * holding and leaves none out: a cash balance has nothing to state.
 */
export function valuationStatus(
  valuation: Valuation,
  t: Translate,
  locale: string,
): string | null {
  const parts: string[] = [];
  if (valuation.valuesHoldings) {
    parts.push(t("atMarketValue"));
    const stale = stalePrices(valuation);
    if (stale.length > 0) {
      parts.push(
        t("pricesNotUpdatedSince", {
          count: stale.length,
          date: formatLedgerDateShort(stale[0].priceDate, locale),
        }),
      );
    }
    if (valuation.atCostNoPrice.length > 0) {
      parts.push(
        t("atCostNoPriceCount", { count: valuation.atCostNoPrice.length }),
      );
    }
  }
  if (valuation.notInTotal.length > 0) {
    parts.push(t("notInTotalCount", { count: valuation.notInTotal.length }));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * The notes that say what a valued total is, for callers that list notes: the
 * status line when there is one.
 */
export function valuationNotes(
  valuation: Valuation,
  t: Translate,
  locale: string,
): string[] {
  const status = valuationStatus(valuation, t, locale);
  return status === null ? [] : [status];
}

/**
 * The cost basis beside a market total — "Cost $106,826.05 · Unrealized
 * +$10,823.44" — or null when the two agree to the cent or the cost is
 * unknown.
 */
export function costBasisLine(
  valuation: Valuation,
  currency: string,
  t: Translate,
): string | null {
  const { cost, unrealized } = valuation;
  if (cost === null || unrealized === null || Math.abs(unrealized) < 0.005) {
    return null;
  }
  return t("costBasisLine", {
    cost: formatSignedMoneyWithCurrency(cost, currency),
    gain: formatSignedMoneyWithCurrency(unrealized, currency, true),
  });
}

/**
 * The notes that say what a balance figure is. A commodity's figure says what
 * it is worth and at which basis; a total carries its valuation when the
 * caller attached one, and otherwise names the holdings it leaves out. A row
 * shows them as lines under the figure; a chart joins them into its caption.
 */
export function balanceNotes(
  display: BalanceDisplay,
  currency: string,
  t: Translate,
  locale: string,
): string[] {
  if (display.kind === "money") {
    return display.valuation
      ? valuationNotes(display.valuation, t, locale)
      : notInTotalNotes(display.notInTotal, t);
  }
  const { value } = display;
  if (value === null || value.basis === null) return [];
  return [
    t(value.basis === "market" ? "atMarket" : "atCost", {
      amount: formatSignedMoneyWithCurrency(value.amount, currency),
    }),
  ];
}
