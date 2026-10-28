/**
 * Folds non-ASCII whitespace stock beanquery accepts to plain spaces before
 * the query reaches the engine.
 *
 * Stock's tokenizer (TatSu, Python `\s`) separates tokens on every Unicode
 * whitespace character, while rustledger's accepts only ASCII space, tab,
 * CR, and LF — so a query with NBSP, VTAB, or EM SP fails with `syntax
 * error at position 0: unexpected token 'SELECT'`, mislocating a mid-query
 * character at the start (w23/162). Copy-paste from rendered docs routinely
 * introduces NBSPs, so this is the documented-example path failing.
 *
 * This is a normalizer, not a parser fork: each folded character is one
 * UTF-16 unit replaced with one space, so string length, byte offsets, and
 * line numbers in the engine's error messages still point at the user's
 * original text. Runs first in the pipeline so every later stage — and the
 * engine's own tokenizer — sees plain ASCII gaps.
 *
 * String literals are skipped: an NBSP inside `'...'` is data stock
 * preserves, not a separator. Block comments need no carve-out — the
 * comment stage blanks them either way — and there are no line comments
 * (`--`, `#`, `;` all refuse, as in stock), so folding line separators
 * (NEL, U+2028/2029) cannot swallow code. ZWSP and BOM are NOT folded:
 * stock refuses them too, so the shared refusal is parity.
 */
const FOLDABLE_WS = new Set([
  "\x0b", // VTAB
  "\x0c", // FF
  "\x1c", // FS
  "\x1d", // GS
  "\x1e", // RS
  "\x1f", // US
  "\x85", // NEL
  "\u00a0", // NBSP
  "\u1680", // OGHAM SPACE MARK
  "\u2000", // EN QUAD
  "\u2001", // EM QUAD
  "\u2002", // EN SPACE
  "\u2003", // EM SPACE
  "\u2004", // THREE-PER-EM SPACE
  "\u2005", // FOUR-PER-EM SPACE
  "\u2006", // SIX-PER-EM SPACE
  "\u2007", // FIGURE SPACE
  "\u2008", // PUNCTUATION SPACE
  "\u2009", // THIN SPACE
  "\u200a", // HAIR SPACE
  "\u2028", // LINE SEPARATOR
  "\u2029", // PARAGRAPH SEPARATOR
  "\u202f", // NARROW NO-BREAK SPACE
  "\u205f", // MEDIUM MATHEMATICAL SPACE
  "\u3000", // IDEOGRAPHIC SPACE,
]);

export function foldBqlWhitespace(query: string): string {
  let folded: string[] | undefined;
  let quote: string | undefined;
  for (let i = 0; i < query.length; i += 1) {
    const ch = query[i] as string;
    // BQL has no escape sequences inside string literals — the next matching
    // quote character always ends the literal (bql-comments.ts).
    if (quote !== undefined) {
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (FOLDABLE_WS.has(ch)) {
      folded ??= query.split("");
      folded[i] = " ";
    }
  }
  return folded === undefined ? query : folded.join("");
}
