import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { beancountPluginRuns } from "./plugins/collect-plugins";
import { includeTraversalOrder, loadedFiles } from "./source-slice";

/** rustledger's `noduplicates` error, raised for each later copy. */
const DUPLICATE = /^Duplicate transaction: (\d{4}-\d{2}-\d{2}) "(.*)"$/u;
/** A metadata line, which Beancount leaves out when it compares entries. */
const METADATA = /^\s+[a-z][\w-]*:(?:\s|$)/u;

/** A block's text as entries compare: no metadata, comments or spacing. */
const identity = (text: string) =>
  text
    .split("\n")
    .filter((line) => !METADATA.test(line))
    .map((line) => line.replace(/\s;.*$/u, "").trim())
    .filter((line) => line !== "" && !line.startsWith(";"))
    .join("\n")
    .replace(/\s+/gu, " ");

/**
 * Puts each `noduplicates` error on the copy it is about, as bean-check does:
 * the day's transactions with that narration, in include order, that repeat
 * an earlier one, in turn. The engine raised them without a location, so the
 * Notifications row could not be opened (w21/740). Its wording is kept:
 * Beancount's prints both entries' internals.
 */
export function locateDuplicateErrors(
  errors: readonly BeancountError[],
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  if (!errors.some((error) => DUPLICATE.test(error.message))) {
    return [...errors];
  }
  const index = indexBlocks(files);
  const order = includeTraversalOrder(files, entryPoint);
  const copies = new Map<string, { file: string; line: number }[]>();
  const copiesOf = (date: string, narration: string) => {
    const key = `${date}\u0000${narration}`;
    let found = copies.get(key);
    if (found !== undefined) return found;
    found = [];
    const seen = new Set<string>();
    for (const file of order) {
      for (const block of index.blocks(file)) {
        const header = block.text.split("\n", 1)[0]!;
        if (!header.startsWith(date) || !header.includes(`"${narration}"`)) {
          continue;
        }
        const text = identity(block.text);
        if (seen.has(text)) found.push({ file, line: block.startLine + 1 });
        seen.add(text);
      }
    }
    copies.set(key, found);
    return found;
  };
  return errors.map((error) => {
    const duplicate = DUPLICATE.exec(error.message);
    if (duplicate === null || error.file !== null) return error;
    const at = copiesOf(duplicate[1]!, duplicate[2]!).shift();
    return at ? { ...error, file: at.file, line: at.line, column: 1 } : error;
  });
}

/** The directives besides transactions the engine does not compare. */
const OTHER_DUPLICATES = /^\d{4}-\d{2}-\d{2}\s+(balance|note|event)\s/u;
const TYPE_NAMES: Record<string, string> = {
  balance: "Balance",
  note: "Note",
  event: "Event",
};

/**
 * `noduplicates` flags every directive but a price that repeats an earlier one
 * (`hash_entries`, metadata aside), on the later copy. The engine compares
 * transactions only, so a duplicated balance, note or event read as healthy
 * where bean-check refuses it (w21/847). Entries compare as their source text
 * does, files in load order; Beancount's own wording prints both entries'
 * internals, so this names the type and the repeated line.
 */
export function duplicateEntryErrors(
  files: FileMap,
  entryPoint: string,
): BeancountError[] {
  const runs = beancountPluginRuns(files[entryPoint], "noduplicates");
  if (runs.length === 0) return [];
  const index = indexBlocks(files);
  // Beancount compares the sorted entries (date, type rank, line), so the copy
  // it flags is the later one by that order, whichever file it is in.
  const found: {
    file: string;
    line: number;
    date: string;
    rank: number;
    seq: number;
    kind: string;
    text: string;
  }[] = [];
  for (const file of loadedFiles(files, entryPoint)) {
    for (const block of index.blocks(file)) {
      const match = OTHER_DUPLICATES.exec(block.text);
      if (match === null) continue;
      found.push({
        file,
        line: block.startLine + 1,
        date: block.text.slice(0, 10),
        rank: match[1] === "balance" ? -1 : 0,
        seq: found.length,
        kind: match[1]!,
        text: identity(block.text),
      });
    }
  }
  found.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      a.rank - b.rank ||
      a.line - b.line ||
      a.seq - b.seq,
  );
  const seen = new Set<string>();
  const errors: BeancountError[] = [];
  for (const entry of found) {
    if (!seen.has(entry.text)) {
      seen.add(entry.text);
      continue;
    }
    runs.forEach(() =>
      errors.push({
        message: `Duplicate entry: ${TYPE_NAMES[entry.kind]}: ${entry.text}`,
        code: "PLUGIN",
        phase: "plugin",
        hint: null,
        file: entry.file,
        line: entry.line,
        column: 1,
        end_line: null,
        end_column: null,
        severity: "error",
      }),
    );
  }
  return errors;
}
