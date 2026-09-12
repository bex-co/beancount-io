/**
 * Coercion helpers for list/table view state kept in URL search params —
 * searches, groupings, page offsets, "show more" counts.
 *
 * List state belongs in the URL so a drill-down plus browser Back, a reload, or
 * a shared link rebuilds the same view. That makes every value untrusted: these
 * helpers always coerce to something renderable and never throw, so a hostile
 * or stale link degrades to the default view instead of an error page.
 */

/**
 * Longest list-filter text kept in a URL. Longer values are truncated rather
 * than rejected.
 */
export const LIST_SEARCH_TEXT_MAX_LENGTH = 100;

/**
 * Keeps a string (or URL-parsed number) list filter, bounded in length. Text is
 * not trimmed, so a controlled input stays byte-for-byte what the URL holds.
 * Anything else — objects, arrays, booleans, empty text — drops the key.
 */
export function normalizeListSearchText(
  value: unknown,
  maxLength: number = LIST_SEARCH_TEXT_MAX_LENGTH,
): string | undefined {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : undefined;
  if (text === undefined) return undefined;
  const bounded = text.slice(0, maxLength);
  return bounded.length > 0 ? bounded : undefined;
}

/** Parses a numeric search param without accepting NaN/Infinity or garbage. */
function toFiniteNumber(value: unknown): number | undefined {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(raw) ? raw : undefined;
}

/**
 * Coerces a requested row offset into a non-negative bounded integer. Negative,
 * fractional, non-numeric, and absurdly large values collapse to the first page
 * (or to `max`). Returns undefined for the first page so the key stays out of
 * the URL.
 */
export function normalizeListSearchOffset(
  value: unknown,
  max: number,
): number | undefined {
  const raw = toFiniteNumber(value);
  if (raw === undefined) return undefined;
  const offset = Math.min(Math.max(Math.floor(raw), 0), max);
  return offset > 0 ? offset : undefined;
}

/**
 * Coerces a requested "show N items" count to a multiple of `step` within
 * [`step`, `max`]. Returns undefined for the first page's worth of items so the
 * key stays out of the URL.
 */
export function normalizeListSearchCount(
  value: unknown,
  { step, max }: { step: number; max: number },
): number | undefined {
  const raw = toFiniteNumber(value);
  if (raw === undefined) return undefined;
  const pages = Math.ceil(Math.min(Math.max(raw, step), max) / step);
  const count = Math.min(pages * step, max);
  return count > step ? count : undefined;
}
