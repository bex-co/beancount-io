/**
 * U+FEFF, the byte-order mark a UTF-8 file may start with. The engine never
 * sees it: the ledger service decodes with `TextDecoder`, which drops a
 * leading one, while `decodeFileContent` keeps it as line 1's first
 * character, so the file's bytes survive a read and a write. A line scanner
 * handed that text read line 1 as something other than the engine does: its
 * `pushtag`, its date, or its `#` comment went unseen (w31/100). Each scanner
 * over a file's text therefore reads it without the mark, and one that
 * rewrites the text writes the mark back, as the ledger service's own commit
 * path does (w21/368).
 */
const BYTE_ORDER_MARK = "\uFEFF";

/**
 * `text` split into its leading byte-order mark (`""` when it has none) and
 * the text after it, which is the text the engine reads.
 */
export function splitByteOrderMark(text: string): {
  bom: string;
  text: string;
} {
  return text.startsWith(BYTE_ORDER_MARK)
    ? { bom: BYTE_ORDER_MARK, text: text.slice(BYTE_ORDER_MARK.length) }
    : { bom: "", text };
}
