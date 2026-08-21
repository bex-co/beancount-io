import type { ThemeName } from "@/common/theme/palette";
import type { ColorTheme } from "@/types/theme-props";

/** Every appearance prop `RefreshControl` takes, across iOS and Android. */
export type RefreshAppearance = {
  /** iOS spinner tint. */
  tintColor: string;
  /** Android spinner arc colors. */
  colors: string[];
  /** Android disc behind the spinner. */
  progressBackgroundColor: string;
};

/**
 * The dashboard's one definition of what pull-to-refresh looks like.
 *
 * Quiet chrome, not brand: secondary text in light, inverted foreground in
 * dark. Import-free at runtime (no `react-native`) so unit tests can exercise
 * the real configuration without loading the native module.
 */
export function refreshAppearance(
  colorTheme: ColorTheme,
  themeName: ThemeName,
): RefreshAppearance {
  // Dark: `black` is Bone — bright enough that iOS's refresh darkening still
  // leaves a readable gray. Light: `black80` (Stone) stays secondary, not ink.
  const tintColor =
    themeName === "dark" ? colorTheme.black : colorTheme.black80;

  return {
    tintColor,
    colors: [tintColor],
    // The disc sits on the screen's own surface. `white` intentionally resolves
    // to the charcoal base in the dark palette.
    progressBackgroundColor: colorTheme.white,
  };
}
