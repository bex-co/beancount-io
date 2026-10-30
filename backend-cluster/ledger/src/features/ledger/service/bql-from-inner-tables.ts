import { FOLD_COLUMNS } from "./bql-from-fold";
import { matchFromKeyword } from "./bql-scan";

/**
 * Rescues inner bare-`FROM <name>` tables from the engine's column-first
 * `)` resolution (w23/130).
 *
 * The engine resolves a FROM name by what terminates it: bare-EOF and
 * with-clause names resolve tables, while `;`-terminated names fold
 * columns (w23/109, w23/116) and `)`-terminated inner names resolve
 * column-first with no table fallback — real tables error with
 * `column '<table>' not found` and unknown names misdiagnose the same
 * way. Rewriting the inner form onto the working one: a bare `FROM <name>`
 * closed directly by `)` (modulo whitespace) gains an identity
 * `WHERE true`, so the engine takes its table path exactly as it does for
 * a with-clause name. `WHERE true` is a semantic no-op on both sides
 * (verified on stock beanquery 0.2.0 and the pinned engine).
 *
 * Deliberately narrow, because the rescue must not disturb the names the
 * `)` path already resolves correctly:
 *
 * - Fold columns pass through: the engine's `)`-fold is the native fold
 *   the whole w23/116 wrap relies on.
 * - The dual `accounts` is rescued like any table: the owner chose
 *   table-first everywhere (w23/124, 2026-10-30), so inner `FROM accounts)`
 *   agrees with the outer forms and with `bea`. This deliberately differs from
 *   released beanquery 0.2.0, which folds the unquoted name to postings.
 * - Quoted names pass through here: the unquote stage (which runs first
 *   and accepts `)` continuations) already routed them onto this path.
 * - Anything with a clause, anything inside a string literal, and
 *   non-identifier names pass through untouched (same no-escape quote
 *   rule as the other normalizers).
 *
 * Runs after the terminator (which owns the `;` forms) and before the
 * fold, so the fold's own generated `)`-inners are never examined. Like
 * the fold this one shifts offsets past the injection — unavoidable for
 * a rewrite, and the rescued query is what the engine runs. An
 * unterminated literal returns the query unchanged for the engine to
 * report.
 */
export function rescueInnerTableFrom(query: string): string {
  const chars = query.split("");
  let out = "";
  let quote: string | null = null;
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    const fromEnd = matchFromKeyword(chars, i);
    if (fromEnd === -1) {
      out += ch;
      i += 1;
      continue;
    }
    const nameEnd = matchInnerBareTable(chars, fromEnd);
    if (nameEnd === undefined) {
      out += query.slice(i, fromEnd);
      i = fromEnd;
      continue;
    }
    out += `${query.slice(i, nameEnd)} WHERE true`;
    i = nameEnd;
  }
  return quote === null ? out : query;
}

/**
 * If a rescuable bare table name follows the `FROM` ending at `fromEnd`,
 * the index just past the name; else undefined. Rescuable means a bare
 * identifier closed directly by `)` that is not a fold column (the native
 * `)`-fold is correct).
 */
function matchInnerBareTable(
  chars: string[],
  fromEnd: number,
): number | undefined {
  let j = fromEnd;
  while (j < chars.length && /\s/.test(chars[j] as string)) j += 1;
  const nameStart = j;
  while (j < chars.length && /[A-Za-z0-9_]/.test(chars[j] as string)) j += 1;
  if (j === nameStart) return undefined;
  if (/[0-9]/.test(chars[nameStart] as string)) return undefined;
  const name = chars.slice(nameStart, j).join("");
  if (FOLD_COLUMNS.has(name)) return undefined;
  const nameEnd = j;
  while (j < chars.length && /\s/.test(chars[j] as string)) j += 1;
  if (chars[j] !== ")") return undefined;
  return nameEnd;
}
