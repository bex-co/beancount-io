import {
  hasActiveHorizontalSwipeOwnerTouch,
  horizontalSwipeOwnerTouchProps,
} from "../common/horizontal-swipe-owner";
import type { GestureResponderEvent } from "react-native";

const { onTouchStart, onTouchEnd, onTouchCancel } =
  horizontalSwipeOwnerTouchProps;

// Builds the minimal event shape releaseTouch reads: the touches still on
// screen after this end/cancel.
function endEvent(remainingTouches: number): GestureResponderEvent {
  return {
    nativeEvent: { touches: new Array(remainingTouches).fill({}) },
  } as GestureResponderEvent;
}

function reset() {
  // Last-finger-up resets the counter unconditionally.
  onTouchEnd(endEvent(0));
}

test("starts with no active owner touch", () => {
  reset();
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});

test("touch start marks an owner touch active", () => {
  reset();
  onTouchStart();
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(true);
});

test("lifting the last finger clears the lock", () => {
  reset();
  onTouchStart();
  onTouchEnd(endEvent(0));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});

test("touch cancel clears the lock", () => {
  reset();
  onTouchStart();
  onTouchCancel(endEvent(0));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});

test("stays locked while other fingers remain down", () => {
  reset();
  onTouchStart();
  onTouchStart();
  onTouchEnd(endEvent(1));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(true);
  onTouchEnd(endEvent(0));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});

test("nested owners (chart inside carousel) balance via bubbling", () => {
  reset();
  // touch start bubbles through both owner views
  onTouchStart();
  onTouchStart();
  // touch end bubbles through both; last finger is up so both calls reset
  onTouchEnd(endEvent(0));
  onTouchEnd(endEvent(0));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});

test("unbalanced end events never go negative", () => {
  reset();
  onTouchEnd(endEvent(1));
  onTouchEnd(endEvent(1));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
  onTouchStart();
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(true);
  reset();
});

test("last-finger-up self-heals a stuck counter", () => {
  reset();
  onTouchStart();
  onTouchStart();
  onTouchStart();
  // A single end with no remaining touches must clear everything, even if
  // some end events were missed.
  onTouchEnd(endEvent(0));
  expect(hasActiveHorizontalSwipeOwnerTouch()).toBe(false);
});
