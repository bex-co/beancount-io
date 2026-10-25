import BigNumber from "bignumber.js";
import { BadUserInputError } from "@/shared/errors";
import { matchesAccountPattern } from "./account-matcher";
import type {
  JournalPostingPublic,
  JournalTransactionPublic,
} from "@/foundation/fava";

/**
 * Realized gain/loss per closed lot, mirroring `bea report capital-gains`
 * (`cli/src/bea_engine/report.py`).
 *
 * A closed lot is a reducing posting that carries both booked cost and
 * price — FIFO vs specific-lot is the ledger's own booking, already
 * resolved in the posting's cost. Proceeds and basis stay in their own
 * currencies, and totals never sum across currencies. The one-year
 * boundary is a bare day count with no tax logic. No quotes are read,
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

function parseBound(
  value: string,
  name: "from-date" | "to-date",
): string {
  const match = ISO_DATE.exec(value);
  const valid =
    match !== null &&
    Number.isInteger(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    ) &&
    new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    )
      .toISOString()
      .slice(0, 10) === value;
  if (!valid) {
    throw new BadUserInputError(
      `Invalid ${name} '${value}'. Use YYYY-MM-DD.`,
    );
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
  const start = fromDate === undefined ? null : parseBound(fromDate, "from-date");
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
  return Math.round(Date.parse(`${sold}T00:00:00Z`) / day - Date.parse(`${acquired}T00:00:00Z`) / day);
}

/** Plain decimal notation: `toString()` may answer `1e-7` at the extremes. */
function plain(value: BigNumber): string {
  const text = value.toString();
  return /[eE]/.test(text) ? value.toFixed() : text;
}

/**
 * Closed lots, oldest sale first. `transactions` arrive newest-first
 * from the journal and are read back to front; each reducing posting
 * with booked cost and price closes one lot.
 */
export function composeGains(params: {
  transactions: readonly JournalTransactionPublic[];
  account: string | undefined;
  roots: readonly string[];
  start: string | null;
  end: string | null;
}): GainsResult {
  const { transactions, account, roots, start, end } = params;
  const rows: GainsRow[] = [];
  const totals = {
    one_year_or_less: new Map<string, BigNumber>(),
    more_than_one_year: new Map<string, BigNumber>(),
    holding_unknown: new Map<string, BigNumber>(),
  };
  const ordered = [...transactions].reverse();
  for (const entry of ordered) {
    if (start !== null && entry.date < start) continue;
    if (end !== null && entry.date > end) continue;
    for (const posting of entry.postings) {
      const row = closedLot(posting, entry.date, account, roots);
      if (row === null) continue;
      rows.push(row);
      const bucket =
        row.held_days === null
          ? totals.holding_unknown
          : row.held_days > 365
            ? totals.more_than_one_year
            : totals.one_year_or_less;
      const currency = row.gain.currency;
      bucket.set(
        currency,
        (bucket.get(currency) ?? new BigNumber(0)).plus(row.gain.number),
      );
    }
  }
  const summed = (
    bucket: Map<string, BigNumber>,
  ): Record<string, string> =>
    Object.fromEntries(
      [...bucket.entries()].map(([code, value]) => [code, plain(value)]),
    );
  return {
    rows,
    totals: {
      one_year_or_less: summed(totals.one_year_or_less),
      more_than_one_year: summed(totals.more_than_one_year),
      holding_unknown: summed(totals.holding_unknown),
    },
  };
}

/**
 * One posting's closed lot, or null when the posting is not a booked
 * sale: non-negative units, unresolved cost, or no price. Cost and
 * price currencies always match — the loader refuses a mixed posting
 * before any report sees it — so the gain carries the cost currency.
 */
function closedLot(
  posting: JournalPostingPublic,
  sold: string,
  account: string | undefined,
  roots: readonly string[],
): GainsRow | null {
  const units = posting.units;
  const cost = posting.cost;
  const price = posting.price;
  let quantity: BigNumber;
  try {
    quantity = new BigNumber(units.number);
  } catch {
    return null;
  }
  if (!quantity.isNegative()) return null;
  if (cost === undefined || cost === null) return null;
  if (price === undefined || price === null) return null;
  let costNumber: BigNumber;
  let priceNumber: BigNumber;
  try {
    costNumber = new BigNumber(cost.number);
    priceNumber = new BigNumber(price.number);
  } catch {
    return null;
  }
  if (account !== undefined && !matchesAccountPattern(account, posting.account, roots)) {
    return null;
  }
  const bought = quantity.negated();
  const proceeds = bought.times(priceNumber);
  const basis = bought.times(costNumber);
  // A dateless cost serializes as `""`; the CLI reads it as no date.
  const acquired: string | null = cost.date === "" ? null : cost.date;
  const held = acquired === null ? null : heldDays(acquired, sold);
  return {
    account: posting.account,
    commodity: units.currency,
    acquired,
    sold,
    held_days: held,
    long_held: held === null ? null : held > 365,
    quantity: { number: plain(bought), currency: units.currency },
    proceeds: { number: plain(proceeds), currency: price.currency },
    basis: { number: plain(basis), currency: cost.currency },
    gain: { number: plain(proceeds.minus(basis)), currency: cost.currency },
  };
}
