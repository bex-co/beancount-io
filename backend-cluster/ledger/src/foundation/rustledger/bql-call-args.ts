/**
 * Argument spans of every call to one BQL function, for the guards that judge
 * a function's arity or literal arguments (w23/184, w23/186).
 *
 * The scan blanks string-literal contents first (offsets kept), so a function
 * name or comma inside a literal never parses, and refuses a name preceded by
 * a word character or `.` (`revalue(`, `t.value(`). Spans index the original
 * query text; a call with an unclosed paren is skipped.
 */
export type ArgSpan = { start: number; end: number };

export function callArgSpans(query: string, name: string): ArgSpan[][] {
  const blanked = query.replace(
    /'[^']*'|"[^"]*"/g,
    (m) => m[0] + " ".repeat(m.length - 2) + m[0],
  );
  const call = new RegExp(`(?<![\\w.$])${name}\\s*\\(`, "gi");
  const calls: ArgSpan[][] = [];
  for (const match of blanked.matchAll(call)) {
    const spans = splitArgs(blanked, (match.index as number) + match[0].length);
    if (spans !== undefined) calls.push(spans);
  }
  return calls;
}

/** Top-level argument spans of the call whose `(` just precedes `open`. */
function splitArgs(text: string, open: number): ArgSpan[] | undefined {
  const spans: ArgSpan[] = [];
  let depth = 1;
  let start = open;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        spans.push({ start, end: i });
        return spans;
      }
    } else if (ch === "," && depth === 1) {
      spans.push({ start, end: i });
      start = i + 1;
    }
  }
  return undefined;
}
