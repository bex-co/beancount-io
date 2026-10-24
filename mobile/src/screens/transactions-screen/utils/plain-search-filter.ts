import { foldWidth } from "../../../common/width-fold";

/**
 * Serialize ordinary Transactions search text into a Fava advanced-filter
 * STRING literal. Bare tokens reject punctuation (e.g. `Mr. Marcel` →
 * Illegal character "."), while quoted strings accept it. The matched value
 * is compiled as a case-insensitive regex, so metacharacters must be escaped
 * before quoting.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */

/** The longest filter pattern the ledger service accepts. */
const MAX_PATTERN_LENGTH = 256;

/** One tag or link token, in Beancount's tag/link character set. */
const TAG_OR_LINK = /^[#^][A-Za-z0-9_\-./]+$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @returns A filter expression, or `undefined` when the input is empty/whitespace
 *   so the GraphQL variable can be omitted.
 */
export function toPlainSearchFilter(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // A lone `#tag` or `^link` is Fava filter syntax for that tag or link, and
  // only works unquoted: quoted, it matched payee and narration only, so a
  // search for the tags the detail screen shows found nothing (w21/025). But
  // the same token is also how a check or order number is written in a
  // narration ("Check #1042"), which the bare form never finds, so it is sent
  // as an alternative: the tag or link, or the text (`,` is Fava's OR) (w21/400).
  // The bare form compares exactly, case and all, and the field does not
  // capitalize, so "#japan2026" missed #Japan2026: a third alternative matches
  // the start of any one tag (or link) case-insensitively, through the filter's
  // `tags:` attribute, whose list reads "a, b" (w21/640).
  if (TAG_OR_LINK.test(trimmed)) return tagOrLinkFilter(trimmed);

  return quoted(trimmed);
}

/**
 * The payee field alone, matched whole: the quoted text anchored at both ends
 * (padded for the trailing space a bank import leaves), spelled as tolerantly
 * as the search is. The plain filter is a substring match over payee and
 * narration, so "Uber" among "Uber Eats" entries filled the newest 50 of them
 * and none of its own (w21/921). A pattern too long to send falls back to the
 * plain filter; callers still compare the payee themselves.
 */
export function toExactPayeeFilter(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const pattern = `^\\s*${quoted(trimmed).slice(1, -1)}\\s*$`;
  return pattern.length > MAX_PATTERN_LENGTH
    ? toPlainSearchFilter(raw)
    : `payee:"${pattern}"`;
}

function tagOrLinkFilter(token: string): string {
  const attribute = token.startsWith("#") ? "tags" : "links";
  const prefix = `${attribute}:"(?:^|, )${escapeRegExp(token.slice(1))}"`;
  return `${token},${prefix},${quoted(token)}`;
}

/**
 * The Transactions search: several words must all be found, in any order and
 * in any field, as in Fava, where juxtaposed terms are an AND. The whole input
 * as one phrase found "sushi dinner" only when both sat together in one field,
 * so a row reading "SUSHI PLACE / Dinner" matched nothing (w21/911). A single
 * word is the phrase search as it was. A `#tag` or `^link` word keeps its
 * alternatives, in parentheses so the `,` (OR) cannot swallow its neighbours.
 */
export function toWordsSearchFilter(raw: string): string | undefined {
  const words = raw.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= 1) return toPlainSearchFilter(raw);
  return words
    .map((word) =>
      TAG_OR_LINK.test(word) ? `(${tagOrLinkFilter(word)})` : quoted(word),
    )
    .join(" ");
}

/**
 * The text as one quoted STRING literal that matches it as typed.
 *
 * The lexer's forms are `"[^"]*"` and `'[^']*'`, with no escape processing
 * inside, so a double quote cannot appear in a double-quoted literal; it is
 * written as the regex escape `\x22`. Quotes match their typographic forms
 * too: iOS Smart Punctuation turns a typed `Trader Joe's` into `Trader Joe’s`,
 * which matched nothing, and a ledger imported with curly quotes was not found
 * by a straight one (w21/401). So an apostrophe is `['‘’]` and a double quote
 * `[\x22“”]`, and the literal is always double-quoted. `escapeRegExp` escapes
 * typed backslashes first, so a typed `\x22` stays literal text rather than
 * becoming a quote.
 */
function quoted(trimmed: string): string {
  // The ledger service refuses a pattern longer than this, and escaping makes a
  // text several times longer (a dot is two characters, an apostrophe five), so
  // a long memo failed the whole list. A needle that would not fit is cut to the
  // longest prefix that does, which finds the entries that contain it rather
  // than an error (w21/402). Each unit is encoded whole, so no escape is ever
  // cut in half.
  //
  // Tolerant of how the same text is written: a run of whitespace matches any
  // run (a double space, a no-break space from a bank export), and a letter that
  // can be composed or decomposed ("é" or "e" and a combining accent) matches
  // either, since iOS types the first and an import may hold the second
  // (w21/466).
  let body = "";
  for (const unit of searchUnits(trimmed)) {
    const encoded = encodeUnit(unit);
    if (body.length + encoded.length > MAX_PATTERN_LENGTH) break;
    body += encoded;
  }
  return `"${body}"`;
}

/** The text as composed characters, a whole run of whitespace being one. */
function searchUnits(text: string): string[] {
  return (
    foldWidth(text)
      .normalize("NFC")
      .match(/\s+|[\s\S]/gu) ?? []
  );
}

function encodeUnit(unit: string): string {
  if (/^\s+$/u.test(unit)) return "\\s+";
  const literal = (char: string) =>
    escapeRegExp(char)
      .replace(/['\u2018\u2019]/g, "['\u2018\u2019]")
      .replace(/["\u201c\u201d]/g, "[\\x22\u201c\u201d]");
  const decomposed = unit.normalize("NFD");
  return decomposed === unit
    ? literal(unit)
    : `(?:${literal(unit)}|${[...decomposed].map(literal).join("")})`;
}
