import { Appearance, Platform } from "react-native";
import { createTheming } from "@callstack/react-theme-provider";
import { isExpoGo } from "../expo-env";
import { resolveMonoFontFamily } from "./typography";
import { themes } from "./palette";

/** Platform-resolved font families; tokens live in ./typography.ts. */
export const fonts = {
  mono: resolveMonoFontFamily(Platform.OS, { embedded: !isExpoGo }),
  monoMedium: resolveMonoFontFamily(Platform.OS, {
    embedded: !isExpoGo,
    weight: "medium",
  }),
} as const;

export {
  amountMaxFontSizeMultiplier,
  amountStyle,
  fontSizes,
  fontWeights,
  headerActionStyle,
  monoMinFontSize,
} from "./typography";

export { withAlpha } from "./color-utils";

export {
  space,
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
} from "./spacing";

// Only the import-free half of the motion tokens is re-exported here.
// `./motion-easing` imports Reanimated, and this barrel is reachable from the
// unit-test runner, which cannot resolve it — import easing curves from
// `@/common/theme/motion-easing` directly.
export {
  durations,
  loopDurations,
  dwellDurations,
  easings,
  springs,
  clamp01,
  staggeredProgress,
  STAGGER_WINDOW,
  MAX_TRANSITION_MS,
  MAX_FEEDBACK_MS,
} from "./motion";

// The palettes themselves live in the import-free `./palette` so the test
// runner can read them without React Native; only the platform-dependent
// pieces stay here.
export {
  themes,
  effectiveThemeName,
  type ThemeName,
  type ThemeSetting,
} from "./palette";

export const getSystemColorScheme = (): "light" | "dark" => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

const colorMode = getSystemColorScheme();

const { ThemeProvider, withTheme, useTheme } = createTheming(themes[colorMode]);

export { ThemeProvider, withTheme, useTheme, colorMode };
