import { isolatePath, isolateSourceLine } from "../../../common/bidi";

/** The symbol a lone carriage return draws as. */
const CARRIAGE_RETURN_SYMBOL = "␍";

/**
 * An entry's source as the block draws it: a CRLF file's `\r` before each line
 * break dropped, a lone `\r` left inside a line shown as ␍ (iOS lays one out as
 * a paragraph break, w21/866, as the commit diff does, w21/827), and every line
 * isolated so Persian and Arabic text keeps its place around the account path
 * and amount (w21/865).
 */
export function entrySourceText(slice: string): string {
  return slice
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, CARRIAGE_RETURN_SYMBOL)
    .split("\n")
    .map(isolateSourceLine)
    .join("\n");
}

/** The `file:line` label of the entry's location, root first in a right-to-left name (w21/864). */
export function entryLocationLabel(
  filename: string,
  line: number | string,
): string {
  return isolatePath(`${filename}:${line}`);
}
