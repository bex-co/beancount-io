/**
 * Tracks which editor revisions are known to be saved, shared by the ledger
 * file editor and the transaction editor.
 *
 * The editor reports every keystroke as a monotonically increasing revision
 * within a document epoch. A save snapshots one revision and resolves later,
 * so edits typed *during* the save must stay dirty: `markSaved` only clears
 * dirtiness up to the snapshot's revision. Stale callbacks (a previous epoch,
 * or an out-of-order revision arriving over the async DOM bridge) are dropped.
 *
 * Import-free so the unit-test runner can drive the production logic.
 */

export type RevisionTracker = {
  /** Newest edit revision applied for the current epoch. */
  latest: number;
  /** Newest revision covered by a successful save. */
  saved: number;
};

export function createRevisionTracker(): RevisionTracker {
  return { latest: 0, saved: 0 };
}

export function resetRevisionTracker(tracker: RevisionTracker): void {
  tracker.latest = 0;
  tracker.saved = 0;
}

/**
 * Apply an editor onEdit callback. Returns the dirty flag to surface, or null
 * when the callback is stale and must be ignored.
 */
export function applyEditorEdit(
  tracker: RevisionTracker,
  currentEpoch: number,
  epoch: number,
  revision: number,
  isDirty: boolean,
): boolean | null {
  if (epoch !== currentEpoch || revision < tracker.latest) return null;
  tracker.latest = revision;
  return isDirty;
}

/**
 * Mark a successful save's snapshot revision. Returns the dirty flag: still
 * dirty when newer edits exist beyond the saved snapshot.
 */
export function markRevisionsSaved(
  tracker: RevisionTracker,
  revision: number,
): boolean {
  tracker.saved = Math.max(tracker.saved, revision);
  return tracker.latest > tracker.saved;
}
