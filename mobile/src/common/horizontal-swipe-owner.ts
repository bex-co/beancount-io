import { createContext, useContext, useMemo } from "react";
import {
  Gesture,
  type GestureType,
  type ManualGesture,
} from "react-native-gesture-handler";
import { endManualGesture, failManualGesture } from "./manual-gesture-release";

/**
 * A ref to the ledger drawer's edge-swipe pan gesture. Components that own
 * horizontal swipes take it from context and declare a `blocksExternalGesture`
 * relation against it, which is arbitrated natively by gesture-handler.
 */
export type EdgeSwipeGestureRef = { current: GestureType | undefined };

const EdgeSwipeGestureContext = createContext<EdgeSwipeGestureRef | null>(null);

export const EdgeSwipeGestureProvider = EdgeSwipeGestureContext.Provider;

/**
 * Marks a subtree as owning horizontal swipes: wrap its root in a
 * `<GestureDetector>` with the returned gesture and the ledger drawer's edge
 * swipe stands down for any touch that starts inside it. Without this, swiping
 * right on a chart or a paged carousel that reaches into the drawer's left-edge
 * strip slides the whole screen open instead of doing the local thing.
 *
 * The marker is a `Gesture.Manual()` that is never activated. Gesture-handler
 * puts it in BEGAN the moment a finger lands, so it blocks the drawer for the
 * life of the touch while never claiming it — the subtree's own scroll views,
 * pagers and scrub gestures keep working untouched. Being a marker rather than
 * a real recognizer is also what lets it sit on the subtree root and cover
 * regions that hold no gesture at all (chart headers, range pills, page dots).
 *
 * Ending it is this hook's job, not gesture-handler's: a manual gesture has no
 * activation criteria, so nothing else decides it is over, and a marker left in
 * BEGAN after the finger lifts goes on blocking the edge swipe. `onTouchesUp`
 * and `onTouchesCancelled` therefore terminate it on every release and
 * cancellation path (see `manual-gesture-release`).
 */
export function useHorizontalSwipeOwnerGesture(): ManualGesture {
  const edgeSwipeRef = useContext(EdgeSwipeGestureContext);
  return useMemo(() => {
    const marker = Gesture.Manual()
      .onTouchesUp((_, manager) => endManualGesture(manager))
      .onTouchesCancelled((_, manager) => failManualGesture(manager));
    // Rendered outside the drawer (a screen pushed over the tab group) there is
    // nothing to arbitrate against, so the marker stays inert.
    return edgeSwipeRef ? marker.blocksExternalGesture(edgeSwipeRef) : marker;
  }, [edgeSwipeRef]);
}
