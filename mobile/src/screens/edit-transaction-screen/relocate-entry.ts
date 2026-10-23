/**
 * Finding an entry again after it changed elsewhere. Its ID is its content
 * hash, so once its postings change the old ID answers nothing, and Copy &
 * Reload (and Reload) landed on "This transaction was changed or removed"
 * with the draft copied but nowhere to paste it (w21/823). The entry still
 * sits where it was written: the one transaction of its day at its file and
 * line is the changed entry. Twins at one place, or none, stay unresolved
 * (w21/693).
 */

/** Where a context read says its entry is written, and its date. */
export type EntryLocation = { filename: string; lineno: number; date: string };

/** The location a context read reports for its entry, when it has one. */
export function entryLocation(entry: unknown): EntryLocation | null {
  if (typeof entry !== "object" || entry === null) return null;
  const { meta, date } = entry as { meta?: unknown; date?: unknown };
  if (typeof meta !== "object" || meta === null) return null;
  const { filename, lineno } = meta as { filename?: unknown; lineno?: unknown };
  return typeof filename === "string" &&
    typeof lineno === "number" &&
    typeof date === "string"
    ? { filename, lineno, date: date.slice(0, 10) }
    : null;
}

/** The IDs of a journal page's transactions dated `date`, at most `limit`. */
export function sameDayTransactionIds(
  items: readonly unknown[],
  date: string,
  limit = 10,
): string[] {
  return items
    .filter((item): item is { entry_hash: string; date: string } => {
      const entry = item as {
        entry_hash?: unknown;
        date?: unknown;
        directive_type?: unknown;
      };
      return (
        typeof entry.entry_hash === "string" &&
        typeof entry.date === "string" &&
        entry.date.slice(0, 10) === date &&
        entry.directive_type === "Transaction"
      );
    })
    .map((entry) => entry.entry_hash)
    .slice(0, limit);
}

/** The one candidate at `at`'s file and line, or null for none or several. */
export function relocatedEntryId(
  candidates: readonly {
    entryHash: string;
    location: EntryLocation | null;
  }[],
  at: EntryLocation,
): string | null {
  const here = candidates.filter(
    ({ location }) =>
      location !== null &&
      location.filename === at.filename &&
      location.lineno === at.lineno,
  );
  return here.length === 1 ? here[0]!.entryHash : null;
}
