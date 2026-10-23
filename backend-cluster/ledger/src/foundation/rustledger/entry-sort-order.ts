import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import { loadedFiles, splitIntoBlocks } from "./source-slice";

/** Beancount's `SORT_ORDER`; every other directive sorts as a transaction. */
const DIRECTIVE_SORT_ORDER: Partial<Record<DirectiveJson["type"], number>> = {
  open: -2,
  balance: -1,
  document: 1,
  close: 2,
};

const KEYWORD_TYPES = new Set<string>([
  "open",
  "close",
  "commodity",
  "pad",
  "balance",
  "note",
  "document",
  "event",
  "price",
  "query",
  "custom",
]);

const DATED_HEADER = /^(\d{4}-\d{2}-\d{2})\s+(\S+)/;

/** The directive type a dated header line starts, from its keyword or flag. */
function headerType(keyword: string): string {
  return KEYWORD_TYPES.has(keyword) ? keyword : "transaction";
}

/**
 * Line numbers of the dated directives in `files`, per `date|type`. With an
 * entry point, only the files it loads, in the order the engine emits them (the
 * entry point, then its includes depth first), each file's lines ascending; a
 * line then goes to the directive that came from that file. Pooled and sorted
 * across files, a main-file entry took an included file's line number, and a
 * stray `.bean` file nothing includes threw the counts off (w21/843, w21/844).
 * Without one, every file pooled and sorted, as before. Line numbers alone, as
 * Beancount's `entry_sortkey` uses.
 */
function sourceLines(
  files: FileMap,
  entryPoint: string | undefined,
): Map<string, number[]> {
  const lines = new Map<string, number[]>();
  const names =
    entryPoint === undefined
      ? Object.keys(files)
      : loadedFiles(files, entryPoint);
  for (const name of names) {
    for (const block of splitIntoBlocks(files[name]!)) {
      if (!block.isDated) continue;
      const match = DATED_HEADER.exec(block.text);
      if (!match) continue;
      const key = `${match[1]}|${headerType(match[2])}`;
      const bucket = lines.get(key);
      if (bucket) bucket.push(block.startLine + 1);
      else lines.set(key, [block.startLine + 1]);
    }
  }
  if (entryPoint === undefined) {
    lines.forEach((bucket) => bucket.sort((left, right) => left - right));
  }
  return lines;
}

/**
 * Restore Beancount's same-day order: date, then the type rank (open, balance,
 * everything else, document, close), then line number. rustledger groups a
 * day's directives by kind instead (balance, pad, transactions, note, event,
 * price, custom), so a transaction written before a same-day pad was walked
 * after it and running balances read "+100 → 500" (w21/134).
 *
 * The directives carry no source position, so each takes the next line of its
 * `date|type` from the source text, in the engine's order. A `date|type` whose
 * count disagrees with the source (a plugin added a directive — `auto_accounts`'
 * opens, `implicit_prices`' prices — or a block failed to parse) cannot be
 * mapped to lines, so its directives keep the engine's order and follow the
 * ones that can, within their type rank. Only that key is affected: the rest of
 * the day keeps its source order, where one generated directive used to revert
 * the whole day to the engine's grouping and bring the wrong running balance
 * back (w21/324).
 */
export function restoreEntrySortOrder(
  directives: DirectiveJson[],
  files: FileMap,
  entryPoint?: string,
): DirectiveJson[] {
  const lines = sourceLines(files, entryPoint);
  const counts = new Map<string, number>();
  directives.forEach((directive) => {
    const key = `${directive.date}|${directive.type}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const unmatchedKeys = new Set<string>();
  counts.forEach((count, key) => {
    if ((lines.get(key)?.length ?? 0) !== count) unmatchedKeys.add(key);
  });

  const taken = new Map<string, number>();
  return directives
    .map((directive, index) => {
      const key = `${directive.date}|${directive.type}`;
      const next = taken.get(key) ?? 0;
      taken.set(key, next + 1);
      return {
        directive,
        index,
        lineno: unmatchedKeys.has(key) ? 0 : (lines.get(key)?.[next] ?? 0),
      };
    })
    .sort((left, right) => {
      const dateOrder = left.directive.date.localeCompare(right.directive.date);
      if (dateOrder !== 0) return dateOrder;
      const typeOrder =
        (DIRECTIVE_SORT_ORDER[left.directive.type] ?? 0) -
        (DIRECTIVE_SORT_ORDER[right.directive.type] ?? 0);
      if (typeOrder !== 0) return typeOrder;
      // Within a rank, the directives with a known line come first, by line;
      // the rest follow in the engine's order. Two groups keep the comparison
      // transitive.
      const leftKnown = left.lineno > 0;
      const rightKnown = right.lineno > 0;
      if (leftKnown !== rightKnown) return leftKnown ? -1 : 1;
      if (leftKnown && left.lineno !== right.lineno) {
        return left.lineno - right.lineno;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.directive);
}
