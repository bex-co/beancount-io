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
 * Import-free at runtime so unit tests can exercise the real configuration
 * without loading React Native.
 */
export function refreshAppearance(colorTheme: ColorTheme): RefreshAppearance {
  return {
    tintColor: colorTheme.primary,
    colors: [colorTheme.primary],
    // The disc sits on the screen's own surface. `white` intentionally resolves
    // to the charcoal base in the dark palette.
    progressBackgroundColor: colorTheme.white,
  };
}
