/**
 * Keep an amount in left-to-right order inside a translated sentence. In a
 * right-to-left line the first Persian letter sets the direction, and the
 * `-`, `+` and `$` around a number are neutral, so "مانده: -$1,234.50"
 * rendered as `1,234.50$- :مانده` (w21/095). A left-to-right isolate
 * (U+2066 … U+2069) is the plain-text form of the dashboard's `<bdi dir=ltr>`
 * (w3/479); in a left-to-right sentence it changes nothing visible.
 *
 * Free of `@/` value imports so the jest-lite runner can require it.
 */
export function isolateLtr(text: string): string {
  return `⁦${text}⁩`;
}

/** Hebrew and Arabic script, whose letters set a right-to-left direction. */
const RTL_LETTERS = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/;

/**
 * A currency symbol written in a right-to-left script, kept to itself. Glued to
 * a number, KWD's "د.ك" turned the whole figure right-to-left, so
 * "-د.ك1,234.500" drew as `1,234.500ك.د-`, its minus at the far end
 * (w21/698). In a right-to-left isolate (U+2067 … U+2069) the symbol keeps its
 * own order and the figure reads `-ك.د1,234.500`, as "-$1,234.50" does. Any
 * other symbol is returned as it is.
 */
export function isolateRtlSymbol(symbol: string): string {
  return RTL_LETTERS.test(symbol) ? `⁧${symbol}⁩` : symbol;
}

/**
 * An account path with segments in a right-to-left script, kept root first.
 * Two such segments around a ":" formed one right-to-left run and swapped, so
 * "Qa20261020Bank:بانک:ملی" drew the child ملی before its parent (w21/743).
 * Each segment goes in a first-strong isolate (U+2068 … U+2069), keeping its
 * own order, and the path in a left-to-right one: an account name reads root
 * first in every app direction, as Open Account writes it (w0/049). A path in
 * a left-to-right script is returned as it is.
 */
export function isolateAccountPath(path: string): string {
  if (!RTL_LETTERS.test(path)) return path;
  return isolateLtr(
    path
      .split(":")
      .map((segment) => `⁨${segment}⁩`)
      .join(":"),
  );
}
