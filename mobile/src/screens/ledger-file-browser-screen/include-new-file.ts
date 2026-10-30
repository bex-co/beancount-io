import { lineEndingOf } from "../../common/ledger-file-content";

/** The entry point every ledger is read from. */
export const ENTRY_POINT = "main.bean";

/**
 * Whether a new file at `path` can be offered an `include` in the entry point:
 * a Beancount file other than the entry point itself, with a name that fits in
 * a quoted include (a `"` or backslash would need escaping, so the offer is
 * left out rather than guessed).
 */
export function canIncludeNewFile(path: string): boolean {
  return (
    /\.(bean|beancount)$/.test(path) &&
    path !== ENTRY_POINT &&
    !/["\\]/.test(path)
  );
}

const INCLUDE_LINE = /^[ \t]*include[ \t]+"([^"\n]*)"[^\n]*(\r?\n|$)/gm;

/**
 * The entry point's text with an `include "<path>"` line for a new file, or
 * null when it already includes that exact path. The line goes after the last
 * existing include, else at the end, in the file's own line ending, so the
 * edit is one added line and not a rewrite of the file (w21/588).
 */
export function withIncludeLine(content: string, path: string): string | null {
  const ending = lineEndingOf(content);
  const line = `include "${path}"`;
  let last: { end: number; terminated: boolean } | null = null;
  for (const match of content.matchAll(INCLUDE_LINE)) {
    if (match[1] === path) return null;
    last = { end: match.index + match[0].length, terminated: match[2] !== "" };
  }
  if (last) {
    return last.terminated
      ? content.slice(0, last.end) + line + ending + content.slice(last.end)
      : `${content}${ending}${line}${ending}`;
  }
  const lead = content === "" || content.endsWith("\n") ? "" : ending;
  return `${content}${lead}${line}${ending}`;
}
