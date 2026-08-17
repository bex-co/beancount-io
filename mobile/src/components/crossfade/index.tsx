import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { durations } from "@/common/theme";

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

type Props = {
  /**
   * Fill the parent. A scroll view or list handed a bare wrapper collapses to
   * its content height, so anything scrollable needs this.
   */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Crossfade wrapper for the loaded branch of a skeleton swap.
 *
 * `LoadingTile` pulses its opacity between 1 and 0.5 on a loop, so a bare
 * `{isLoading ? <Skeleton/> : <Real/>}` cuts to the content at whatever
 * brightness the pulse happened to have reached — a random-looking flash on
 * every load. Fading the real content in over the same duration everything
 * else in the app uses turns that into a handoff.
 *
 * Reanimated's entering animations default to `ReduceMotion.System`, so with
 * the OS setting on the content lands at full opacity with no travel and this
 * needs no `useReduceMotion()` of its own.
 *
 * Where the loaded branch already has a wrapping view, pass that view's style
 * here rather than nesting — the crossfade should not add a node to the tree.
 */
export function FadeInView({ fill, style, children }: Props): JSX.Element {
  return (
    <Animated.View
      style={[fill && styles.fill, style]}
      entering={FadeIn.duration(durations.base)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The other half of the handoff, for skeletons whose content cannot fade *in*.
 *
 * A list's `ListEmptyComponent` is not a branch anyone can wrap — the rows that
 * replace it are rendered by the list itself, one cell at a time. Fading the
 * skeleton out over them produces the same crossfade from the other side.
 */
export function FadeOutView({ fill, style, children }: Props): JSX.Element {
  return (
    <Animated.View
      style={[fill && styles.fill, style]}
      exiting={FadeOut.duration(durations.base)}
    >
      {children}
    </Animated.View>
  );
}
