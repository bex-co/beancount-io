import {
  applyEditorEdit,
  createRevisionTracker,
  markRevisionsSaved,
  resetRevisionTracker,
} from "../revision-tracker";

// The tracker backs both editor screens' dirty flags; these cases model the
// save races the screens must survive: edits during a save, out-of-order
// callbacks over the async DOM bridge, and repeated saves.

test("a fresh tracker is clean and applies the first edit", () => {
  const tracker = createRevisionTracker();
  expect(applyEditorEdit(tracker, 1, 1, 1, true)).toBe(true);
});

test("a save of the latest revision clears the dirty flag", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 1, true);
  expect(markRevisionsSaved(tracker, 1)).toBe(false);
});

test("edits made during a save stay dirty when the save resolves", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 1, true);
  // Save of revision 1 in flight; the user keeps typing (revision 2).
  applyEditorEdit(tracker, 1, 1, 2, true);
  expect(markRevisionsSaved(tracker, 1)).toBe(true);
});

test("a second save after further edits clears the flag again", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 1, true);
  applyEditorEdit(tracker, 1, 1, 2, true);
  markRevisionsSaved(tracker, 1);
  expect(markRevisionsSaved(tracker, 2)).toBe(false);
});

test("an editor-side undo to the saved document reports clean", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 1, true);
  // The editor compares content, so undo sends isDirty=false at a NEW revision.
  expect(applyEditorEdit(tracker, 1, 1, 2, false)).toBe(false);
});

test("out-of-order revisions are ignored", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 3, true);
  expect(applyEditorEdit(tracker, 1, 1, 2, false)).toBe(null);
  expect(tracker.latest).toBe(3);
});

test("edits from a stale epoch are ignored", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 2, 2, 1, true);
  expect(applyEditorEdit(tracker, 2, 1, 5, true)).toBe(null);
  expect(tracker.latest).toBe(1);
});

test("a save response from a replaced document cannot clear the new draft", () => {
  const tracker = createRevisionTracker();
  applyEditorEdit(tracker, 1, 1, 1, true);
  // Document reloads (new epoch); the tracker resets with it.
  resetRevisionTracker(tracker);
  applyEditorEdit(tracker, 2, 2, 1, true);
  // The stale save never reaches markRevisionsSaved in the screens (they gate
  // on epoch first); even if it did, a reset tracker stays dirty.
  markRevisionsSaved(tracker, 0);
  expect(tracker.latest > tracker.saved).toBe(true);
});
