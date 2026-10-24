/**
 * The commit message for an entry-append commit.
 *
 * A ledger's `git log` is the audit record a user actually reads, and "Add 1
 * entries" advertises that nothing wrote it (w2/010). Extracted from the route
 * handler so the count-to-noun rule can be tested without standing up a Gitea
 * client.
 */
export function addEntriesCommitMessage(
  count: number,
  texts: readonly string[] = [],
): string {
  const label = texts.length === 1 && count === 1 ? entryLabel(texts[0]!) : "";
  return label
    ? `Add ${label}`
    : `Add ${count} ${count === 1 ? "entry" : "entries"}`;
}

const MAX_LABEL = 60;

/**
 * Which entry a commit is about, from its text: its date and its payee or
 * narration (or the rest of its first line for a directive with neither), as in
 * `2026-10-22 "Coffee"`. The history's rows all read "Add 1 entry" or "Update
 * entry", differing only by time and SHA (w21/903). Empty when the text has no
 * dated first line.
 */
function entryLabel(text: string): string {
  const first = text.split(/\r\n|\r|\n/).find((line) => line.trim() !== "");
  const match = /^(\d{4}-\d{2}-\d{2})\s+(.*)$/.exec(first?.trim() ?? "");
  if (!match) return "";
  const [, date, rest] = match;
  const strings = [...rest!.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((quoted) =>
    quoted[1]!.trim(),
  );
  const named =
    (strings.length > 1 ? strings[0] || strings[1] : strings[0]) ?? "";
  const subject = named
    ? `"${named}"`
    : rest!.replace(/^[*!]\s*/, "").replace(/\s+/g, " ");
  const label = `${date} ${subject}`.trim();
  return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
}

/** `Update 2026-10-22 "Coffee"`, or the bare verb and noun when nothing names it. */
export function entryCommitMessage(
  verb: "Update" | "Delete",
  text: string,
): string {
  const label = entryLabel(text);
  return label ? `${verb} ${label}` : `${verb} entry`;
}
