import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the OS "reduce motion" accessibility setting is on, kept current for
 * the life of the component.
 *
 * Most of the app does not need this. Reanimated defaults every animation to
 * `ReduceMotion.System`, so `withTiming` / `withSpring` / entering animations
 * already land on their end state when the setting is on, with no code.
 *
 * This hook is for what Reanimated does not own:
 *
 * - **looping animations** (`withRepeat`), which keep looping at zero duration
 *   and must be skipped outright rather than sped up — the skeleton pulse in
 *   `components/loading-tile` is the case that motivated this;
 * - anything driven by `useFrameCallback` or a JS timer;
 * - staggered reveals whose scheduling we compute ourselves.
 *
 * Reanimated also exports a `useReducedMotion()`, but its own docs note it is
 * an app-start snapshot that does not re-render when the setting changes. This
 * subscribes, so toggling the setting with the app open takes effect. On
 * Android the same event also fires when *Transition animation scale* is off.
 *
 * Do **not** gate direct manipulation on this — chart scrubbing, drag, and
 * anything else that tracks a finger is not decorative motion and must keep
 * working with the setting on.
 */
export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
