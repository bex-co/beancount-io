/**
 * Per-payee merchant stats from fixed `queryShell` statements: overall
 * count/first/last, plus per-currency totals (never cross-currency summed).
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */

import { escapeBqlString } from "./escape-bql-string";
import type { QueryResultTableLike } from "../../merchants-screen/selectors/aggregate-payees";

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
 * Overall transaction count and date span for one payee. `count(*)` without an
 * account filter matches the Merchants directory rollup (validated on
 * `open_ledger/minimax`: MiniMax Group Inc. → 32).
 */
export function buildMerchantMetaBql(payee: string): string {
  const lit = escapeBqlString(payee);
  return (
    "SELECT count(*) as transaction_count, " +
    "min(date) as first_date, max(date) as last_date " +
    `WHERE payee = ${lit}`
  );
}

/**
 * Per-currency signed totals from Expenses/Income legs only — balance-sheet
 * counterparts would cancel. Never summed across currencies by the selector.
 */
export function buildMerchantCurrencyTotalsBql(payee: string): string {
  const lit = escapeBqlString(payee);
  return (
    "SELECT currency, sum(number) as total " +
    `WHERE payee = ${lit} ` +
    "AND (account ~ '^Expenses' OR account ~ '^Income') " +
    "GROUP BY currency ORDER BY currency"
  );
}

function columnIndex(
  types: ReadonlyArray<{ name: string; dtype: string }>,
  name: string,
): number {
  return types.findIndex((column) => column.name === name);
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function asCount(value: unknown): number | null {
  const n = asNumber(value);
  if (n === null) {
    return null;
  }
  return Math.max(0, Math.trunc(n));
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
