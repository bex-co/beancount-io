import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";

/**
 * Coerce a single ledger filter value from router JSON search.
 *
 * TanStack Router's default parser turns numeric-looking years (`2016`) into
 * numbers. Legacy UI links also double-encoded filter strings, so after the
 * platform's single URLSearchParams decode the value may still contain `%XX`.
 * Never throw on malformed encodings — recover with the best available string.
 */
export function normalizeLedgerSearchValue(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return "";
  }

  return maybeUndoExtraEncoding(value);
}

/**
 * URLSearchParams (and the router) already decode once. Apply at most one more
 * decode when the value still looks percent-encoded so double-encoded legacy
 * links keep working, without crashing on bare `%` characters.
 */
function maybeUndoExtraEncoding(value: string): string {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseLedgerFilterSearch(
  search: Record<string, unknown> | object | null | undefined,
): LedgerSearchParams {
  const record = (search ?? {}) as Record<string, unknown>;
  return {
    account: normalizeLedgerSearchValue(record.account),
    filter: normalizeLedgerSearchValue(record.filter),
    time: normalizeLedgerSearchValue(record.time),
  };
}

/** Pick account/filter/time for report loaderDeps from validated route search. */
export function ledgerFilterLoaderDeps(
  search: Record<string, unknown> | object | null | undefined,
): LedgerSearchParams {
  return parseLedgerFilterSearch(search);
}

/**
 * Build a search updater that sets or clears the three shared ledger filters
 * while preserving unrelated route-specific params (action, q, file path, …).
 * Empty strings become `undefined` so they drop out of the URL; explicit
 * `undefined` also keeps `retainSearchParams` from restoring cleared keys.
 * Bare years are stored as numbers so the default search serializer emits
 * `time=2016` instead of a JSON-quoted `time=%222016%22`.
 */
export function applyLedgerFilterSearch(
  prev: Record<string, unknown>,
  next: LedgerSearchParams,
): Record<string, unknown> {
  return {
    ...prev,
    account: next.account || undefined,
    filter: next.filter || undefined,
    time: toLedgerFilterSearchParam(next.time),
  };
}

/**
 * Bare calendar years stay numbers in validated/written search so TanStack
 * Router's default JSON search serializer emits `time=2016` instead of
 * `time=%222016%22`. Consumers always normalize back to strings.
 */
export function toLedgerFilterSearchParam(
  normalized: string,
): string | number | undefined {
  if (!normalized) return undefined;
  if (/^\d{4}$/.test(normalized)) {
    return Number(normalized);
  }
  return normalized;
}

/** Clear shared filters without dropping unrelated route search state. */
export function clearLedgerFilterSearch(
  prev: Record<string, unknown>,
): Record<string, unknown> {
  return applyLedgerFilterSearch(prev, {
    account: "",
    filter: "",
    time: "",
  });
}
