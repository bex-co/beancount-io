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

/** A line without its trailing `;` comment (a `;` inside a quoted string stays). */
function withoutComment(line: string): string {
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\\" && quoted) i += 1;
    else if (char === '"') quoted = !quoted;
    else if (char === ";" && !quoted) return line.slice(0, i);
  }
  return line;
}

/** The words of a directive's first line, a quoted string being one word. */
function wordsOf(line: string): string[] {
  return [...line.matchAll(/"((?:[^"\\]|\\.)*)"|\S+/g)].map((match) =>
    (match[1] ?? match[0]).trim(),
  );
}

/**
 * Which entry a commit is about, from its text: its date and, for a
 * transaction, its payee or narration (`2026-10-22 "Coffee"`); for any other
 * directive its type and first argument (`2026-10-01 custom budget
 * Expenses:Food`), since a quoted string there is not a name: a budget read
 * `"budget"` whatever the account. The history's rows all read "Add 1 entry" or
 * "Update entry", differing only by time and SHA (w21/903, w21/961). Empty when
 * the text has no dated first line.
 */
function entryLabel(text: string): string {
  const first = text.split(/\r\n|\r|\n/).find((line) => line.trim() !== "");
  const match = /^(\d{4}-\d{2}-\d{2})\s+(.*)$/.exec(
    withoutComment(first ?? "").trim(),
  );
  if (!match) return "";
  const [, date, rest] = match;
  const words = wordsOf(rest!);
  const keyword = words[0] ?? "";
  // A transaction has a flag (`*`, `!`, `&`, `#`, `?`, `%`, or a capital letter)
  // or `txn`, with or without a space before what follows (`*"Coffee"`); every
  // other directive is a lowercase word (w21/984).
  const isTransaction = /^(txn(?=[\s"]|$)|[*!&#?%]|[A-Z](?=[\s"]|$))/.test(
    rest!,
  );
  let subject: string;
  if (isTransaction) {
    const strings = [...rest!.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((quoted) =>
      quoted[1]!.trim(),
    );
    const named =
      (strings.length > 1 ? strings[0] || strings[1] : strings[0]) ?? "";
    subject = named ? `"${named}"` : "transaction";
  } else {
    subject = words.slice(0, keyword === "custom" ? 3 : 2).join(" ");
  }
  const label = `${date} ${subject}`.trim();
  // By code point: a cut through an emoji's surrogate pair left a "�" (w21/962).
  const points = Array.from(label);
  return points.length > MAX_LABEL
    ? `${points.slice(0, MAX_LABEL - 1).join("")}…`
    : label;
}

/** `Update 2026-10-22 "Coffee"`, or the bare verb and noun when nothing names it. */
export function entryCommitMessage(
  verb: "Update" | "Delete",
  text: string,
): string {
  const label = entryLabel(text);
  return label ? `${verb} ${label}` : `${verb} entry`;
}
