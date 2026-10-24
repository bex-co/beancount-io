/**
 * Per-payee merchant stats from fixed `queryShell` statements: overall
 * count/first/last, plus per-currency totals (never cross-currency summed).
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */

import { bqlPayeeEquals } from "./escape-bql-string";
import {
  asCount,
  asNumber,
  asString,
  columnIndex,
  moneyRootsBqlFilter,
  type QueryResultTableLike,
} from "../../merchants-screen/selectors/bql-table";

export interface MerchantCurrencyTotal {
  currency: string;
  total: number;
}

export interface MerchantStats {
  /** Entries on or before today: paid, not pre-entered (w21/796). */
  transactionCount: number;
  firstDate: string;
  /** The last entry, a scheduled one included, for the date range. */
  lastDate: string;
  /** One row per currency; empty when the payee has no Expenses/Income legs. */
  totalsByCurrency: MerchantCurrencyTotal[];
  /** What entries dated after today add, per currency, shown on its own. */
  scheduledTotalsByCurrency: MerchantCurrencyTotal[];
}

/**
 * Which of a merchant's entries a statement reads: those on or before a day,
 * or those after it. The header counted and totalled pre-entered payments as
 * paid, "4 transactions · $6,000.00" when $4,500.00 had been (w21/796).
 */
export type MerchantSpan = { through: string } | { after: string };

function spanFilter(span: MerchantSpan | undefined): string {
  if (span === undefined) return "";
  const day = "through" in span ? span.through : span.after;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return "through" in span ? ` AND date <= ${day}` : ` AND date > ${day}`;
}

/**
 * Overall transaction count and date span for one payee. Count over `#entries`
 * so multi-posting transactions are not overstated (posting-default `count(*)`
 * matched the Merchants directory bug).
 */
export function buildMerchantMetaBql(
  payees: string | readonly string[],
  span?: MerchantSpan,
): string {
  return (
    "SELECT count(*) as transaction_count, " +
    "min(date) as first_date, max(date) as last_date " +
    `FROM #entries WHERE ${anyPayee(payees)}${spanFilter(span)}`
  );
}

/**
 * A predicate matching any of a merchant's spellings exactly. The directory
 * merges case variants into one row, so its detail must count all of them
 * (w21/046); one spelling keeps the plain comparison.
 */
function anyPayee(payees: string | readonly string[]): string {
  const list = typeof payees === "string" ? [payees] : payees;
  return list.length === 1
    ? bqlPayeeEquals(list[0]!)
    : `(${list.map(bqlPayeeEquals).join(" OR ")})`;
}

/**
 * Per-currency signed totals from Expenses/Income legs only — balance-sheet
 * counterparts would cancel. Never summed across currencies by the selector.
 */
export function buildMerchantCurrencyTotalsBql(
  payees: string | readonly string[],
  roots?: { expenses?: string; income?: string },
  span?: MerchantSpan,
): string {
  return (
    "SELECT currency, sum(number) as total " +
    `WHERE ${anyPayee(payees)} ` +
    `AND ${moneyRootsBqlFilter(roots)}${spanFilter(span)} ` +
    "GROUP BY currency ORDER BY currency"
  );
}

/**
 * The same legs' totals by weight: each in the currency it was priced in. A
 * card lunch of 100.00 EUR @ 1.10 USD weighs 110.00 USD, the amount its row
 * shows, so a merchant paid in euros by a dollar card read "€150.00" over rows
 * of −$110.00 and −$55.00 (w21/725). Same columns as the totals statement.
 */
export function buildMerchantWeightTotalsBql(
  payees: string | readonly string[],
  roots?: { expenses?: string; income?: string },
  span?: MerchantSpan,
): string {
  return (
    "SELECT currency(weight) as currency, sum(number(weight)) as total " +
    `WHERE ${anyPayee(payees)} ` +
    `AND ${moneyRootsBqlFilter(roots)}${spanFilter(span)} ` +
    "GROUP BY currency(weight)"
  );
}

/**
 * The weight totals worth a line of their own: none when they say what the
 * totals already do (no leg was priced into another currency), else all of
 * them, by currency.
 */
