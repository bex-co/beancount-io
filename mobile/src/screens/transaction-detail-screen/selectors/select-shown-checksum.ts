/**
 * Twin entries (same date, payee and postings, told apart only by metadata)
 * share a content hash, and the ID's occurrence suffix moves when one is
 * deleted: re-reading the first twin's ID then returns the other's slice and
 * checksum, so a stale screen's Delete passed the checksum guard and removed
 * the survivor (w21/672). The screen therefore keeps the checksum of the slice
 * it first showed, and every write carries that one, not the latest read.
 */

/** The checksum to keep after a read: the first settled one, or the next after the user's own edit. */
export function nextShownChecksum(
  pinned: string | undefined,
  read: string | undefined,
  options: { loading: boolean; adoptNext: boolean },
): string | undefined {
  // A cached copy that the network is about to replace is not what was shown.
  if (read === undefined || options.loading) return pinned;
  return pinned === undefined || options.adoptNext ? read : pinned;
}

/** Whether a settled read no longer matches the slice the screen showed. */
export function isShownEntryReplaced(
  pinned: string | undefined,
  read: string | undefined,
  loading: boolean,
): boolean {
  return (
    pinned !== undefined && read !== undefined && !loading && pinned !== read
  );
}

/** Whether the editor's read is not the slice the detail screen showed (no checksum passed: nothing to compare). */
export function isOtherSlice(
  shown: string | undefined,
  read: string | undefined,
): boolean {
  return Boolean(shown) && read !== undefined && shown !== read;
}
