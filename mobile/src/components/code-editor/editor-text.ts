/**
 * A file's text as the editor holds it, broken into lines at `\n` only. With
 * CodeMirror's default separator a lone carriage return broke the line too, so
 * an unrelated save rewrote a narration's "Order 12\r34" to two lines, and an
 * error's line number, which Beancount counts by `\n`, landed early
 * (w21/815). CRLF reads as `\n`, as the editor's own text always joined it;
 * the save writes the file's ending back (w21/062).
 */
export const EDITOR_LINE_SEPARATOR = "\n";

export function editorText(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

/**
 * Text pasted into the editor with its CRLF breaks as the editor writes them.
 * The save writes every `\n` as the file's ending and keeps a `\r` before it as
 * a character, so a pasted "x\r\ny" would otherwise save with a doubled `\r`
 * (w21/940).
 */
export function pastedText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
