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
 * opening as a zero-gain sale (w1/307, the CLI's w5/1035). A reduction
 * without a price states no proceeds, so it is never a row. Splits and
 * own-account transfers are such reductions, offset in the same transaction
 * by the same commodity coming back in. Any other one — a sale to cash
 * written without `@` — still booked its gain, so it is listed in
 * `unpriced_reductions` by its entry hash rather than dropped (w1/308).
 * FIFO vs specific-lot is the ledger's own booking, already resolved in
 * the posting's cost — except under `"NONE"`, which resolves nothing, so a
 * posting that runs against no lot of its own key reduces the account's
 * net holding at its own cost (w1/323). Proceeds and basis stay in their
 * own currencies, and totals never sum across currencies. The one-year
 * boundary is the acquisition date's anniversary, with no tax logic. No
 * quotes are read, so every figure is exact booked arithmetic; number
 * strings are normalized rather than scale-preserved, as in holdings.
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

/**
 * A lot reduction the rows leave out for want of a price. The CLI names its
 * `file` and `line`; the hosted journal carries neither, so the entry hash
 * stands in — getEntryContext returns the entry's file, line and text.
 */
type UnpricedReduction = {
  date: string;
  entry_hash: string;
  account: string;
  commodity: string;
  acquired: string | null;
  quantity: { number: string; currency: string };
  cost: { number: string; currency: string };
};

export type GainsResult = {
  rows: GainsRow[];
  totals: {
    one_year_or_less: Record<string, string>;
    more_than_one_year: Record<string, string>;
    holding_unknown: Record<string, string>;
  };
  unpriced_reductions: UnpricedReduction[];
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

/** One lot an account holds: its key's parts and its units. */
type HeldLot = {
  currency: string;
  cost: JournalCostPublic;
  number: BigNumber;
  units: BigNumber;
};

/** Whether a posting of `units` shrinks a holding of `held`: a sale from a long one, a cover into a short one. */
function runsAgainst(held: BigNumber, units: BigNumber): boolean {
  return !held.isZero() && held.gt(0) !== units.gt(0);
}

/**
 * The acquisition date of the one held lot a reduction by cost alone
 * names, or null with none or several — `_named_lot_date` for the CLI.
 * That lot is on the other side of the posting, at its cost number and
 * currency, and has its label when the posting names one (w1/323).
 */
function namedLotDate(
  lots: Iterable<HeldLot>,
  currency: string,
  cost: JournalCostPublic,
  number: BigNumber,
  units: BigNumber,
): string | null {
  const dates: string[] = [];
  for (const lot of lots) {
    if (
      lot.currency === currency &&
      runsAgainst(lot.units, units) &&
      lot.number.eq(number) &&
      lot.cost.currency === cost.currency &&
      (cost.label == null || lot.cost.label === cost.label)
    ) {
      dates.push(lot.cost.date);
    }
  }
  return dates.length === 1 && dates[0] !== "" ? dates[0]! : null;
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
  const unpriced: UnpricedReduction[] = [];
  const held = new Map<string, Map<string, HeldLot>>();
  // Each account's net units of a commodity per cost currency. `"NONE"`
  // booking matches no lot: a sale written `{100 USD}` names no lot date
  // (the journal answers `""`), so it runs against no held lot of its own
  // key, only against this net, at the cost the engine balanced it and
  // booked its gain at (w1/323).
  const nets = new Map<string, BigNumber>();
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
      const currency = posting.units.currency;
      const key = lotKey(currency, cost, costNumber);
      let before = lots.get(key)?.units ?? new BigNumber(0);
      // A dateless cost serializes as `""`; the CLI reads it as no date.
      let acquired: string | null = cost.date === "" ? null : cost.date;
      const netKey = JSON.stringify([posting.account, currency, cost.currency]);
      const net = nets.get(netKey) ?? new BigNumber(0);
      nets.set(netKey, net.plus(units));
      const after = before.plus(units);
      if (!runsAgainst(before, units) && runsAgainst(net, units)) {
        acquired = namedLotDate(
          lots.values(),
          currency,
          cost,
          costNumber,
          units,
        );
        before = net;
      }
      if (after.isZero()) lots.delete(key);
      else lots.set(key, { currency, cost, number: costNumber, units: after });
      // An augmentation: opening or adding to a lot, long or short.
      if (!runsAgainst(before, units)) continue;
      if (!reported) continue;
      if (
        account !== undefined &&
        !matchesAccountPattern(account, posting.account, roots)
      ) {
        continue;
      }
      if (!posting.price) {
        if (!offsetInEntry(entry.postings, posting.units.currency, units)) {
          unpriced.push({
            date: entry.date,
            entry_hash: entry.entry_hash,
            account: posting.account,
            commodity: posting.units.currency,
            acquired,
            quantity: {
              number: plain(BigNumber.min(before.abs(), units.abs())),
              currency: posting.units.currency,
            },
            cost: { number: plain(costNumber), currency: cost.currency },
          });
        }
        continue;
      }
      const row = closedLot(posting, cost, acquired, entry.date, before, units);
      if (row !== null) rows.push(row);
    }
  }
  return {
    rows,
    totals: bucketTotals(rows),
    unpriced_reductions: unpriced,
  };
}

/**
 * Whether the transaction takes the reduced commodity back in — a split
 * (the old lot out, the new one in) or an own-account transfer (one
 * account out, another in) — rather than selling it, as
 * `_offset_in_entry` decides for the CLI.
 */
function offsetInEntry(
  postings: readonly JournalPostingPublic[],
  currency: string,
  units: BigNumber,
): boolean {
  return postings.some((other) => {
    const number = decimal(other.units.number);
    return (
      number !== null &&
      other.units.currency === currency &&
      !number.isZero() &&
      number.gt(0) !== units.gt(0)
    );
  });
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
 * What one priced reducing posting closed, or null when its price is in
 * another currency than the cost, whose difference would carry no single
 * currency, or has no number. A sale
 * out of a long lot takes the price as proceeds and the cost as basis; a
 * cover into a short one swaps them, so the opening cost is the proceeds.
 * The quantity is what the lot held, at most: a posting can only close
 * what was there.
 */
function closedLot(
  posting: JournalPostingPublic,
  cost: JournalCostPublic,
  acquired: string | null,
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
