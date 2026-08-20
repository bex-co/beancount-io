/**
 * Exact payee match over journal entries. `getLedgerJournal`'s `query.filter`
 * is free-text search, so callers must re-filter client-side (same pattern as
 * `use-two-posting-suggestions`).
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */

export interface PayeeBearing {
  payee?: string | null;
}

/**
 * Free-text needle for `getLedgerJournal`. The server 500s when the filter
 * contains `.` (validated 2026-08-20: `"MiniMax Group Inc."` fails,
 * `"MiniMax Group Inc"` works). Periods are replaced with spaces; exact
 * matching is still done by `filterExactPayee`.
 */
export function journalSearchFilter(payee: string): string {
  return payee.replace(/\./g, " ").replace(/\s+/g, " ").trim();
}

/** Keep only entries whose payee equals `payee` exactly (after trim). */
export function filterExactPayee<T extends PayeeBearing>(
  entries: readonly T[],
  payee: string,
): T[] {
  const target = payee.trim();
  if (!target) {
    return [];
  }
  return entries.filter((entry) => (entry.payee ?? "").trim() === target);
}
