import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { commentSkippedLines, leadingDotOffsets } from "./parseable-files";
import { postingSyntaxErrors, STOCK_ACCOUNT } from "./posting-syntax-errors";
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
 *    label in one cost spec (w31/120), on the posting's line: see
 *    `posting-syntax-errors.ts`;
 *  - three spellings stock's lexer and grammar refuse (w31/121): an account
 *    with a colon after it (`Assets:Cash:`, `syntax error, unexpected COLON`,
 *    with the tokens stock expected there), which the engine books to
 *    `Assets:Cash`; a string where a dated line's flag goes (`2026-09-02 "x"`,
 *    `syntax error, unexpected STRING`), which the engine reads as a `*`
 *    transaction; and a number with no leading digit (`.50`,
 *    `Invalid token: '.50'`), which `withLeadingZeros` reads as 0.50 so the
 *    figure stays right while the error says the text is wrong.
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
const TAGS_LINE = /^[ \t]+[#^]/u;
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
/** An account's last component with that colon after it: the cheap test before a block's lines are read. */
const MAYBE_TRAILING_COLON = new RegExp(
  String.raw`:(?:[A-Z0-9]|[^\x00-\x7f])(?:[A-Za-z0-9-]|[^\x00-\x7f])*${COLON_AFTER_ACCOUNT}`,
  "u",
);
/** Where stock's lexer ends an invalid token: at whitespace, nothing else. */
const INVALID_TOKEN = /[^ \t\r\n]+/uy;
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
 * A block's own body lines that hold a key or a posting, with their index: a
 * line inside a multi-line string, a blank line, a comment and a tags line are
 * neither. `key` is the key line's match, `null` on a posting.
 */
function* bodyLines(
  lines: readonly string[],
  firstBodyLine: number,
): Generator<{ index: number; line: string; key: RegExpExecArray | null }> {
  let inString = false;
  for (let index = firstBodyLine; index < lines.length; index += 1) {
    const line = lines[index]!;
    const startedInString = inString;
    inString = endsInsideString(line, inString);
    if (startedInString) continue;
    const text = line.trim();
    if (text === "" || text.startsWith(";") || TAGS_LINE.test(line)) continue;
    yield { index, line, key: META_KEY.exec(line) };
  }
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

/**
 * The first syntax error stock's parser meets in a dated block's own lines,
 * the one that drops the directive: a bare booking method, a string where the
 * flag goes, or an account with a colon after it.
 */
function firstSyntaxError(
  text: string,
  lines: readonly string[],
  firstBodyLine: number,
  transaction: boolean,
): StockSyntaxError | undefined {
  const header = lines[0]!;
  const maybeColon = MAYBE_TRAILING_COLON.test(text);
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
  if (onHeader.length > 0) {
    return onHeader.reduce((a, b) => (b.column < a.column ? b : a));
  }
  if (!maybeColon) return undefined;
  for (const { index, line, key } of bodyLines(lines, firstBodyLine)) {
    const found = trailingColon(
      line,
      key !== null
        ? KEY_VALUE_COLON_RULES
        : transaction
          ? POSTING_COLON_RULES
          : [],
    );
    if (found !== undefined) return { index, ...found };
  }
  return undefined;
}

/**
 * Each number `source` writes with no leading digit (`.50`, `-.5`), as stock's
 * lexer refuses it: the token runs from the dot to the next whitespace
 * (`(.5+1)` is `.5+1)`). These are the dots `withLeadingZeros` gives a zero,
 * so none is read clean. Lines are counted from 0.
 */
function invalidTokens(
  source: string,
): Array<{ line: number; column: number; token: string }> {
  const text = commentSkippedLines(source);
  const found: Array<{ line: number; column: number; token: string }> = [];
  let line = 0;
  let lineStart = 0;
  for (const offset of leadingDotOffsets(text)) {
    for (
      let newline = text.indexOf("\n", lineStart);
      newline !== -1 && newline < offset;
      newline = text.indexOf("\n", lineStart)
    ) {
      line += 1;
      lineStart = newline + 1;
    }
    INVALID_TOKEN.lastIndex = offset;
    found.push({
      line,
      column: offset - lineStart,
      token: INVALID_TOKEN.exec(text)![0],
    });
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
    const invalid = invalidTokens(files[file]!);
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
        continue;
      }
      const header = lines[0]!;
      const line = block.startLine + 1;
      const firstBodyLine = block.headerEndLine - block.startLine + 1;
      const transaction = TRANSACTION.test(header);

      const syntax = firstSyntaxError(
        block.text,
        lines,
        firstBodyLine,
        transaction,
      );
      const failed = earlier(syntax, lexed);
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
        // Stock checks a transaction's keys once it has read all of it.
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
