import { useEffect, useRef } from "react";
import {
  SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { durations } from "@/common/theme";
import { easeDecelerate } from "@/common/theme/motion-easing";

/**
 * Progress of a chart's entrance animation, 0 → 1, run once when the data
 * first arrives.
 *
 * Fires on *arrival*, not on render. A scrub, a theme switch, a re-layout and a
 * pull-to-refresh all re-render a chart, and none of them is the data showing
 * up — replaying the entrance on any of them would read as a glitch. Later
 * changes to an already-drawn series are a transition, which is a different
 * animation with a different easing.
 *
 * Reduce-motion needs no handling here: `withTiming` defaults to
 * `ReduceMotion.System`, so the value lands on 1 immediately when the setting
 * is on and the chart simply renders complete.
 */
export function useEntranceProgress(ready: boolean): SharedValue<number> {
  const progress = useSharedValue(0);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!ready || hasRunRef.current) {
      return;
    }
    hasRunRef.current = true;
    progress.value = withTiming(1, {
      duration: durations.chart,
      easing: easeDecelerate,
    });
  }, [ready, progress]);

  return progress;
}
