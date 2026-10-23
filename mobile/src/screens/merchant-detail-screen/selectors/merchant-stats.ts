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
  transactionCount: number;
  firstDate: string;
  lastDate: string;
  /** One row per currency; empty when the payee has no Expenses/Income legs. */
  totalsByCurrency: MerchantCurrencyTotal[];
}

/**
 * Overall transaction count and date span for one payee. Count over `#entries`
 * so multi-posting transactions are not overstated (posting-default `count(*)`
 * matched the Merchants directory bug).
 */
export function buildMerchantMetaBql(
  payees: string | readonly string[],
): string {
  return (
    "SELECT count(*) as transaction_count, " +
    "min(date) as first_date, max(date) as last_date " +
    `FROM #entries WHERE ${anyPayee(payees)}`
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
): string {
  return (
    "SELECT currency, sum(number) as total " +
    `WHERE ${anyPayee(payees)} ` +
    `AND ${moneyRootsBqlFilter(roots)} ` +
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
): string {
  return (
    "SELECT currency(weight) as currency, sum(number(weight)) as total " +
    `WHERE ${anyPayee(payees)} ` +
    `AND ${moneyRootsBqlFilter(roots)} ` +
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

export function composeMerchantStats(
  meta: Pick<
    MerchantStats,
    "transactionCount" | "firstDate" | "lastDate"
  > | null,
  totalsByCurrency: MerchantCurrencyTotal[],
): MerchantStats | null {
  if (!meta) {
    return null;
  }
  return { ...meta, totalsByCurrency };
}
