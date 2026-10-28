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
 *
 * Trailing comments ride along (w23/151): the tail past the last unquoted
 * `;` may hold `--` line comments and `/*` block comments besides whitespace,
 * since those are legitimate BQL habits — but a second statement or garbage
 * still returns unchanged for the engine to refuse loudly (stock silently
 * drops the tail; the w1 single-statement rule forbids regressing to that).
 * Lead and mid-query comments are untouched: the scan skips them while
 * looking for `;`, but only a clean tail neutralizes.
 */
export function stripBqlStatementTerminator(query: string): string {
  // Scan the whole query tracking string literals — BQL has no escape
  // sequences, so the next matching quote always ends the literal (same rule
  // as the block-comment stripper) — and skipping comments, so a `;` or
  // quote inside one is comment text, not syntax.
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
    if (ch === "/" && query[i + 1] === "*") {
      const close = query.indexOf("*/", i + 2);
      if (close === -1) break;
      i = close + 1;
      continue;
    }
    if (isLineCommentOpen(query, i)) {
      const end = query.indexOf("\n", i + 2);
      if (end === -1) break;
      i = end;
      continue;
    }
    if (ch === ";") lastUnquotedSemicolon = i;
  }

  if (lastUnquotedSemicolon === -1 || quote !== undefined) return query;
  // Only a *trailing* terminator is neutralized: the tail past the last
  // unquoted `;` must hold nothing but whitespace and comments. Anything
  // else means it sits mid-query — a second statement or garbage.
  let tail = "";
  for (let i = lastUnquotedSemicolon + 1; i < query.length; ) {
    const ch = query[i] as string;
    if (/\s/.test(ch)) {
      tail += ch;
      i += 1;
      continue;
    }
    if (isLineCommentOpen(query, i)) {
      const end = query.indexOf("\n", i + 2);
      const stop = end === -1 ? query.length : end;
      tail += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    if (ch === "/" && query[i + 1] === "*") {
      const close = query.indexOf("*/", i + 2);
      if (close === -1) return query;
      for (let j = i; j < close + 2; j += 1) {
        tail += query[j] === "\n" ? "\n" : " ";
      }
      i = close + 2;
      continue;
    }
    return query;
  }
  return query.slice(0, lastUnquotedSemicolon) + " " + tail;
}

/**
 * A `--` opens a line comment only when whitespace or the end of input
 * follows (w23/151): a bare `--x` stays query text for the engine to
 * report, so the tail rule can never silently accept garbage.
 */
function isLineCommentOpen(query: string, index: number): boolean {
  if (query[index] !== "-" || query[index + 1] !== "-") return false;
  const after = query[index + 2];
  return after === undefined || /\s/.test(after);
}
