import type { BeancountError, FileMap } from "@rustledger/wasm";
import { indexBlocks } from "./block-index";
import { includeTraversalOrder } from "./source-slice";

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
