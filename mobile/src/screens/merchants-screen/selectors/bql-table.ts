/**
 * Shared primitives for reading a fixed `queryShell` result table: the minimal
 * table shape plus defensive cell coercions. Columns are resolved by name and
 * cells are coerced softly, so an unexpected schema yields null/empty instead
 * of crashing a screen.
 *
 * Pure and import-free so the jest-lite runner can require the selectors that
 * pull these in (they stay free of any `@/` value imports).
 */

/** One column descriptor from a `queryShell` result table. */
export interface QueryColumnLike {
  name: string;
  dtype: string;
}

/** The subset of a `queryShell` result table the selectors read. */
export interface QueryResultTableLike {
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
  types: ReadonlyArray<QueryColumnLike>;
}

/** Index of the named column, or -1 when it is absent. */
export function columnIndex(
  types: ReadonlyArray<QueryColumnLike>,
  name: string,
): number {
  return types.findIndex((column) => column.name === name);
}

/** Non-empty trimmed string, or a finite number's decimal form; else null. */
export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** Finite number from a number or a non-blank numeric string; else null. */
export function asNumber(value: unknown): number | null {
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

/** Like `asNumber`, floored to a non-negative integer count; else null. */
export function asCount(value: unknown): number | null {
  const n = asNumber(value);
  if (n === null) {
    return null;
  }
  return Math.max(0, Math.trunc(n));
}
