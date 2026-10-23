/**
 * The written text of an entry the ledger holds only as source: an
 * `amortize_over` plugin replaces the original with its copies, so the context
 * of the copies' `generated_from` hash has a slice but an entry with no date or
 * postings (w21/660). Null when the entry parsed, or there is no text to show.
 */
export function selectSourceSlice(
  context: { slice?: string | null } | null | undefined,
  hasEntry: boolean,
): string | null {
  if (hasEntry) return null;
  const slice = context?.slice?.trim();
  return slice ? slice : null;
}
