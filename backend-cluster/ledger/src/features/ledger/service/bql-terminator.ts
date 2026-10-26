/**
 * Neutralizes a trailing BQL statement terminator before the query reaches
 * the engine.
 *
 * Rustledger's parser mis-resolves a bare `FROM <table>;` — a table name with
 * no further clause, terminated by `;` — as a *column* reference (`column
 * 'postings' not found`), while the same query without the `;`, or with any
 * further clause, resolves the table correctly (w23/109). The `;` is what
 * breaks name resolution there, so it is replaced with a space and only the
 * one `;` is touched: a mid-query `;` is left for the engine to report, and a
 * `;` inside a string literal is query text, not a terminator.
 *
 * This is a normalizer, not a parser fork: replacing (not deleting) keeps
 * byte offsets in the engine's error messages aligned with the user's text,
 * the same trade the block-comment stripper makes. Deliberately left to fail:
 * an unterminated string literal is returned unchanged so the engine still
 * reports it.
 */
export function stripBqlStatementTerminator(query: string): string {
  // Scan the whole query tracking string literals — BQL has no escape
  // sequences, so the next matching quote always ends the literal (same rule
  // as the block-comment stripper).
  let quote: string | undefined;
  let lastUnquotedSemicolon = -1;
  for (let i = 0; i < query.length; i += 1) {
    const ch = query[i];
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === ";") lastUnquotedSemicolon = i;
  }

  if (lastUnquotedSemicolon === -1 || quote !== undefined) return query;
  // Only a *trailing* terminator is neutralized: anything but whitespace past
  // the last unquoted `;` means it sits mid-query.
  for (let i = lastUnquotedSemicolon + 1; i < query.length; i += 1) {
    if (!/\s/.test(query[i] as string)) return query;
  }
  return (
    query.slice(0, lastUnquotedSemicolon) +
    " " +
    query.slice(lastUnquotedSemicolon + 1)
  );
}
