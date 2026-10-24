import { foldForSearch } from "./search-fold";

/**
 * The words a ledger search is made of: the query, lower-cased and split on
 * whitespace and on the characters a ledger name is hyphenated with (`-`, `_`,
 * `/`, `.`), because "My Book" is created as `my-book` and "my book" is what
 * people type (w21/244).
 */
function searchWords(text: string): string[] {
  // Folded as every other search is, on both sides: a curly apostrophe, a
  // decomposed é, a Turkish İ, full-width letters and Arabic-script spellings
  // matched nothing typed the other way (w21/966).
  return foldForSearch(text)
    .split(/[\s\-_/.]+/)
    .filter(Boolean);
}

/**
 * Whether a ledger matches a search: every word of the query is found in the
 * ledger's `owner/name` or description, in any order. An empty query matches
 * everything. The drawer's filter and Browse ledgers share this, so the same
 * words find the same ledger in both.
 */
export function ledgerMatchesQuery(
  ledger: { fullName: string; description?: string | null },
  query: string,
): boolean {
  const terms = searchWords(query);
  if (terms.length === 0) return true;
  const haystack = searchWords(
    `${ledger.fullName} ${ledger.description ?? ""}`,
  ).join(" ");
  return terms.every((term) => haystack.includes(term));
}