export function pricedTotals(
  totals: readonly MerchantCurrencyTotal[],
  weights: readonly MerchantCurrencyTotal[],
): MerchantCurrencyTotal[] {
  const same =
    weights.length === totals.length &&
    weights.every((weight) =>
      totals.some(
        (total) =>
          total.currency === weight.currency &&
          Math.abs(total.total - weight.total) < 1e-9,
      ),
    );
  return same
    ? []
    : [...weights].sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Map the meta (count/first/last) table — soft-fail to null. */
export function mapMerchantMeta(
  table: QueryResultTableLike | null | undefined,
): Pick<MerchantStats, "transactionCount" | "firstDate" | "lastDate"> | null {
  if (!table?.types || !table.rows?.length) {
    return null;
  }
  const countIdx = columnIndex(table.types, "transaction_count");
  const firstIdx = columnIndex(table.types, "first_date");
  const lastIdx = columnIndex(table.types, "last_date");
  if (countIdx < 0 || firstIdx < 0 || lastIdx < 0) {
    return null;
  }
  const row = table.rows[0];
  if (!Array.isArray(row)) {
    return null;
  }
  const transactionCount = asCount(row[countIdx]);
  if (transactionCount === null) {
    return null;
  }
  return {
    transactionCount,
    firstDate: asString(row[firstIdx]) ?? "",
    lastDate: asString(row[lastIdx]) ?? "",
  };
}

/** Map per-currency total rows — soft-fail to []. */
export function mapMerchantCurrencyTotals(
  table: QueryResultTableLike | null | undefined,
): MerchantCurrencyTotal[] {
  if (!table?.types || !table.rows) {
    return [];
  }
  const currencyIdx = columnIndex(table.types, "currency");
  const totalIdx = columnIndex(table.types, "total");
  if (currencyIdx < 0 || totalIdx < 0) {
    return [];
  }
  const out: MerchantCurrencyTotal[] = [];
  for (const row of table.rows) {
    if (!Array.isArray(row)) {
      continue;
    }
    const currency = asString(row[currencyIdx]);
    const total = asNumber(row[totalIdx]);
    if (!currency || total === null) {
      continue;
    }
    out.push({ currency, total });
  }
  out.sort((a, b) => a.currency.localeCompare(b.currency));
  return out;
}

type MerchantMeta = Pick<
  MerchantStats,
  "transactionCount" | "firstDate" | "lastDate"
>;

/**
 * The header's stats from the entries on or before today (`meta`, `totals`)
 * and those after it (`scheduled`): the count and totals are what was paid,
 * the date range runs to the last scheduled entry, and the scheduled totals
 * are kept apart (w21/796).
 */
export function composeMerchantStats(
  meta: MerchantMeta | null,
  totalsByCurrency: MerchantCurrencyTotal[],
  scheduled: {
    meta: MerchantMeta | null;
    totals: MerchantCurrencyTotal[];
  } = { meta: null, totals: [] },
): MerchantStats | null {
  if (!meta) {
    return null;
  }
  return {
    transactionCount: meta.transactionCount,
    firstDate: meta.firstDate || scheduled.meta?.firstDate || "",
    lastDate: scheduled.meta?.lastDate || meta.lastDate,
    totalsByCurrency,
    scheduledTotalsByCurrency: scheduled.totals.filter(
      (row) => row.total !== 0,
    ),
  };
}

/**
 * The same three reads without a date in their text, one row per day, split at
 * today on the client. A statement carrying `date <= today` changes its text,
 * hence its cache key, every day, so a merchant opened offline the day after it
 * was last viewed missed the persisted cache and showed "Couldn't load" over
 * its cached rows (w21/918).
 */
export function buildMerchantDailyMetaBql(
  payees: string | readonly string[],
): string {
  return (
    "SELECT date, count(*) as transaction_count " +
    `FROM #entries WHERE ${anyPayee(payees)} GROUP BY date ORDER BY date`
  );
}

export function buildMerchantDailyTotalsBql(
  payees: string | readonly string[],
  roots?: { expenses?: string; income?: string },
): string {
  return (
    "SELECT date, currency, sum(number) as total " +
    `WHERE ${anyPayee(payees)} AND ${moneyRootsBqlFilter(roots)} ` +
    "GROUP BY date, currency ORDER BY date, currency"
  );
}

export function buildMerchantDailyWeightsBql(
  payees: string | readonly string[],
  roots?: { expenses?: string; income?: string },
): string {
  return (
    "SELECT date, currency(weight) as currency, sum(number(weight)) as total " +
    `WHERE ${anyPayee(payees)} AND ${moneyRootsBqlFilter(roots)} ` +
    "GROUP BY date, currency(weight)"
  );
}

/** Day rows of the count statement: soft-fail to null, [] for no entries. */
export function mapMerchantDailyMeta(
  table: QueryResultTableLike | null | undefined,
): { date: string; count: number }[] | null {
  if (!table?.types || !table.rows) return null;
  const dateIdx = columnIndex(table.types, "date");
  const countIdx = columnIndex(table.types, "transaction_count");
  if (dateIdx < 0 || countIdx < 0) return null;
  const days: { date: string; count: number }[] = [];
  for (const row of table.rows) {
    if (!Array.isArray(row)) continue;
    const date = asString(row[dateIdx]);
    const count = asCount(row[countIdx]);
    if (date && count !== null) days.push({ date, count });
  }
  return days;
}

/** Day rows of a totals or weights statement: soft-fail to []. */
export function mapMerchantDailyTotals(
  table: QueryResultTableLike | null | undefined,
): { date: string; currency: string; total: number }[] {
  if (!table?.types || !table.rows) return [];
  const dateIdx = columnIndex(table.types, "date");
  const currencyIdx = columnIndex(table.types, "currency");
  const totalIdx = columnIndex(table.types, "total");
  if (dateIdx < 0 || currencyIdx < 0 || totalIdx < 0) return [];
  const days: { date: string; currency: string; total: number }[] = [];
  for (const row of table.rows) {
    if (!Array.isArray(row)) continue;
    const date = asString(row[dateIdx]);
    const currency = asString(row[currencyIdx]);
    const total = asNumber(row[totalIdx]);
    if (date && currency && total !== null) {
      days.push({ date, currency, total });
    }
  }
  return days;
}

/** The meta of the days on or before `today` (`paid`) and after it, as the old two statements read. */
export function splitMerchantMeta(
  days: readonly { date: string; count: number }[] | null,
  today: string,
): { paid: MerchantMeta | null; scheduled: MerchantMeta | null } {
  if (days === null) return { paid: null, scheduled: null };
  const meta = (rows: readonly { date: string; count: number }[]) => ({
    transactionCount: rows.reduce((sum, day) => sum + day.count, 0),
    firstDate: rows.reduce(
      (min, day) => (day.date < min ? day.date : min),
      rows[0]?.date ?? "",
    ),
    lastDate: rows.reduce(
      (max, day) => (day.date > max ? day.date : max),
      rows[0]?.date ?? "",
    ),
  });
  const paid = days.filter((day) => day.date <= today);
  const later = days.filter((day) => day.date > today);
  return {
    paid: meta(paid),
    scheduled: later.length > 0 ? meta(later) : null,
  };
}

/** The per-currency totals of the days on or before `today` and of those after it. */
export function splitMerchantTotals(
  days: readonly { date: string; currency: string; total: number }[],
  today: string,
): { paid: MerchantCurrencyTotal[]; scheduled: MerchantCurrencyTotal[] } {
  const sum = (rows: typeof days) => {
    const byCurrency = new Map<string, number>();
    for (const row of rows) {
      byCurrency.set(
        row.currency,
        (byCurrency.get(row.currency) ?? 0) + row.total,
      );
    }
    return [...byCurrency]
      .map(([currency, total]) => ({ currency, total }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  };
  return {
    paid: sum(days.filter((day) => day.date <= today)),
    scheduled: sum(days.filter((day) => day.date > today)),
  };
}
