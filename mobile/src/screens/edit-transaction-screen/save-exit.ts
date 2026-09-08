/**
 * Where the edit screen goes after a successful save.
 *
 * An entry's `entryHash` is content-derived (beancount `hash_entry`), so a
 * save normally changes it and the transaction-detail screen behind the editor
 * holds a dead identity. The ledger service now returns the entry's NEW hash
 * from the update; with it we can return to that detail screen and re-key it.
 *
 * Servers that predate that change echo the request's hash back, which is
 * indistinguishable from "the identity did not change" — in both cases the
 * safe landing is the journal (refreshed by the entries invalidation), the
 * behaviour the app had before.
 */
export type SaveExit =
  { kind: "detail"; entryHash: string } | { kind: "journal" };

export function resolveSaveExit(
  currentEntryHash: string,
  savedEntryHash: string | null | undefined,
): SaveExit {
  if (
    typeof savedEntryHash === "string" &&
    savedEntryHash.length > 0 &&
    savedEntryHash !== currentEntryHash
  ) {
    return { kind: "detail", entryHash: savedEntryHash };
  }
  return { kind: "journal" };
}

/** What the next save must target: the entry's identity plus its checksum. */
export type SaveIdentity = { entryHash: string; sha256sum: string };

/**
 * The identity a follow-up save has to use after a successful one. The
 * checksum always moves to the saved content's; the hash moves only when the
 * server reported one (an older server echoes the request, which is the same
 * value we already hold).
 *
 * Needed when the user kept typing during the save: the screen stays put with
 * a dirty draft, and its next save must target the entry as it now exists.
 */
export function applySavedIdentity(
  current: SaveIdentity,
  payload: { entryHash?: string | null; newSha256sum: string },
): SaveIdentity {
  return {
    entryHash: payload.entryHash || current.entryHash,
    sha256sum: payload.newSha256sum,
  };
}
