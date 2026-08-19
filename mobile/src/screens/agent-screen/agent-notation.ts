/**
 * Notation the agent emits that **is not markdown**, cleaned before a markdown
 * renderer ever sees it.
 *
 * `react-native-marked` handles markdown correctly and is not asked to do more.
 * But the model narrates arithmetic in LaTeX — `\[ \text{Net Worth} =
 * (\text{Assets}) \]`, `2,754.06\, USD` — which a markdown parser will faithfully
 * render as the literal backslash commands, next to someone's balances. That is
 * a preprocessing job and stays ours no matter which renderer is downstream.
 *
 * Markdown's own syntax — emphasis, lists, headings, code spans, backslash
 * escapes — is deliberately **not** touched here; the library owns all of it.
 */

/** `\text{Net Worth}` → `Net Worth`. */
const LATEX_TEXT = /\\text\s*\{([^{}]*)\}/g;

/**
 * Display math: `\[ … \]`, and the bare `[ … ]` left once the delimiters are
 * unescaped. Only unwrapped when the run actually looks like the model's math,
 * so a markdown link's `[label]` survives untouched.
 */
const LATEX_DISPLAY = /\\?\[\s*(.*?)\s*\\?\]/g;

/**
 * Spacing commands, which land between a number and its currency. Unambiguous:
 * `,` `;` `:` need no escaping in markdown, so a backslash before one is LaTeX.
 * `\!` is excluded — a negative thin space in LaTeX but an escaped `!` in
 * markdown, and the markdown reading is the safer default.
 */
const LATEX_SPACING = /\\(?:quad|qquad|[,;:])/g;

/** Inline math delimiters read as ordinary grouping once the math is prose. */
const LATEX_INLINE = /\\([()])/g;

export function stripAgentNotation(text: string): string {
  return text
    .replace(LATEX_TEXT, "$1")
    .replace(LATEX_SPACING, " ")
    .replace(LATEX_INLINE, "$1")
    .replace(LATEX_DISPLAY, (whole, inner: string) =>
      /\\|=/.test(whole) ? inner : whole,
    )
    .replace(/[^\S\n]{2,}/g, " ");
}
