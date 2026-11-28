import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { commentSkippedLines, leadingDotOffsets } from "./parseable-files";
import {
  postingCurrencyMinus,
  postingSyntaxErrors,
  STOCK_ACCOUNT,
  STOCK_CURRENCY,
} from "./posting-syntax-errors";
import { SOURCE_DATE, sourceDateOf } from "./source-date";
import { endsInsideString, loadedFiles } from "./source-slice";

/**
 * What stock `bean-check` refuses that rustledger 0.24.0 loads without a word
 * (w23/240), reported at their line the way the mid-currency balance
 * tolerance is (w23/197), so every surface that reads the ledger's errors
 * (`checkLedger`, the post-write report, the entry-write gates) sees what
 * `bea check` or a Fava load would:
 *
 *  - an unquoted booking method on `open` (`open Assets:Stock ABC STRICT`;
 *    stock's grammar wants `"STRICT"`: `syntax error, unexpected CURRENCY`);
 *  - a second `commodity` directive for one currency
 *    (`Duplicate commodity directives for 'ZZZ'`, on the later one);
 *  - the same metadata key twice on one transaction or on one posting
 *    (`Duplicate metadata field on entry`, `Duplicate posting metadata field`,
 *    on the transaction's line). Stock checks transactions only: a duplicate
 *    key on an `open` or `commodity` is accepted there, so it is here;
 *  - a posting's negative price, merge cost `{*}`, or second amount, date or
 *    label in one cost spec (w31/120), and its cost and price in two
 *    currencies, per-unit cost inside a total cost, or total price with no
 *    units (w31/148), on the posting's line: see `posting-syntax-errors.ts`;
 *  - a line of tags or links after a transaction's first posting
 *    (`Tags or links not allowed after first Posting`, on the transaction's
 *    line, w31/148). Stock does not apply them; the engine files the
 *    transaction under them;
 *  - a `|` between a transaction header's strings (`Pipe symbol is
 *    deprecated.`, on the header's line, w31/148), unless the file has set
 *    `option "allow_pipe_separator"` true above it. Stock reads that option
 *    per file, in order, so an included file gets no such pass. A `|` after
 *    the header's tags is stock's syntax error instead (`syntax error,
 *    unexpected PIPE`), which the engine loads clean;
 *  - three spellings stock's lexer and grammar refuse (w31/121): an account
 *    with a colon after it (`Assets:Cash:`, `syntax error, unexpected COLON`,
 *    with the tokens stock expected there), which the engine books to
 *    `Assets:Cash`; a string where a dated line's flag goes (`2026-09-02 "x"`,
 *    `syntax error, unexpected STRING`), which the engine reads as a `*`
 *    transaction; and a number with no leading digit (`.50`,
 *    `Invalid token: '.50'`), which `withLeadingZeros` reads as 0.50 so the
 *    figure stays right while the error says the text is wrong;
 *  - a currency that ends in `.`, `_`, `'` or `-` (`1 QAB.`, `commodity
 *    QAB-`, w31/154). Stock's currency ends in a capital or a digit, so its
 *    lexer reads `QAB` and then `Invalid token: '.'` (the token runs to the
 *    next whitespace, as with `.50`), or a `-` its grammar cannot take
 *    (`syntax error, unexpected MINUS`, with the tokens stock expected there,
 *    at a posting's units, cost or price, an `open` currency list, a
 *    `commodity`, a `price`'s quoted currency, a `balance` or a metadata
 *    value). A `custom` value reads the `-` as the next value's sign, so the
 *    error is at the token after it, and `price QAB- 1.00 USD` is `price QAB
 *    -1.00 USD`, clean. A lone capital is a currency only before whitespace:
 *    `X.` and `X-` are one invalid token each. The engine reads one currency
 *    named `QAB.` and books it.
 *
 * Stock drops a directive at its first syntax error and reports nothing more
 * from it: no later syntax error in it, no repeated key on it, no posting
 * error below the bad line, and no duplicate of a commodity it would have
 * been. An invalid token is the lexer's and is reported wherever it is. After
 * an error stock's parser stays quiet until it has read three tokens, so a
 * flagless header on the line straight after a failed directive is dropped
 * without a word; one blank or comment line between them and it is reported.
 *
 * Syntactic and abstaining on doubt, like the tolerance scan: each rule reads
 * a block's own lines (strings are tracked, so a line inside a multi-line
 * narration is never a key), and a line that does not match a rule's exact
 * shape is left alone. A header's date is any spelling stock's lexer reads
 * (`2026-09-01`, `2026/09/01`, `2026-9-1`), so a ledger converted from
 * ledger-cli is checked too (w31/107). The engine's rc.18 reports the first
 * (its parse error); it still loads the other two. Remove a rule when the
 * engine rejects its construct; the live checks in
 * `scripts/verify-rustledger.ts` show when.
 */

