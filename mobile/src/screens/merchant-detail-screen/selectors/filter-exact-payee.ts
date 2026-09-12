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
