/**
 * Pure view-model for the Merchants directory: map `queryShell` table rows into
 * typed payee rollups, then filter and sort in memory.
 *
 * Kept free of any `@/` value imports so the jest-lite runner can require it.
 */

/** One payee's rollup from the fixed server-side BQL aggregation. */
export interface MerchantAggregate {
  payee: string;
  transactionCount: number;
  firstDate: string;
  lastDate: string;
}

export type MerchantSort = "count" | "alphabetical";

/** Column names the selector expects (aliases on the fixed BQL statement). */
const COL = {
  payee: "payee",
  count: "transaction_count",
  firstDate: "first_date",
  lastDate: "last_date",
} as const;

/**
 * Fixed app-authored BQL for the Merchants directory. Validated 2026-08-19
 * against the live `queryShell` dialect (aliases work; `count(*)` is accepted;
 * empty-payee rows are filtered server-side). Never shown to the user —
 * internal plumbing only (see `.pm/DO_NOT_DO.md:18` and m35 README).
 *
 * Fallback if the owner bans the operation outright: aggregate client-side over
 * a `getLedgerJournal` window. That silently under-counts past the fetched
 * page — the same failure mode `select-account-transactions.ts` documents.
 */
export const PAYEE_ROLLUP_BQL =
  "SELECT payee, count(*) as transaction_count, min(date) as first_date, max(date) as last_date WHERE payee != '' GROUP BY payee ORDER BY transaction_count DESC";

interface QueryColumnLike {
  name: string;
  dtype: string;
}

export interface QueryResultTableLike {
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
  types: ReadonlyArray<QueryColumnLike>;
}

function columnIndex(
  types: ReadonlyArray<QueryColumnLike>,
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

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }
  return null;
}

/**
 * Resolve column indexes by name. Missing any required column → soft failure
 * (empty list), never a throw — unexpected schema must not crash the screen.
 */
function resolveColumns(types: ReadonlyArray<QueryColumnLike>): {
  payee: number;
  count: number;
  firstDate: number;
  lastDate: number;
} | null {
  const payee = columnIndex(types, COL.payee);
  const count = columnIndex(types, COL.count);
  const firstDate = columnIndex(types, COL.firstDate);
  const lastDate = columnIndex(types, COL.lastDate);
  if (payee < 0 || count < 0 || firstDate < 0 || lastDate < 0) {
    return null;
  }
  return { payee, count, firstDate, lastDate };
}

/**
 * Map a `QueryResultTable` into `MerchantAggregate[]`.
 *
 * - Columns are resolved by name, not position.
 * - Rows with a missing payee or unparseable count are skipped.
 * - Duplicate payee rows (shouldn't happen with GROUP BY, but defensive) merge:
 *   counts sum, firstDate is the earlier, lastDate the later.
 * - Default order matches the BQL: count desc, alphabetical tiebreak.
 */
export function aggregatePayees(
  table: QueryResultTableLike | null | undefined,
): MerchantAggregate[] {
  if (!table?.types || !table.rows) {
    return [];
  }
  const columns = resolveColumns(table.types);
  if (!columns) {
    return [];
  }

  const byPayee = new Map<string, MerchantAggregate>();

  for (const row of table.rows) {
    if (!Array.isArray(row)) {
      continue;
    }
    const payee = asString(row[columns.payee]);
    const transactionCount = asCount(row[columns.count]);
    if (!payee || transactionCount === null) {
      continue;
    }
    const firstDate = asString(row[columns.firstDate]) ?? "";
    const lastDate = asString(row[columns.lastDate]) ?? "";

    const existing = byPayee.get(payee);
    if (!existing) {
      byPayee.set(payee, { payee, transactionCount, firstDate, lastDate });
      continue;
    }
    existing.transactionCount += transactionCount;
    if (firstDate && (!existing.firstDate || firstDate < existing.firstDate)) {
      existing.firstDate = firstDate;
    }
    if (lastDate && (!existing.lastDate || lastDate > existing.lastDate)) {
      existing.lastDate = lastDate;
    }
  }

  return sortMerchants([...byPayee.values()], "count");
}

/** Case-insensitive substring match on the payee name. */
export function filterMerchants(
  merchants: readonly MerchantAggregate[],
  query: string,
): MerchantAggregate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...merchants];
  }
  return merchants.filter((merchant) =>
    merchant.payee.toLowerCase().includes(needle),
  );
}

/**
 * - `count`: transaction count descending, alphabetical ascending on ties.
 * - `alphabetical`: payee name ascending (locale-independent code-point order
 *   so the pure selector stays free of Intl; the screen can re-sort with a
 *   locale collator later if needed).
 */
export function sortMerchants(
  merchants: readonly MerchantAggregate[],
  sort: MerchantSort,
): MerchantAggregate[] {
  const copy = [...merchants];
  if (sort === "alphabetical") {
    copy.sort((a, b) => {
      const byName = a.payee.localeCompare(b.payee);
      if (byName !== 0) {
        return byName;
      }
      return b.transactionCount - a.transactionCount;
    });
    return copy;
  }
  copy.sort((a, b) => {
    const byCount = b.transactionCount - a.transactionCount;
    if (byCount !== 0) {
      return byCount;
    }
    return a.payee.localeCompare(b.payee);
  });
  return copy;
}
