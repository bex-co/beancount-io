import type { ReactNode } from "react";

/** Hebrew and Arabic script, whose letters set a right-to-left direction. */
const RTL_LETTERS = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;

/** A string (to its closing quote), a comment, or a word of ledger source. */
const SOURCE_TOKEN = /"(?:[^"\\]|\\.)*"?|;.*|[^\s"]+/gu;
/** A token's marks before its text, and a string's closing quote. */
const TOKEN_TEXT = /^([^\p{L}\p{N}]*)(.*?)("?)$/su;
/** Where a word's segments meet: an account's colons, a path's slashes. */
const SEGMENT_SEPARATOR = /[:/]/;

export interface IsolationRange {
  /** UTF-16 offset of the first character to isolate. */
  start: number;
  /** UTF-16 offset just past the last one. */
  end: number;
}

export function hasRtlLetters(text: string): boolean {
  return RTL_LETTERS.test(text);
}

/** The text of `token` (from `at`), its marks and closing quote left out. */
function textRange(token: string, at: number): IsolationRange | null {
  const [, marks = "", text = ""] = TOKEN_TEXT.exec(token) ?? [];
  return text
    ? { start: at + marks.length, end: at + marks.length + text.length }
    : null;
}

/**
 * The parts of one line of ledger source to draw as their own bidi isolate.
 * Drawn as one run, "Assets:Qa:ملی      1.00 USD" let the spaces and the
 * amount join the Persian word, so the amount landed inside the account path
 * (w2/118). Each string, comment and word holding Hebrew or Arabic-script
 * letters is isolated — an account or file path one segment at a time, so it
 * still reads root first — while the `;`, `#` or quotes around it stay where
 * the source puts them. The same rule as mobile's `isolateSourceLine`
 * (w21/780), copied because packages stay independent. A line without such
 * letters yields nothing.
 */
export function rtlIsolationRanges(line: string): IsolationRange[] {
  if (!RTL_LETTERS.test(line)) return [];
  const ranges: IsolationRange[] = [];
  for (const match of line.matchAll(SOURCE_TOKEN)) {
    const token = match[0];
    const at = match.index;
    if (!RTL_LETTERS.test(token)) continue;
    if (token.startsWith('"') || token.startsWith(";")) {
      const range = textRange(token, at);
      if (range) ranges.push(range);
      continue;
    }
    // A word one segment at a time, so `Assets:بانک:ملی` and
    // `documents/بانک/ملی` read root first, and a highlighter's `:Qa:ملی`
    // fragment of an account is handled the same way.
    let offset = 0;
    for (const segment of token.split(SEGMENT_SEPARATOR)) {
      if (RTL_LETTERS.test(segment)) {
        const range = textRange(segment, at + offset);
        if (range) ranges.push(range);
      }
      offset += segment.length + 1;
    }
  }
  return ranges;
}

/**
 * `text` with each RTL part from {@link rtlIsolationRanges} in a `<bdi>`, so
 * its own letters set its direction and the rest of the line keeps source
 * order. Elements, not isolate characters: copied source stays the bytes the
 * ledger holds.
 */
export function isolateRtlSource(text: string): ReactNode {
  const ranges = rtlIsolationRanges(text);
  if (ranges.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end }, index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(<bdi key={index}>{text.slice(start, end)}</bdi>);
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
