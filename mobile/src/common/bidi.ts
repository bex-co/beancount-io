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

/**
 * A file path with segments in a right-to-left script, kept root first, as
 * `isolateAccountPath` keeps an account name: "qa20261020/بانک/ملی" drew the
 * child folder before its parent, and a dated file name moved into the folder
 * path and read backwards (w21/824). Each segment goes in a first-strong
 * isolate and the path in a left-to-right one. A path in a left-to-right
 * script is returned as it is.
 */
export function isolatePath(path: string): string {
  if (!RTL_LETTERS.test(path)) return path;
  return isolateLtr(
    path
      .split("/")
      .map((segment) => `⁨${segment}⁩`)
      .join("/"),
  );
}

/** A string (to its closing quote), a comment, or a word of ledger source. */
const SOURCE_TOKEN = /"(?:[^"\\]|\\.)*"?|;.*|[^\s"]+/gu;
const ACCOUNT_TOKEN = /^[^\s":]+(?::[^\s":]+)+$/u;
/** A token's marks before its text, and a string's closing quote. */
const TOKEN_TEXT = /^([^\p{L}\p{N}]*)(.*?)("?)$/su;

/**
 * A line of ledger source with its right-to-left words kept in place. Drawn
 * raw, "Assets:Bank:بانک:ملی      100.00 USD" let the spaces and amount join
 * the Arabic-script run, so the amount landed inside the path and the path
 * read child first (w21/780). The text of each string, comment and word
 * holding such letters goes in an isolate, an account root first
 * (`isolateAccountPath`), and a left-to-right mark starts the line, as source
 * is written. A line without them is returned as it is.
 */
export function isolateSourceLine(line: string): string {
  if (!RTL_LETTERS.test(line)) return line;
  const isolated = line.replace(SOURCE_TOKEN, (token) => {
    if (!RTL_LETTERS.test(token)) return token;
    if (ACCOUNT_TOKEN.test(token)) return isolateAccountPath(token);
    // A diff header's `a/documents/بانک/…` path (w21/824).
    if (token.includes("/") && !token.startsWith('"')) {
      return isolatePath(token);
    }
    // Outside the isolate, a comment's ";", a tag's "#" and a string's quotes
    // stay where source puts them, before and after its text.
    const [, marks = "", text = "", quote = ""] = TOKEN_TEXT.exec(token) ?? [];
    return `${marks}⁨${text}⁩${quote}`;
  });
  return `‎${isolated}`;
}
