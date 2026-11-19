import BigNumber from "bignumber.js";
import { BadUserInputError } from "@/shared/errors";
import { matchesAccountPattern } from "./account-matcher";
import type {
  JournalCostPublic,
  JournalPostingPublic,
  JournalTransactionPublic,
} from "@/foundation/fava";

/**
 * Realized gain/loss per reduction, mirroring `bea report capital-gains`
 * (`_capital_gains` in `cli/src/bea_engine/report.py`).
 *
 * A reduction is a posting that shrinks a lot its account already holds,
 * in either direction: a sale out of a long lot, or a cover (a payment
 * settling a costed payable) into a short one. Each account's costed
 * inventory is followed from the first transaction, whatever the window,
 * and a row reports only what a priced posting actually closed. Reading
 * negative postings alone dropped every cover and listed each short
 * opening as a zero-gain sale (w1/307, the CLI's w5/1035). Splits and
 * own-account transfers reduce without a price: movements, not sales.
 * FIFO vs specific-lot is the ledger's own booking, already resolved in
 * the posting's cost. Proceeds and basis stay in their own currencies,
 * and totals never sum across currencies. The one-year boundary is the
 * acquisition date's anniversary, with no tax logic. No quotes are read,
 * so every figure is exact booked arithmetic; number strings are
 * normalized rather than scale-preserved, as in holdings.
 */

type GainsRow = {
  account: string;
  commodity: string;
  acquired: string | null;
  sold: string;
  held_days: number | null;
  long_held: boolean | null;
  quantity: { number: string; currency: string };
  proceeds: { number: string; currency: string };
  basis: { number: string; currency: string };
  gain: { number: string; currency: string };
};

export type GainsResult = {
  rows: GainsRow[];
  totals: {
    one_year_or_less: Record<string, string>;
    more_than_one_year: Record<string, string>;
    holding_unknown: Record<string, string>;
  };
};

/** Strict `YYYY-MM-DD`, valid calendar date — `date.fromisoformat`. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseBound(value: string, name: "from-date" | "to-date"): string {
  const match = ISO_DATE.exec(value);
  // The round trip rejects rollovers (`2024-13-01`, `2024-02-30`):
  // `Date.UTC` never yields NaN for four/two/two-digit inputs.
  const valid =
    match !== null &&
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
      .toISOString()
      .slice(0, 10) === value;
  if (!valid) {
    throw new BadUserInputError(`Invalid ${name} '${value}'. Use YYYY-MM-DD.`);
  }
  return value;
}

/**
 * Inclusive sale-date bounds; malformed input is refused, as is a
 * from-date after the to-date — `_date_bounds` verbatim.
 */
export function resolveGainsBounds(
  fromDate: string | undefined,
  toDate: string | undefined,
): { start: string | null; end: string | null } {
  const start =
    fromDate === undefined ? null : parseBound(fromDate, "from-date");
  const end = toDate === undefined ? null : parseBound(toDate, "to-date");
  if (start !== null && end !== null && start > end) {
    throw new BadUserInputError(
      `from-date '${fromDate}' is after to-date '${toDate}'.`,
    );
  }
  return { start, end };
}

/** Whole days between two ISO dates — `(sold - acquired).days`. */
function heldDays(acquired: string, sold: string): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round(
    Date.parse(`${sold}T00:00:00Z`) / day -
      Date.parse(`${acquired}T00:00:00Z`) / day,
  );
}

/**
 * "More than one year" by calendar date, not `held > 365`: a year that
 * spans 29 February has 366 days, so a lot held exactly one year passed
 * the day count (w1/249). ISO dates compare as strings, and 29 February
 * plus a year is the nonexistent `YYYY-02-29`, which sorts as 28 February.
 */
function heldLong(acquired: string, sold: string): boolean {
  const year = String(Number(acquired.slice(0, 4)) + 1).padStart(4, "0");
  const anniversary = `${year}${acquired.slice(4)}`;
  return sold > anniversary;
}

/** Plain decimal notation: `toString()` may answer `1e-7` at the extremes. */
function plain(value: BigNumber): string {
  const text = value.toString();
  return /[eE]/.test(text) ? value.toFixed() : text;
}

/** A number from the journal, or null when it is not one (an unresolved cost). */
function decimal(text: string | undefined | null): BigNumber | null {
  if (text === undefined || text === null || text === "") return null;
  const value = new BigNumber(text);
  return value.isFinite() ? value : null;
}

/**
 * Beancount's inventory key, `(units.currency, Cost)`: `100` and `100.00`
 * are one lot, as `Decimal` equality makes them.
 */
function lotKey(currency: string, cost: JournalCostPublic, number: BigNumber) {
  return JSON.stringify([
    currency,
    number.toFixed(),
    cost.currency,
    cost.date,
    cost.label ?? null,
  ]);
}

