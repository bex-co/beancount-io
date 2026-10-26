/**
 * Shared scanners for the BQL text normalizers.
 *
 * Every normalizer walks the query with the same two rules — string literals
 * have no escape sequences (the next matching quote always ends the literal),
 * and clause keywords match whole-word, case-insensitively — so the matchers
 * live here instead of drifting apart in each module.
 */

/** If `FROM` (any case) starts at `i` as a whole word, the index just past it; else -1. */
export function matchFromKeyword(chars: string[], i: number): number {
  const prev = i > 0 ? (chars[i - 1] as string) : "";
  if (prev !== "" && /[A-Za-z0-9_]/.test(prev)) return -1;
  const word = chars
    .slice(i, i + 4)
    .join("")
    .toUpperCase();
  if (word !== "FROM") return -1;
  const next = i + 4 < chars.length ? (chars[i + 4] as string) : "";
  if (next !== "" && /[A-Za-z0-9_]/.test(next)) return -1;
  return i + 4;
}

/** If `SELECT` (any case) starts at `i` as a whole word, the index just past it; else -1. */
export function matchSelectKeyword(chars: string[], i: number): number {
  const prev = i > 0 ? (chars[i - 1] as string) : "";
  if (prev !== "" && /[A-Za-z0-9_]/.test(prev)) return -1;
  const word = chars
    .slice(i, i + 6)
    .join("")
    .toUpperCase();
  if (word !== "SELECT") return -1;
  const next = i + 6 < chars.length ? (chars[i + 6] as string) : "";
  if (next !== "" && /[A-Za-z0-9_]/.test(next)) return -1;
  return i + 6;
}
