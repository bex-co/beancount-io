/**
 * The line ending a file uses: CRLF when its first line ends that way, else LF
 * (as the edit path reads a block, w21/252).
 */
export function lineEndingOf(content: string): "\r\n" | "\n" {
  const first = content.indexOf("\n");
  return first > 0 && content[first - 1] === "\r" ? "\r\n" : "\n";
}

/** Text with every line ending `eol`. */
export function withLineEnding(text: string, eol: "\r\n" | "\n"): string {
  return text.replace(/\r?\n/gu, eol);
}

/**
 * `current + "\n" + block` in the file's own line ending, so an entry added to
 * a CRLF file does not leave mixed endings behind (w21/673).
 */
export function appendBlock(current: string, block: string): string {
  const eol = lineEndingOf(current);
  return `${current}${eol}${withLineEnding(block, eol)}`;
}