/**
 * Closed lots, oldest sale first. `transactions` is the whole journal,
 * newest-first, and is read back to front so every lot is known before
 * it is reduced. `window` holds the entry hashes the `time` filter keeps,
 * or null without one; like `start`/`end` and `account`, it narrows the
 * rows and never the inventory.
 */
export function composeGains(params: {
  transactions: readonly JournalTransactionPublic[];
  window: ReadonlySet<string> | null;
  account: string | undefined;
  roots: readonly string[];
  start: string | null;
  end: string | null;
}): GainsResult {
  const { transactions, window, account, roots, start, end } = params;
  const rows: GainsRow[] = [];
  const held = new Map<string, Map<string, BigNumber>>();
  for (const entry of [...transactions].reverse()) {
    // The engine could not book it, so no lot moved (the journal lists it
    // only so it can be fixed).
    if (entry.not_booked === true) continue;
    const reported =
      (window === null || window.has(entry.entry_hash)) &&
      (start === null || entry.date >= start) &&
      (end === null || entry.date <= end);
    for (const posting of entry.postings) {
      const units = decimal(posting.units.number);
      const cost = posting.cost;
      const costNumber = decimal(cost?.number);
      if (units === null || !cost || costNumber === null) continue;
      let lots = held.get(posting.account);
      if (lots === undefined) {
        lots = new Map();
        held.set(posting.account, lots);
      }
      const key = lotKey(posting.units.currency, cost, costNumber);
      const before = lots.get(key) ?? new BigNumber(0);
      const after = before.plus(units);
      if (after.isZero()) lots.delete(key);
      else lots.set(key, after);
      // An augmentation: opening or adding to a lot, long or short.
      if (before.isZero() || before.gt(0) === units.gt(0)) {
        continue;
      }
      if (!reported) continue;
      if (
        account !== undefined &&
        !matchesAccountPattern(account, posting.account, roots)
      ) {
        continue;
      }
      const row = closedLot(posting, cost, entry.date, before, units);
      if (row !== null) rows.push(row);
    }
  }
  return { rows, totals: bucketTotals(rows) };
}

/** Gains per currency, bucketed by holding period. */
function bucketTotals(rows: readonly GainsRow[]): GainsResult["totals"] {
  const totals = {
    one_year_or_less: new Map<string, BigNumber>(),
    more_than_one_year: new Map<string, BigNumber>(),
    holding_unknown: new Map<string, BigNumber>(),
  };
  for (const row of rows) {
    const bucket =
      row.long_held === null
        ? totals.holding_unknown
        : row.long_held
          ? totals.more_than_one_year
          : totals.one_year_or_less;
    const currency = row.gain.currency;
    bucket.set(
      currency,
      (bucket.get(currency) ?? new BigNumber(0)).plus(row.gain.number),
    );
  }
  const summed = (bucket: Map<string, BigNumber>): Record<string, string> =>
    Object.fromEntries(
      [...bucket.entries()].map(([code, value]) => [code, plain(value)]),
    );
  return {
    one_year_or_less: summed(totals.one_year_or_less),
    more_than_one_year: summed(totals.more_than_one_year),
    holding_unknown: summed(totals.holding_unknown),
  };
}

/**
 * What one reducing posting closed, or null when it is no sale: no price
 * (a split or an own-account transfer), or a price in another currency
 * than the cost, whose difference would carry no single currency. A sale
 * out of a long lot takes the price as proceeds and the cost as basis; a
 * cover into a short one swaps them, so the opening cost is the proceeds.
 * The quantity is what the lot held, at most: a posting can only close
 * what was there.
 */
function closedLot(
  posting: JournalPostingPublic,
  cost: JournalCostPublic,
  sold: string,
  before: BigNumber,
  units: BigNumber,
): GainsRow | null {
  const price = posting.price;
  const priceNumber = decimal(price?.number);
  if (!price || priceNumber === null) return null;
  if (price.currency !== cost.currency) return null;
  const quantity = BigNumber.min(before.abs(), units.abs());
  const atPrice = quantity.times(priceNumber);
  const atCost = quantity.times(cost.number);
  const [proceeds, basis] = before.gt(0)
    ? [atPrice, atCost]
    : [atCost, atPrice];
  // A dateless cost serializes as `""`; the CLI reads it as no date.
  const acquired: string | null = cost.date === "" ? null : cost.date;
  return {
    account: posting.account,
    commodity: posting.units.currency,
    acquired,
    sold,
    held_days: acquired === null ? null : heldDays(acquired, sold),
    long_held: acquired === null ? null : heldLong(acquired, sold),
    quantity: { number: plain(quantity), currency: posting.units.currency },
    proceeds: { number: plain(proceeds), currency: cost.currency },
    basis: { number: plain(basis), currency: cost.currency },
    gain: { number: plain(proceeds.minus(basis)), currency: cost.currency },
  };
}
