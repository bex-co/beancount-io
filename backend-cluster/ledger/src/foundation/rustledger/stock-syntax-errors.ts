import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { endsInsideString, loadedFiles } from "./source-slice";

/**
 * Three things stock `bean-check` refuses that rustledger 0.24.0 loads without
 * a word (w23/240), reported at their line the way the mid-currency balance
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
 *    key on an `open` or `commodity` is accepted there, so it is here.
 *
 * Syntactic and abstaining on doubt, like the tolerance scan: each rule reads
 * a block's own lines (strings are tracked, so a line inside a multi-line
 * narration is never a key), and a line that does not match a rule's exact
 * shape is left alone. The engine's rc.18 reports the first (its parse error);
 * it still loads the other two. Remove a rule when the engine rejects its
 * construct; the live checks in `scripts/verify-rustledger.ts` show when.
 */

const CURRENCY = String.raw`/?[A-Z][A-Z0-9'._-]*`;
const BOOKING_METHODS = "STRICT_WITH_SIZE|STRICT|FIFO|LIFO|HIFO|AVERAGE|NONE";
/** `open <account> <currencies> <BOOKING>`: a bare word after a currency list. */
const OPEN_WITH_BARE_BOOKING = new RegExp(
  String.raw`^\d{4}-\d{2}-\d{2}[ \t]+open[ \t]+\S+[ \t]+${CURRENCY}(?:[ \t]*,[ \t]*${CURRENCY})*[ \t]+(${BOOKING_METHODS})[ \t]*(?:;.*)?$`,
  "u",
);
const COMMODITY = /^(\d{4}-\d{2}-\d{2})[ \t]+commodity[ \t]+([^\s;]+)/u;
/** A transaction header: a date, then `txn` or a flag, never a directive keyword. */
const TRANSACTION =
  /^\d{4}-\d{2}-\d{2}[ \t]+(?:txn\b|[*!&#?%]|[A-Z])(?=[ \t]|$)/u;
/** A key line: `key:` then a space, a quote or the end of the line (`k:"v"` is a key). */
const META_KEY = /^[ \t]+([a-z][A-Za-z0-9_-]*):(?=[ \t"]|$)/u;
const TAGS_LINE = /^[ \t]+[#^]/u;
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
  let inString = false;
  for (let index = firstBodyLine; index < lines.length; index += 1) {
    const line = lines[index]!;
    const startedInString = inString;
    inString = endsInsideString(line, inString);
    if (startedInString) continue;
    const text = line.trim();
    if (text === "" || text.startsWith(";") || TAGS_LINE.test(line)) continue;
    const found = META_KEY.exec(line);
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
    for (const block of index.blocks(file)) {
      if (!block.isDated) continue;
      const lines = block.text.split("\n");
      const header = lines[0]!;
      const line = block.startLine + 1;

      const booking = OPEN_WITH_BARE_BOOKING.exec(header)?.[1];
      if (booking !== undefined) {
        const column = header.search(
          new RegExp(`${booking}[ \\t]*(?:;.*)?$`, "u"),
        );
        errors.push(
          error(
            `syntax error, unexpected CURRENCY, expecting end of file or EOL: the booking method is a quoted string, "${booking}"`,
            "SYNTAX",
            "parse",
            file,
            line,
            column + 1,
          ),
        );
        continue;
      }

      const commodity = COMMODITY.exec(header);
      if (commodity !== null) {
        commodities.push({
          file,
          line,
          date: commodity[1]!,
          currency: commodity[2]!,
          seq: commodities.length,
        });
        continue;
      }

      if (TRANSACTION.test(header)) {
        for (const { key, posting } of duplicateMetadataKeys(
          lines,
          block.headerEndLine - block.startLine + 1,
        )) {
          errors.push(
            error(
              `${posting ? "Duplicate posting metadata field" : "Duplicate metadata field on entry"}: ${key}`,
              "DUPLICATE_METADATA",
              "parse",
              file,
              line,
            ),
          );
        }
      }
    }
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