const CURRENCY = String.raw`/?[A-Z][A-Z0-9'._-]*`;
const BOOKING_METHODS = "STRICT_WITH_SIZE|STRICT|FIFO|LIFO|HIFO|AVERAGE|NONE";
/** `open <account> <currencies> <BOOKING>`: a bare word after a currency list. */
const OPEN_WITH_BARE_BOOKING = new RegExp(
  String.raw`^${SOURCE_DATE}[ \t]+open[ \t]+\S+[ \t]+${CURRENCY}(?:[ \t]*,[ \t]*${CURRENCY})*[ \t]+(${BOOKING_METHODS})[ \t]*(?:;.*)?$`,
  "u",
);
const COMMODITY = new RegExp(
  String.raw`^${SOURCE_DATE}[ \t]+commodity[ \t]+([^\s;]+)`,
  "u",
);
/** A transaction header: a date, then `txn` or a flag, never a directive keyword. */
const TRANSACTION = new RegExp(
  String.raw`^${SOURCE_DATE}[ \t]+(?:txn\b|[*!&#?%]|[A-Z])(?=[ \t]|$)`,
  "u",
);
/** A key line: `key:` then a space, a quote or the end of the line (`k:"v"` is a key). */
const META_KEY = /^[ \t]+([a-z][A-Za-z0-9_-]*):(?=[ \t"]|$)/u;
/** A line that starts with a tag or a link: `#` alone is a posting's flag. */
const TAGS_LINE = /^[ \t]+[#^][A-Za-z0-9_/.-]/u;
/** A line of tags and links only, as stock's lexer reads them (`#a#b ^c ; x`). */
const TAGS_LINKS_ONLY = /^[ \t]+((?:[#^][A-Za-z0-9_/.-]+[ \t\r]*)+)(?:;.*)?$/u;
const TAG_OR_LINK = /([#^])([A-Za-z0-9_/.-]+)/gu;
/**
 * The engine's own error for a header's `|` (`P0024`). It is raised only when
 * the file fails to parse, then for some pipes and not others, and past
 * `allow_pipe_separator`; the scan's pipe errors take its place.
 */
export const ENGINE_PIPE_ERROR = /^Pipe symbol is deprecated$/u;
/** `option "allow_pipe_separator" "<value>"`, which turns the pipe's error off. */
const ALLOW_PIPE =
  /^option[ \t]+"allow_pipe_separator"[ \t]+"([^"\\]*)"[ \t\r]*(?:;.*)?$/u;
/** A dated line whose next token is a string: no flag, `txn` or keyword. */
const FLAGLESS_HEADER = new RegExp(String.raw`^${SOURCE_DATE}[ \t]*"`, "u");

/**
 * Where an account is written with a colon after it, so stock's lexer reads
 * the account and then a `:` its grammar cannot take. `before` is what puts
 * the account where it stands, which decides the tokens stock says it
 * expected instead (`null`: too many to list). A capital, a digit or a
 * non-ASCII letter after the colon continues the account; the engine already
 * refuses a lowercase letter or a second colon there, and stock adds an
 * invalid token for a dot, so those are left alone.
 */
const COLON_AFTER_ACCOUNT = String.raw`:(?![A-Za-z0-9:.]|[^\x00-\x7f])`;
const colonRule = (before: string, expecting: string | null) => ({
  pattern: new RegExp(
    String.raw`^(?:${before})(${STOCK_ACCOUNT})${COLON_AFTER_ACCOUNT}`,
    "u",
  ),
  expecting,
});
const HEADER_COLON_RULES = [
  colonRule(
    String.raw`${SOURCE_DATE}[ \t]+(?:open|close)[ \t]+`,
    "expecting end of file or EOL",
  ),
  colonRule(String.raw`${SOURCE_DATE}[ \t]+pad[ \t]+`, "expecting ACCOUNT"),
  colonRule(
    String.raw`${SOURCE_DATE}[ \t]+pad[ \t]+${STOCK_ACCOUNT}[ \t]+`,
    "expecting end of file or EOL",
  ),
  colonRule(
    String.raw`${SOURCE_DATE}[ \t]+balance[ \t]+`,
    "expecting PLUS or MINUS or LPAREN or NUMBER",
  ),
  colonRule(
    String.raw`${SOURCE_DATE}[ \t]+(?:note|document)[ \t]+`,
    "expecting STRING",
  ),
  // Any value of a custom directive, after its type string.
  colonRule(String.raw`${SOURCE_DATE}[ \t]+custom[ \t]+".*?[ \t]`, null),
];
const KEY_VALUE_COLON_RULES = [
  colonRule(
    String.raw`[ \t]+[a-z][A-Za-z0-9_-]+:[ \t]+`,
    "expecting end of file or EOL",
  ),
];
const POSTING_COLON_RULES = [
  colonRule(
    String.raw`[ \t]+(?:[*!&?%][ \t]*|[#A-Z][ \t]+)?`,
    "expecting end of file or EOL or ATAT or AT",
  ),
];
/** A number as stock's lexer reads one, and an expression of them (loosely: the engine refuses a malformed one). */
const NUMBER = String.raw`(?:\d[\d,]*\d|\d)(?:\.\d*)?`;
const NUMBER_EXPR = String.raw`(?:[-+(][ \t]*)*${NUMBER}(?:[ \t]*(?:[-+*/][ \t]*(?:[-+(][ \t]*)*${NUMBER}|\)))*`;
/**
 * Not one of stock's keywords where a currency could stand: `TRUE` and
 * `TRUE-` are a bool (and a `-`), `TRUEX` and `TRUE-1` are currencies.
 */
const keywordless = (keywords: string) =>
  String.raw`(?!(?:${keywords})(?![A-Z0-9'._-]*[A-Z0-9]))`;
const NOT_KEYWORD = keywordless("TRUE|FALSE|NULL");
const CURRENCY_TOKEN = String.raw`${NOT_KEYWORD}(?:${STOCK_CURRENCY})`;
/**
 * A currency stock's lexer ends before a `-` that the engine reads as part of
 * it: `QAB-` is `QAB` and then a `-`, `QAB-1` and `QAB-.X` are currencies, and
 * `AB-:Cash` is an account. `VALUE_THEN_MINUS` takes a keyword too, for the
 * places a bool or `NULL` is a value (`ref: TRUE-` is refused at the `-`).
 */
const VALUE_THEN_MINUS = String.raw`(${STOCK_CURRENCY})(?=-[-'._]*(?![\w'.:-]|[^\x00-\x7f]))`;
const CURRENCY_THEN_MINUS = NOT_KEYWORD + VALUE_THEN_MINUS;
/** What stock expects after a currency that ends a directive's amounts or a metadata value. */
const AT_EOL = "expecting end of file or EOL";
const minusRule = (
  before: string,
  expecting: string,
  value = CURRENCY_THEN_MINUS,
) => ({
  pattern: new RegExp(String.raw`^(?:${before})${value}`, "u"),
  expecting,
});
const HEADER_MINUS_RULES = [
  minusRule(
    String.raw`${SOURCE_DATE}[ \t]+open[ \t]+${STOCK_ACCOUNT}[ \t]+(?:${CURRENCY_TOKEN}[ \t]*,[ \t]*)*`,
    AT_EOL,
  ),
  minusRule(String.raw`${SOURCE_DATE}[ \t]+commodity[ \t]+`, AT_EOL),
  // The quoted currency only: a `-` after the base is the price's sign.
  minusRule(
    String.raw`${SOURCE_DATE}[ \t]+price[ \t]+${CURRENCY_TOKEN}[ \t]*${NUMBER_EXPR}[ \t]*`,
    AT_EOL,
  ),
  minusRule(
    String.raw`${SOURCE_DATE}[ \t]+balance[ \t]+${STOCK_ACCOUNT}[ \t]+${NUMBER_EXPR}(?:[ \t]*~[ \t]*${NUMBER_EXPR})?[ \t]*`,
    AT_EOL,
  ),
];
// A value alone may be a keyword; after a number, `TRUE` is stock's bool
// where a currency goes, its other syntax error.
const KEY_VALUE = String.raw`[ \t]+[a-z][A-Za-z0-9_-]+:[ \t]+`;
const KEY_VALUE_MINUS_RULES = [
  minusRule(KEY_VALUE, AT_EOL, VALUE_THEN_MINUS),
  minusRule(String.raw`${KEY_VALUE}${NUMBER_EXPR}[ \t]*`, AT_EOL),
];
/**
 * An amount among a `custom` directive's values whose currency runs into a
 * `-`; not a date's digits. After the number, `TRUE` is a bool value of its
 * own and the `-` the next value's sign all the same; `NULL` is no value there.
 */
const CUSTOM_AMOUNT_MINUS = new RegExp(
  String.raw`^${SOURCE_DATE}[ \t]+custom[ \t]+"[^"]*".*?[ \t](?!\d{4,}[-/]\d+[-/]\d+)${NUMBER_EXPR}[ \t]*${keywordless("NULL")}${VALUE_THEN_MINUS}`,
  "u",
);
/**
 * The token after that `-` stock refuses, since a custom value's `-` is the
 * next number's sign: a number there is a negative value and clean.
 */
const CUSTOM_AFTER_MINUS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^"[^"]*"/u, "STRING"],
  [/^\d{4,}[-/]\d+[-/]\d+/u, "DATE"],
  [/^(?:TRUE|FALSE)(?![A-Z0-9'._-])/u, "BOOL"],
  [new RegExp(`^${STOCK_ACCOUNT}`, "u"), "ACCOUNT"],
];
const CUSTOM_EXPECTING = "expecting PLUS or MINUS or LPAREN or NUMBER";
/** A capital or a digit that a `-` follows, not into a currency: the cheap test before a block's lines are read. */
const MAYBE_CURRENCY_MINUS = /[A-Z0-9]-[-'._]*(?![\w'.:-]|\P{ASCII})/u;
const minusMessage = (unexpected: string, expecting: string, written: string) =>
  `syntax error, unexpected ${unexpected}, ${expecting}: "${written}" is not a currency; a currency ends in a capital letter or a digit`;

/** An account's last component with that colon after it: the cheap test before a block's lines are read. */
const MAYBE_TRAILING_COLON = new RegExp(
  String.raw`:(?:[A-Z0-9]|[^\x00-\x7f])(?:[A-Za-z0-9-]|[^\x00-\x7f])*${COLON_AFTER_ACCOUNT}`,
  "u",
);
/** Where stock's lexer ends an invalid token: at whitespace, nothing else. */
const INVALID_TOKEN = /[^ \t\r\n]+/uy;

/**
 * What may stand before a currency in stock's grammar: a line's start,
 * whitespace, `{`, `,`, `@`, `~` or a `)`, or a number or an expression written
 * against it (`1QAB`, `2*3QAB`, `10/4/QAB`, where `/QAB` is a futures
 * currency). Not a letter, digit, `:` or `-'._/` otherwise, where the capital
 * is inside an account or a tag (`#a1/QAB.`), nor `#` or `^`, which start one.
 */
const CURRENCY_START = String.raw`(?=[A-Z/])(?<=^|[ \t\r\n{,@~)]|(?:^|[ \t\r\n{,@~])${NUMBER_EXPR})`;
/**
 * A currency as the engine reads it (`/?[A-Z][A-Z0-9'._-]*`, a futures one
 * with a digit or `'._-` before its first capital too) that ends in one of
 * `-'._`, after strings and `;` comments, which are matched first and skipped.
 */
const CURRENCY_RUN_OR_TOKEN_RE = new RegExp(
  String.raw`"(?:[^"\\]|\\.)*"|;[^\n]*|${CURRENCY_START}(?:\/[A-Z0-9'._-]*[A-Z]|[A-Z])[A-Z0-9'._-]*(?<=[-'._])(?![A-Z0-9'._-])`,
  "gu",
);
/** A capital or a digit that a currency's `.`, `_` or `'` follows, after any `-`: the cheap test before a file is read. */
const MAYBE_CURRENCY_TAIL =
  /[A-Z0-9]-*['._][-'._]*(?![A-Z0-9])|(?<![A-Z0-9'._-])[A-Z]-+(?![A-Z0-9'._-])/u;
/** What continues an account after a run of `-` (`X-:Cash`, `X-y:Cash`). */
const ACCOUNT_CHARACTER = /[\p{L}\p{N}:]/u;
const ACCOUNT = /^\p{Lu}[\p{L}\p{N}-]*(?::[\p{L}\p{N}][\p{L}\p{N}-]*)+$/u;

/** A value stock cannot tell apart from an equal one; see {@link valueIdentity}. */
type Identity = string | null | typeof UNSURE;
const UNSURE = Symbol("unsure");

/**
 * What stock's duplicate-key test sees of a value. Its parser records a repeat
 * only when the second value is not the same Python object as the first
 * (`value is not posting_or_kv.value`), so a repeat of a value CPython hands
 * out as one object is accepted: `TRUE` or `FALSE`, an empty value, a string of
 * no or one Latin-1 character, an account name (interned). Any other value is a
 * fresh object each time, even when equal (`"ab"`, a number, a date, a
 * currency), and repeating it is the error. Returns an identity for the first
 * kind and `null` for the second; a string with a backslash is `UNSURE`
 * (whether it decodes to one character is not worth guessing), and the rule
 * abstains on it.
 */
function valueIdentity(rest: string): Identity {
  const text = rest.trimStart();
  if (text.startsWith('"')) {
    let end = 1;
    let escaped = false;
    for (; end < text.length; end += 1) {
      if (text[end] === "\\") escaped = true;
      else if (text[end] === '"') break;
    }
    if (end >= text.length) return null; // the string goes on to the next line
    const content = text.slice(1, end);
    if (escaped) return UNSURE;
    const chars = [...content];
    if (chars.length === 0) return "str:";
    return chars.length === 1 && chars[0]!.codePointAt(0)! <= 0xff
      ? `str:${content}`
      : null;
  }
  const token = text.replace(/\s*;.*$/u, "").trim();
  if (token === "") return "none";
  if (token === "TRUE" || token === "FALSE") return `bool:${token}`;
  return ACCOUNT.test(token) ? `account:${token}` : null;
}

const error = (
  message: string,
  code: string,
  phase: BeancountError["phase"],
  file: string,
  line: number,
  column = 1,
): BeancountError => ({
  message,
  code,
  phase,
  hint: null,
  file,
  line,
  column,
  end_line: null,
  end_column: null,
  severity: "error",
});

/**
 * A block's own body lines with their index: not a line inside a multi-line
 * string, a blank line or a comment.
 */
function* ownLines(
  lines: readonly string[],
  firstBodyLine: number,
): Generator<{ index: number; line: string }> {
  let inString = false;
  for (let index = firstBodyLine; index < lines.length; index += 1) {
    const line = lines[index]!;
    const startedInString = inString;
    inString = endsInsideString(line, inString);
    if (startedInString) continue;
    const text = line.trim();
    if (text === "" || text.startsWith(";")) continue;
    yield { index, line };
  }
}

/**
 * A block's own body lines that hold a key or a posting, with their index: a
 * tags line is neither. `key` is the key line's match, `null` on a posting.
 */
function* bodyLines(
  lines: readonly string[],
  firstBodyLine: number,
): Generator<{ index: number; line: string; key: RegExpExecArray | null }> {
  for (const { index, line } of ownLines(lines, firstBodyLine)) {
    if (!TAGS_LINE.test(line)) yield { index, line, key: META_KEY.exec(line) };
  }
}

/** A Python set of strings as `repr` prints it; a set's own order is a hash's, so this keeps the written one. */
const pythonSet = (items: readonly string[]) =>
  items.length === 0
    ? "set()"
    : `{${[...new Set(items)].map((item) => `'${item}'`).join(", ")}}`;

/**
 * Stock's `TagsLinks` repr for each line of tags and links a transaction
 * block writes after its first posting, which stock refuses and does not
 * apply. A tags line stock's lexer would not read as tags alone is left alone.
 */
function lateTagsLinks(
  lines: readonly string[],
  firstBodyLine: number,
): string[] {
  const late: string[] = [];
  let posted = false;
  for (const { line } of ownLines(lines, firstBodyLine)) {
    if (!TAGS_LINE.test(line)) {
      posted ||= !META_KEY.test(line);
      continue;
    }
    const written = TAGS_LINKS_ONLY.exec(line)?.[1];
    if (!posted || written === undefined) continue;
    const tags: string[] = [];
    const links: string[] = [];
    for (const [, sigil, name] of written.matchAll(TAG_OR_LINK)) {
      (sigil === "#" ? tags : links).push(name!);
    }
    late.push(`TagsLinks(tags=${pythonSet(tags)}, links=${pythonSet(links)})`);
  }
  return late;
}

/** The tags and links after a header's strings. */
const HEADER_TAGS_LINKS = /^(?:[#^][A-Za-z0-9_/.-]+|[ \t\r])*/u;
/** A `|` after them with nothing but more of the same, which the engine loads. */
const PIPE_AFTER_TAGS = /^\|(?:[#^][A-Za-z0-9_/.-]+|[ \t\r|])*(?:;.*)?$/u;

/** Where a header stops reading as stock's grammar, and whether the engine misses it. */
interface Unread extends Place {
  /** A `|` after the tags and links: the engine loads it, so it is reported. */
  pipe: boolean;
}

/**
 * A transaction header as stock's grammar reads it after the flag: strings
 * and `|` (`* "payee" | "narration"`, `* | "x"`), then tags and links. Returns
 * where each `|` stands, and where the first token stock cannot take there is
 * (`* "x" #tag |`, `* "x" Assets:Cash`), the syntax error that drops the
 * directive. `header` is the header's lines, which a multi-line string spans;
 * a string that does not close there is left alone (`null`).
 */
function readHeader(
  header: string,
  flagEnd: number,
): { pipes: Place[]; unread?: Unread } | null {
  // Only a string spans lines, so the line is counted as each one is read.
  let index = 0;
  let lineStart = 0;
  const placeOf = (at: number): Place => ({ index, column: at - lineStart });
  const pipes: Place[] = [];
  let at = flagEnd;
  for (; at < header.length; at += 1) {
    const char = header[at]!;
    if (char === "|") {
      pipes.push(placeOf(at));
    } else if (char === '"') {
      const string = /"(?:[^\\"]|\\[\s\S])*"/uy;
      string.lastIndex = at;
      const found = string.exec(header)?.[0];
      if (found === undefined) return null;
      const lastNewline = found.lastIndexOf("\n");
      if (lastNewline >= 0) {
        index += found.split("\n").length - 1;
        lineStart = at + lastNewline + 1;
      }
      at += found.length - 1;
    } else if (char !== " " && char !== "\t" && char !== "\r") {
      break;
    }
  }
  at += HEADER_TAGS_LINKS.exec(header.slice(at))![0].length;
  const rest = header.slice(at);
  if (rest === "" || rest.startsWith(";")) return { pipes };
  return {
    pipes,
    unread: { ...placeOf(at), pipe: PIPE_AFTER_TAGS.test(rest) },
  };
}

/**
 * The first body line stock's lexer starts with a tag or a link and that holds
 * more than tags and links (`#late Assets:Cash`): a syntax error that drops
 * the directive. The engine raises it too, so it is not reported here.
 */
function unreadTagsLine(
  lines: readonly string[],
  firstBodyLine: number,
): Place | undefined {
  for (const { index, line } of ownLines(lines, firstBodyLine)) {
    if (TAGS_LINE.test(line) && !TAGS_LINKS_ONLY.test(line)) {
      return { index, column: 0 };
    }
  }
  return undefined;
}

/** The duplicate keys a transaction block's own lines repeat, with their owner. */
function duplicateMetadataKeys(
  lines: readonly string[],
  firstBodyLine: number,
): Array<{ key: string; posting: boolean }> {
  const repeated: Array<{ key: string; posting: boolean }> = [];
  // Metadata after the header belongs to the transaction until a posting line
  // opens; a key line after a posting belongs to that posting. Stock keeps the
  // first value of a key and compares every repeat with it.
  let owner = { posting: false, keys: new Map<string, Identity>() };
  for (const { line, key: found } of bodyLines(lines, firstBodyLine)) {
    if (found === null) {
      owner = { posting: true, keys: new Map() };
      continue;
    }
    const key = found[1]!;
    const identity = valueIdentity(line.slice(found[0].length));
    if (!owner.keys.has(key)) {
      owner.keys.set(key, identity);
      continue;
    }
    const first = owner.keys.get(key);
    const sameObject = first !== null && first === identity;
    if (!sameObject && first !== UNSURE && identity !== UNSURE) {
      repeated.push({ key, posting: owner.posting });
    }
  }
  return repeated;
}

/** A place in a block: its line (0 is the header) and column, both from 0. */
interface Place {
  index: number;
  column: number;
}

/** The syntax error stock's parser stops a directive at. */
interface StockSyntaxError extends Place {
  code: string;
  message: string;
  /** A flagless header, which stock leaves unreported right after an error. */
  flagless: boolean;
}

/** `line` as tokens: each string's content blanked, the comment cut, columns kept. */
function tokensOf(line: string): string {
  return line.replace(/"(?:[^"\\]|\\.)*(?:"|$)|;.*/gu, (token) =>
    token.startsWith(";") ? "" : token.replace(/[^"]/gu, " "),
  );
}

/** The first account `line` writes with a colon after it where one of `rules` places it. */
function trailingColon(
  line: string,
  rules: readonly ReturnType<typeof colonRule>[],
): Omit<StockSyntaxError, "index"> | undefined {
  if (rules.length === 0) return undefined;
  const tokens = tokensOf(line);
  for (const { pattern, expecting } of rules) {
    const found = pattern.exec(tokens);
    if (found === null) continue;
    return {
      column: found[0].length - 1,
      code: "P0012",
      message: `syntax error, unexpected COLON${expecting === null ? "" : `, ${expecting}`}: the account "${found[1]}:" ends with a colon`,
      flagless: false,
    };
  }
  return undefined;
}

/** The currency as the engine reads it, from where stock's starts (`QAB-`, `QAB-.`). */
const WRITTEN_CURRENCY = /\/?[A-Z0-9'._-]+/uy;
const writtenAt = (tokens: string, at: number) => {
  WRITTEN_CURRENCY.lastIndex = at;
  return WRITTEN_CURRENCY.exec(tokens)![0];
};

/** The first currency `line` runs into a `-` where one of `rules` places it. */
function currencyMinus(
  line: string,
  rules: readonly ReturnType<typeof minusRule>[],
): Omit<StockSyntaxError, "index"> | undefined {
  const tokens = tokensOf(line);
  for (const { pattern, expecting } of rules) {
    const found = pattern.exec(tokens);
    if (found === null) continue;
    return {
      column: found[0].length,
      code: "P0012",
      message: minusMessage(
        "MINUS",
        expecting,
        writtenAt(tokens, found[0].length - found[1]!.length),
      ),
      flagless: false,
    };
  }
  return undefined;
}

/** A posting's currency that runs into a `-`, as `posting-syntax-errors.ts` reads it. */
function postingMinus(
  line: string,
): Omit<StockSyntaxError, "index"> | undefined {
  const found = postingCurrencyMinus(line);
  return (
    found && {
      column: found.column,
      code: "P0012",
      message: minusMessage(
        "MINUS",
        `expecting ${found.expecting}`,
        found.written,
      ),
      flagless: false,
    }
  );
}

/**
 * A `custom` amount whose currency runs into a `-` (`custom "budget" 1 QAB-`).
 * Stock reads the `-` as the next value's sign, so its error is the token
 * after it: the end of the line (which stock places on the next line), the end
 * of the file, a string, a date, a bool or an account. A number there is a
 * negative value, stock reads it clean, and so does this; a token the engine
 * refuses itself (a bare currency, a tag) is left alone.
 */
function customCurrencyMinus(
  header: string,
  endsFile: () => boolean,
): StockSyntaxError | undefined {
  const tokens = tokensOf(header);
  const found = CUSTOM_AMOUNT_MINUS.exec(tokens);
  if (found === null) return undefined;
  const start = found[0].length - found[1]!.length;
  let at = found[0].length;
  while (tokens[at] === "-") at += 1;
  // A `.` there is the lexer's invalid token instead, which no token below
  // starts with.
  const next = tokens.slice(at).replace(/^[ \t\r]+/u, "");
  const written = tokens.slice(start, at);
  const column = tokens.length - next.length;
  const refused = (place: Place, unexpected: string) => ({
    ...place,
    code: "P0012",
    message: minusMessage(unexpected, CUSTOM_EXPECTING, written),
    flagless: false,
  });
  if (next === "") {
    return endsFile()
      ? refused({ index: 0, column }, "end of file")
      : refused({ index: 1, column: 0 }, "EOL");
  }
  const token = CUSTOM_AFTER_MINUS.find(([pattern]) => pattern.test(next));
  return token && refused({ index: 0, column }, token[1]);
}

/**
 * The first syntax error stock's parser meets in a dated block's own lines,
 * the one that drops the directive: a bare booking method, a string where the
 * flag goes, an account with a colon after it, or a currency that runs into a
 * `-`. `endsFile` says whether the header is the file's last line with no line
 * break after it.
 */
function firstSyntaxError(
  text: string,
  lines: readonly string[],
  firstBodyLine: number,
  transaction: boolean,
  endsFile: () => boolean,
): StockSyntaxError | undefined {
  const header = lines[0]!;
  const maybeColon = MAYBE_TRAILING_COLON.test(text);
  const maybeMinus = MAYBE_CURRENCY_MINUS.test(text);
  const onHeader: StockSyntaxError[] = [];
  const flagless = FLAGLESS_HEADER.exec(header);
  if (flagless !== null) {
    onHeader.push({
      index: 0,
      column: flagless[0].length - 1,
      code: "P0012",
      message:
        "syntax error, unexpected STRING: a transaction has a flag (* or !) or txn after its date",
      flagless: true,
    });
  }
  const booking = OPEN_WITH_BARE_BOOKING.exec(header)?.[1];
  if (booking !== undefined) {
    onHeader.push({
      index: 0,
      column: header.search(new RegExp(`${booking}[ \\t]*(?:;.*)?$`, "u")),
      code: "SYNTAX",
      message: `syntax error, unexpected CURRENCY, expecting end of file or EOL: the booking method is a quoted string, "${booking}"`,
      flagless: false,
    });
  }
  const colon = maybeColon
    ? trailingColon(header, HEADER_COLON_RULES)
    : undefined;
  if (colon !== undefined) onHeader.push({ index: 0, ...colon });
  if (maybeMinus) {
    const minus = currencyMinus(header, HEADER_MINUS_RULES);
    if (minus !== undefined) onHeader.push({ index: 0, ...minus });
    const custom = customCurrencyMinus(header, endsFile);
    if (custom !== undefined) onHeader.push(custom);
  }
  if (onHeader.length > 0) {
    return onHeader.reduce((a, b) => earlier(a, b)!);
  }
  if (!maybeColon && !maybeMinus) return undefined;
  for (const { index, line, key } of bodyLines(lines, firstBodyLine)) {
    const colon = maybeColon
      ? trailingColon(
          line,
          key !== null
            ? KEY_VALUE_COLON_RULES
            : transaction
              ? POSTING_COLON_RULES
              : [],
        )
      : undefined;
    const minus = !maybeMinus
      ? undefined
      : key !== null
        ? currencyMinus(line, KEY_VALUE_MINUS_RULES)
        : transaction
          ? postingMinus(line)
          : undefined;
    const found = earlier(
      colon && { index, ...colon },
      minus && { index, ...minus },
    );
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Where stock's lexer starts an invalid token in a currency the engine reads
 * whole: at the first `.`, `_` or `'` after its last capital or digit and any
 * `-` (`QAB.`, `QAB-.`), or at the capital itself when it is a lone one
 * (`X.`, `X-`), since a lone capital is a currency only before whitespace. A
 * `-` alone after the currency is a token of its own, refused by the grammar
 * instead (see `currencyMinus`), and a lone capital's `-` that an account goes
 * on from (`X-:Cash`) is left alone.
 */
function currencyTailOffsets(text: string): number[] {
  if (!MAYBE_CURRENCY_TAIL.test(text)) return [];
  const offsets: number[] = [];
  for (const match of text.matchAll(CURRENCY_RUN_OR_TOKEN_RE)) {
    const run = match[0];
    if (run.startsWith('"') || run.startsWith(";")) continue;
    let last = run.length - 1;
    while (last > 0 && !/[A-Z0-9]/u.test(run[last]!)) last -= 1;
    if (last === run.length - 1) continue;
    if (last === 0) {
      const next = text[match.index + run.length];
      const continuesAccount =
        /^[A-Z]-+$/u.test(run) &&
        next !== undefined &&
        ACCOUNT_CHARACTER.test(next);
      if (!continuesAccount) offsets.push(match.index);
      continue;
    }
    let at = last + 1;
    while (run[at] === "-") at += 1;
    if (at < run.length) offsets.push(match.index + at);
  }
  return offsets;
}

/**
 * Each invalid token stock's lexer reads in `source`: a number with no leading
 * digit (`.50`, `-.5`), at the dots `withLeadingZeros` gives a zero so none is
 * read clean, and a currency that ends in `.`, `_` or `'` (`QAB.`), or a lone
 * capital before one of `-'._` (`X.`). The token runs to the next whitespace
 * (`(.5+1)` is `.5+1)`, `{1 QAB.}` is `.}`), and the lexer skips all of it, so
 * a dot or a currency inside one starts no other. Lines are counted from 0.
 */
function invalidTokens(
  source: string,
): Array<{ line: number; column: number; token: string }> {
  const text = commentSkippedLines(source);
  const found: Array<{ line: number; column: number; token: string }> = [];
  const tails = currencyTailOffsets(text);
  const dots = leadingDotOffsets(text);
  const offsets =
    tails.length === 0 ? dots : [...dots, ...tails].sort((a, b) => a - b);
  let line = 0;
  let lineStart = 0;
  let tokenEnd = 0;
  for (const offset of offsets) {
    if (offset < tokenEnd) continue;
    for (
      let newline = text.indexOf("\n", lineStart);
      newline !== -1 && newline < offset;
      newline = text.indexOf("\n", lineStart)
    ) {
      line += 1;
      lineStart = newline + 1;
    }
    INVALID_TOKEN.lastIndex = offset;
    const token = INVALID_TOKEN.exec(text)![0];
    tokenEnd = offset + token.length;
    found.push({ line, column: offset - lineStart, token });
  }
  return found;
}

/** The earlier of two places in a block. */
const earlier = <T extends Place, U extends Place>(
  a: T | undefined,
  b: U | undefined,
): T | U | undefined =>
  a === undefined ||
  (b !== undefined &&
    (b.index < a.index || (b.index === a.index && b.column < a.column)))
    ? b
    : a;

export function stockSyntaxErrors(
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const index = indexBlocks(files);
  const errors: BeancountError[] = [];
  const commodities: {
    file: string;
    line: number;
    date: string;
    currency: string;
    seq: number;
  }[] = [];
  for (const file of loadedFiles(files, entryPoint)) {
    const source = files[file]!;
    // The 0-based index of the file's last line, counted when a rule asks.
    let lastLine: number | undefined;
    const lastLineIndex = () => (lastLine ??= source.split("\n").length - 1);
    const invalid = invalidTokens(source);
    const fileErrors = invalid.map(({ line, column, token }) =>
      error(
        `Invalid token: '${token}'`,
        "P0012",
        "parse",
        file,
        line + 1,
        column + 1,
      ),
    );
    const invalidColumn = new Map<number, number>();
    for (const { line, column } of invalid) {
      if (!invalidColumn.has(line)) invalidColumn.set(line, column);
    }
    let previous: { endLine: number; failed: boolean } | undefined;
    // Stock reads options per file, as it meets them.
    let allowPipe = false;
    for (const block of index.blocks(file)) {
      const lines = block.text.split("\n");
      let lexed: Place | undefined;
      for (let at = 0; invalidColumn.size > 0 && at < lines.length; at += 1) {
        const column = invalidColumn.get(block.startLine + at);
        if (column !== undefined) {
          lexed = { index: at, column };
          break;
        }
      }
      if (!block.isDated) {
        previous = { endLine: block.endLine, failed: lexed !== undefined };
        const allow = ALLOW_PIPE.exec(lines[0]!)?.[1];
        if (allow !== undefined) {
          allowPipe = ["1", "true", "yes"].includes(allow.toLowerCase());
        }
        continue;
      }
      const header = lines[0]!;
      const line = block.startLine + 1;
      const firstBodyLine = block.headerEndLine - block.startLine + 1;
      const flag = TRANSACTION.exec(header);
      const transaction = flag !== null;

      const syntax = firstSyntaxError(
        block.text,
        lines,
        firstBodyLine,
        transaction,
        () => block.startLine === lastLineIndex(),
      );
      const read =
        flag === null
          ? null
          : readHeader(
              lines.slice(0, firstBodyLine).join("\n"),
              flag[0].length,
            );
      // Syntax errors that end what stock reads of the directive. The engine
      // raises them itself, except a `|` after the header's tags.
      const unread = transaction
        ? (read?.unread ?? unreadTagsLine(lines, firstBodyLine))
        : undefined;
      const failed = earlier(earlier(syntax, lexed), unread);
      if (
        read?.unread !== undefined &&
        failed === read.unread &&
        read.unread.pipe
      ) {
        fileErrors.push(
          error(
            "syntax error, unexpected PIPE, expecting end of file or EOL or TAG or LINK: a | stands only between the payee and the narration, before any tag or link",
            "P0012",
            "parse",
            file,
            block.startLine + read.unread.index + 1,
            read.unread.column + 1,
          ),
        );
      }
      const quiet =
        syntax?.flagless === true &&
        previous?.failed === true &&
        previous.endLine === block.startLine;
      if (syntax !== undefined && failed === syntax && !quiet) {
        fileErrors.push(
          error(
            syntax.message,
            syntax.code,
            "parse",
            file,
            block.startLine + syntax.index + 1,
            syntax.column + 1,
          ),
        );
      }
      previous = { endLine: block.endLine, failed: failed !== undefined };

      // Stock reports each pipe as it reads it, so one before the directive's
      // syntax error is reported too.
      for (const pipe of allowPipe ? [] : (read?.pipes ?? [])) {
        if (failed !== undefined && earlier(failed, pipe) !== pipe) break;
        fileErrors.push(
          error(
            "Pipe symbol is deprecated.",
            "P0024",
            "parse",
            file,
            line,
            pipe.index === 0 ? pipe.column + 1 : 1,
          ),
        );
      }

      const commodity = COMMODITY.exec(header);
      if (commodity !== null) {
        // A commodity stock dropped is none it counts.
        if (failed === undefined) {
          commodities.push({
            file,
            line,
            // As the engine dates it: as written, `2026/09/01` sorts after
            // `2026-09-03`, and the error would land on the earlier date.
            date: sourceDateOf(header)!,
            currency: commodity[1]!,
            seq: commodities.length,
          });
        }
        continue;
      }

      if (transaction) {
        // Stock checks a transaction's keys and tags lines once it has read
        // all of it.
        const keys =
          failed === undefined
            ? duplicateMetadataKeys(lines, firstBodyLine)
            : [];
        for (const { key, posting } of keys) {
          fileErrors.push(
            error(
              `${posting ? "Duplicate posting metadata field" : "Duplicate metadata field on entry"}: ${key}`,
              "DUPLICATE_METADATA",
              "parse",
              file,
              line,
            ),
          );
        }
        const late =
          failed === undefined ? lateTagsLinks(lines, firstBodyLine) : [];
        for (const tagsLinks of late) {
          fileErrors.push(
            error(
              `Tags or links not allowed after first Posting: ${tagsLinks}`,
              "TAGS_AFTER_POSTING",
              "parse",
              file,
              line,
            ),
          );
        }
        // Stock places a posting's cost and price errors on the posting, for
        // each posting it read before the directive's syntax error.
        for (const body of bodyLines(lines, firstBodyLine)) {
          if (failed !== undefined && body.index >= failed.index) break;
          if (body.key !== null) continue;
          for (const { code, message } of postingSyntaxErrors(body.line)) {
            fileErrors.push(
              error(
                message,
                code,
                "parse",
                file,
                block.startLine + body.index + 1,
              ),
            );
          }
        }
      }
    }
    errors.push(
      ...fileErrors.sort((a, b) => a.line! - b.line! || a.column! - b.column!),
    );
  }

  // Stock walks the sorted entries (date, then line) and flags each later
  // directive for a currency it has already seen, whichever file it is in.
  commodities.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      a.line - b.line ||
      a.seq - b.seq,
  );
  const seen = new Set<string>();
  for (const entry of commodities) {
    if (!seen.has(entry.currency)) {
      seen.add(entry.currency);
      continue;
    }
    errors.push(
      error(
        `Duplicate commodity directives for '${entry.currency}'`,
        "DUPLICATE_COMMODITY",
        "validate",
        entry.file,
        entry.line,
      ),
    );
  }
  return errors;
}
