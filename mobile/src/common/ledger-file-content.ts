import { Buffer } from "buffer";

export function decodeLedgerFileContent(
  content: string,
  encoding?: string | null,
): string {
  if (encoding !== "base64") return content;
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

export function encodeLedgerFileContent(content: string): string {
  return Buffer.from(content, "utf8").toString("base64");
}

/**
 * Whether decoding a file as UTF-8 and writing it back reproduces its bytes
 * (w21/042). A Latin-1 `é` decodes to U+FFFD, and saving any unrelated edit
 * wrote `EF BF BD` over it with no warning. A UTF-8 BOM round-trips.
 */
export function isLosslessLedgerFileContent(
  content: string,
  encoding?: string | null,
): boolean {
  if (encoding !== "base64") return true;
  const bytes = Buffer.from(content.replace(/\s/g, ""), "base64");
  return Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes);
}

/**
 * Whether a file read came back without its text although the file is not
 * empty: Gitea sends `content: null` for a blob over its inline limit (10 MiB).
 * Read as an empty document with a valid sha, the editor let a user type over
 * a whole large file (w21/185).
 */
export function isUnreadableLargeFile(
  content: string | null | undefined,
  size: number | null | undefined,
): boolean {
  return !content && (size ?? 0) > 0;
}

/**
 * The largest explicit file write the server accepts: 1 MiB. A long-lived
 * `main.bean` grows past it by appends, and fixing a typo then failed on save
 * after the edit, with the server's English message (w21/186).
 */
const MAX_EDITABLE_BYTES = 1_048_576;

/** Whether a file of `size` bytes is over what can be saved back. */
export function isOverEditLimit(size: number | null | undefined): boolean {
  return (size ?? 0) > MAX_EDITABLE_BYTES;
}

export type LineEnding = "\r\n" | "\n";

/**
 * The line ending most of a file's lines use. The editor joins its lines with
 * `\n`, so saving a CRLF ledger (Windows, or a Windows tool's export) rewrote
 * every line ending and turned a one-line edit into a whole-file diff
 * (w21/062). A mixed file keeps its majority; a tie stays `\n`.
 */
export function lineEndingOf(text: string): LineEnding {
  const crlf = text.match(/\r\n/g)?.length ?? 0;
  const all = text.match(/\n/g)?.length ?? 0;
  return crlf > all - crlf ? "\r\n" : "\n";
}

/**
 * `content`'s line breaks written as `ending`. Every `\n` is one: a `\r` before
 * it is a character of the line, as the editor opened it (`\r\r\n` is a line
 * ending and a stray `\r`), so saving it as CRLF dropped one `\r` from every
 * line of such a file (w21/940). Pasted CRLF text is normalized as it goes in
 * (`pastedText`).
 */
export function withLineEnding(content: string, ending: LineEnding): string {
  return content.replace(/\n/g, ending);
}
