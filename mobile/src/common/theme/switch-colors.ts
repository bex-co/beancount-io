import type { ColorTheme } from "@/types/theme-props";

/**
 * The colours of a `Switch`'s track, which no call site should write for itself.
 *
 * React Native on iOS maps `trackColor.false` to the native switch's `tintColor`,
 * its outline, and draws the off-state FILL from a separate prop,
 * `ios_backgroundColor`. A call site that set only `trackColor` got iOS's default
 * grey fill (1.72:1 against white, 2.45:1 on the dark page) with the app's token
 * on a 1px outline, where it was invisible (w22/036). Both come from
 * `controlBorder` here, the app's 3:1 boundary for a control, and the on state
 * stays the brand green. On Android `trackColor` is the track and
 * `ios_backgroundColor` is ignored, so the same spread is right on both.
 *
 * Pure (no react-native import) so the unit-test runner loads it under plain Node.
 */
export function switchTrackProps(theme: ColorTheme) {
  return {
    trackColor: { false: theme.controlBorder, true: theme.primary },
    ios_backgroundColor: theme.controlBorder,
  };
}
