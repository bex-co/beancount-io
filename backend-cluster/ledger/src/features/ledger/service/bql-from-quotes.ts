/**
 * Unquotes BQL `FROM "<table>"` names before the query reaches the engine.
 *
 * Rustledger's parser silently ignores a quoted FROM name and runs the query
 * in default postings scope — `FROM "entries"` counts postings, and even
 * `FROM "nosuchtable"` returns postings rows instead of erroring — while the
 * same name unquoted resolves through the table path (w23/115). Rewriting the
 * quotes away routes quoted names through exactly that path, so quoted and
 * unquoted agree table for table, error for error.
 *
 * This is a normalizer, not a parser fork: the two quote characters are
 * replaced with spaces (not deleted) so byte offsets in the engine's error
 * messages stay aligned with the user's text, the same trade the other
 * strippers make. Deliberately narrow, because rewriting identifiers is where
 * a normalizer could invent meaning:
 *
 * - Only a `"` immediately after `FROM` + whitespace is touched, and only
 *   when the quoted text is a valid bare identifier (`[A-Za-z_][A-Za-z0-9_]*`)
 *   followed by a table-position continuation (end, whitespace, `;`, `,`).
 *   Anything else is left for the engine — unquoting `"entries x"` into
 *   `FROM entries x` would silently re-scope to `entries`, worse than today.
 * - Single-quoted names (`FROM 'entries'`) are left alone: those are string
 *   literals, not quoted identifiers, and re-scoping them is stock's error to
 *   define, not ours.
 * - `FROM` inside a string literal is skipped (same no-escape quote rule as
 *   the other normalizers), and an unterminated quote ends the scan with the
 *   query unchanged from that point — the engine still reports it.
 */
import { matchFromKeyword } from "./bql-scan";
export function unquoteBqlFromTables(query: string): string {
  const out = query.split("");
  // `null` = outside a literal; otherwise the quote character that opened it.
  let quote: string | null = null;
  let i = 0;
  while (i < out.length) {
    const ch = out[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      i += 1;
      continue;
    }
    const fromEnd = matchFromKeyword(out, i);
    if (fromEnd === -1) {
      i += 1;
      continue;
    }
    const rewrite = matchQuotedFromName(out, fromEnd);
    if (rewrite === undefined) {
      i = fromEnd;
      continue;
    }
    out[rewrite.openQuote] = " ";
    out[rewrite.end - 1] = " ";
    i = rewrite.end;
  }
  return quote === null ? out.join("") : query;
}

/**
 * If whitespace then a `"<identifier>"` table name follows the `FROM` ending
 * at `fromEnd`, the quote span to blank; else undefined. Returns undefined —
 * leaving the query untouched — for single-quoted names, non-identifier
 * quoted text, unterminated quotes, and quotes followed by identifier text.
 */
function matchQuotedFromName(
  chars: string[],
  fromEnd: number,
): { openQuote: number; end: number } | undefined {
  let j = fromEnd;
  while (j < chars.length && /\s/.test(chars[j] as string)) j += 1;
  if (chars[j] !== '"') return undefined;
  const openQuote = j;
  j += 1;
  const nameStart = j;
  while (j < chars.length && chars[j] !== '"') j += 1;
  if (j >= chars.length) return undefined;
  const name = chars.slice(nameStart, j).join("");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return undefined;
  const after = j + 1 < chars.length ? (chars[j + 1] as string) : "";
  if (after !== "" && !/[\s;,]/.test(after)) return undefined;
  return { openQuote, end: j + 1 };
}
