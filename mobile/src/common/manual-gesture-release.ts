/**
 * Terminating a manual "I own horizontal swipes here" recognizer.
 *
 * A `Gesture.Manual()` is the one recognizer gesture-handler never ends by
 * itself: it has no activation criteria, so nothing decides it is over. Left
 * alone it can stay in BEGAN after the finger is gone, and while it is in BEGAN
 * its `blocksExternalGesture` relation keeps holding the ledger drawer's edge
 * swipe down. Every pointer path therefore has to say so explicitly — a normal
 * release ends it, an interrupted touch (a call, a navigation, a pointer the
 * system takes away) fails it.
 *
 * Split out of `horizontal-swipe-owner` so the wiring is unit-testable: the
 * gesture object itself only exists on a device.
 */

/** The slice of gesture-handler's manual-gesture manager used here. */
export type ManualGestureManager = {
  end: () => void;
  fail: () => void;
};

/** The touch ended normally — release ownership so the drawer can arbitrate again. */
export function endManualGesture(manager: ManualGestureManager): void {
  manager.end();
}

/** The touch was cancelled — the marker never activated, so it fails rather than ends. */
export function failManualGesture(manager: ManualGestureManager): void {
  manager.fail();
}
