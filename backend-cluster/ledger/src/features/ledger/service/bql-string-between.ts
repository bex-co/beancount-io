/**
 * Rewrites `column BETWEEN 'a' AND 'b'` into the ordering pair the engine
 * does evaluate (w23/191).
 *
 * rustledger 0.24.0 compares strings with `<`/`>` but refuses them under
 * `BETWEEN` (`type error: cannot compare values`), while stock answers
 * `payee BETWEEN 'A' AND 'M'`. BETWEEN is inclusive on both ends, so
 * `x BETWEEN 'a' AND 'b'` is exactly `(x >= 'a' AND x <= 'b')`, and
 * `x NOT BETWEEN …` is its negation, wrapped in parens so the surrounding
 * AND/OR precedence is untouched.
 *
 * Only the shape that is provably the same predicate moves: a bare
 * (optionally dotted) column on the left and two string-literal bounds.
 * Numeric and date BETWEEN already work and stay as written, as does any
 * expression operand, whose precedence a text rewrite could not keep.
 * String literals use the family's no-escape rule and are masked so a
 * `between` inside one is never matched. The rewrite changes the text
 * length, so offsets in later engine errors shift like the other stages.
 */
const BETWEEN =
  /(?<![\w.$'"])([A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)?)\s+(not\s+)?between\s+('[^']*')\s+and\s+('[^']*')/gi;

const BETWEEN_ONE = new RegExp(`^${BETWEEN.source}$`, "i");

export function rewriteBqlStringBetween(query: string): string {
  // Same-length mask: literal interiors can never satisfy the pattern, and
  // match offsets index straight back into the original text.
  const masked = query.replace(
    /'[^']*'|"[^"]*"/g,
    (m) => m[0] + "x".repeat(m.length - 2) + m[0],
  );
  let out = "";
  let cursor = 0;
  for (const match of masked.matchAll(BETWEEN)) {
    const start = match.index as number;
    const end = start + match[0].length;
    // Re-read the groups from the original text (the mask hid the bounds).
    const groups = BETWEEN_ONE.exec(query.slice(start, end));
    if (groups === null) continue;
    const [, column, not, low, high] = groups;
    const pair = `${column} >= ${low} AND ${column} <= ${high}`;
    out += query.slice(cursor, start) + (not ? `NOT (${pair})` : `(${pair})`);
    cursor = end;
  }
  return out + query.slice(cursor);
}
