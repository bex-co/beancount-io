/**
 * Append a fetched journal page to the rows already loaded. Paging is by
 * offset, so an entry added elsewhere while the user scrolls shifts the next
 * page down by one and its first row repeats the last one loaded (w21/035).
 * That is told by the list's `total` having changed since the rows were loaded:
 * then each `entry_hash` is kept once and `overlapped` reports the shift so the
 * screen can reload from the top, where the new entry now sits.
 *
 * With the total unchanged nothing moved, and a repeated hash is a real second
 * entry, not an overlap: two identical entries (two $4.50 coffees, same payee,
 * same day) hash alike, and dropping the twin read as "the list moved" and
 * reloaded from the top on every page, forever (w21/419). Rows are appended
 * as they are.
 *
 * A changed total reloads on any change, not only on a repeated hash: a delete
 * elsewhere shrinks it and shifts a row across the boundary that no page shows
 * (w21/913). A same-total reorder (an edit that moves an entry) is told by the
 * page opening on the last loaded row again, at the same place in the same
 * file; a true twin is at another line and pages through.
 *
 * Free of `@/` imports so the jest-lite runner can require it.
 */
export function mergeJournalPage<T extends { entry_hash?: string | null }>(
  loaded: readonly T[],
  page: readonly T[],
  totals?: { loaded?: number | null; page?: number | null },
): { data: T[]; overlapped: boolean } {
  const moved =
    totals?.loaded != null &&
    totals?.page != null &&
    totals.loaded !== totals.page;
  if (!moved) {
    if (opensOnLastLoaded(loaded, page)) {
      return { data: dropFirst(loaded, page), overlapped: true };
    }
    return { data: [...loaded, ...page], overlapped: false };
  }
  const seen = new Set(loaded.map((row) => row.entry_hash));
  const data = [...loaded];
  for (const row of page) {
    if (row.entry_hash != null && seen.has(row.entry_hash)) continue;
    seen.add(row.entry_hash);
    data.push(row);
  }
  // The total moved: the list shifted whether or not a hash repeats.
  return { data, overlapped: true };
}

/**
 * A React key per row: its `entry_hash`, and for each further row with the same
 * hash (an identical twin) the hash and its ordinal, so twins on one screen do
 * not share a key (w21/419).
 */
export function journalRowKeys<T extends { entry_hash?: string | null }>(
  rows: readonly T[],
): Map<T, string> {
  const counts = new Map<string, number>();
  const keys = new Map<T, string>();
  rows.forEach((row, index) => {
    const hash = row.entry_hash ?? `row:${index}`;
    const n = counts.get(hash) ?? 0;
    counts.set(hash, n + 1);
    keys.set(row, n === 0 ? hash : `${hash}#${n}`);
  });
  return keys;
}

/**
 * What a journal list is, beyond its paging. Apollo runs a load-more page's
 * `updateQuery` against the query's variables when the page lands, so a page
 * requested before a filter change or ledger switch was appended to the new
 * list, its total included (w21/116); a screen compares this key from the
 * request with the one current when the page arrives.
 */
export function journalListKey(ledgerId: string, query: object): string {
  return JSON.stringify([ledgerId, query]);
}

type Placed = {
  entry_hash?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Whether the page's first row is the last loaded one again: same hash, same file and line. */
function opensOnLastLoaded(
  loaded: readonly Placed[],
  page: readonly Placed[],
): boolean {
  const last = loaded[loaded.length - 1];
  const first = page[0];
  if (!last || !first || last.entry_hash == null) return false;
  if (first.entry_hash !== last.entry_hash) return false;
  const place = (row: Placed) => [row.meta?.filename, row.meta?.lineno];
  const [lastFile, lastLine] = place(last);
  return (
    typeof lastFile === "string" &&
    typeof lastLine === "number" &&
    place(first)[0] === lastFile &&
    place(first)[1] === lastLine
  );
}

function dropFirst<T>(loaded: readonly T[], page: readonly T[]): T[] {
  return [...loaded, ...page.slice(1)];
}
