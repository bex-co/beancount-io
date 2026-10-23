/**
 * How an authored event type reads in the type filter.
 *
 * Most types read as written. A type that would read as blank (`" "`, a tab)
 * or exactly like the filter's own "All Types" / "(no type)" choices is shown
 * as the quoted string the ledger holds, its invisible characters escaped, so
 * every choice reads differently and names its control (w4/1016). Filtering
 * still compares the exact value.
 */
export function eventTypeLabel(
  type: string,
  allTypesLabel: string,
  emptyTypeLabel: string,
): string {
  if (type === "") return emptyTypeLabel;
  const blankEdges = type.trim() !== type;
  const invisible = /[\p{Cc}\p{Cf}]/u.test(type);
  if (
    !blankEdges &&
    !invisible &&
    type !== allTypesLabel &&
    type !== emptyTypeLabel
  ) {
    return type;
  }
  const escaped = Array.from(type, (char) => {
    if (char === "\\" || char === '"') return `\\${char}`;
    if (char === "\t") return "\\t";
    if (char === "\n") return "\\n";
    if (char === "\r") return "\\r";
    // Leading or trailing whitespace is spelled out wherever it occurs, so
    // " " and "  " stay apart once rendering collapses runs of spaces.
    if ((blankEdges && /\s/u.test(char)) || /[\p{Cc}\p{Cf}]/u.test(char)) {
      return `\\u${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
    }
    return char;
  });
  return `"${escaped.join("")}"`;
}
