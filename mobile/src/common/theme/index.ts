import { Appearance, Platform } from "react-native";
import { createTheming } from "@callstack/react-theme-provider";
import { ThemeProps, ColorTheme, AntdTheme } from "@/types/theme-props";
import { isExpoGo } from "../expo-env";
import { resolveMonoFontFamily } from "./typography";

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

export const getSystemColorScheme = () => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

const colorMode = getSystemColorScheme();

/**
 * Brand palette — beancount.io/brand-assets.
 *
 * A vivid grass-green system: the brand green (#5fc535) carries brand +
 * interaction, and the neutral ramp is a warm khaki (Bone → Stone → Charcoal)
 * rather than clinical grays, so the whole UI reads as one cohesive, on-brand
 * surface. `primary` is a deep grass green in light and the vivid brand green in
 * dark: `white` (the button text token) inverts to near-black on dark, so light
 * needs a deeper green (white text stays legible ~5:1) while dark can run the
 * bright brand green (near-black text on it reads cleanly).
 */
const GREEN = "#5fc535"; // Brand Green — primary in dark; brand reference
const GREEN_DARK = "#3d7d21"; // deep grass green — primary in light (white text legible)
const GREEN_DEEP = "#2b5918"; // deepest green — pressed / CTA footer
const BONE = "#f1efe4"; // warm paper / dark-mode foreground
const CHARCOAL = "#171a14"; // warm near-black — dark base + top bar

const lightTheme: ColorTheme = {
  overlay: "rgba(0, 0, 0, 0.5)", // modal scrim

  // Brand / interaction
  primary: GREEN_DARK, //  deep grass green — legible under white button text
  primaryLight: GREEN, //  vivid brand green as the light accent
  primaryDark: GREEN_DEEP,
  secondary: "#b8894b", // Ochre — earthy complement to the green

  // Surfaces + warm-neutral ramp (light → dark, subtle khaki undertone)
  white: "#ffffff", //    base surface
  black: "#1b1e16", //    strongest foreground (warm near-black)
  black90: "#30332a", //    titles / strong text
  black80: "#727668", //    secondary text, inactive tabs (Stone family)
  black60: "#c2c3b6", //    placeholders / disabled
  black40: "#e0dfd3", //    borders / hairlines
  black20: "#eeece2", //    dividers / faint fills
  black10: "#f6f4ec", //    inset surfaces (nods to Bone)

  text01: "#40433a", //    primary text, body copy

  // Semantics — tuned into the earthy palette; success stays a clear emerald
  // so income never reads as brand olive.
  error: "#cc4534", //    Error
  success: "#0a8748", //    Success
  warning: "#e08a1e", //    Warning
  information: "#4c8dd6", //    Information

  nav01: CHARCOAL, //    Global top bar
  nav02: GREEN_DEEP, //    CTA footer

  tabIconDefault: "#c2c3b6",
  tabIconSelected: GREEN_DARK,
  activeTintColor: GREEN_DARK,
  inactiveTintColor: "#727668",
  activeBackgroundColor: "#ffffff",
  inactiveBackgroundColor: "#ffffff",
  navBg: "#ffffff",
  navText: "#1b1e16",
};

const darkTheme: ColorTheme = {
  overlay: "rgba(0, 0, 0, 0.6)", // dark scrim in both modes (was a washed-out light scrim)

  // The vivid brand green leads on dark so links, tabs and fills pop; `white`
  // inverts to near-black, giving primary button fills dark, readable text.
  primary: GREEN,
  primaryLight: "#88d666", // lighter brand green
  primaryDark: "#52a92d", // deeper green — pressed keeps dark text readable
  secondary: "#cfa05e", // lighter Ochre

  // Surfaces + warm-neutral ramp on a Charcoal base (not pure black)
  white: CHARCOAL, //    base surface (warm near-black)
  black: BONE, //    strongest foreground (warm white)
  black90: "#eae8dc", //    bright text
  black80: "#a7a99a", //    secondary text, inactive tabs
  black60: "#9a9c8d", //    placeholders / disabled
  black40: "#797b6c", //    borders
  black20: "#585a4c", //    dividers
  black10: "#282a21", //    elevated surfaces / hairlines

  text01: "#ece9dd", //    primary text, body copy (soft, low-glare)

  error: "#e8695c", //    Error
  success: "#37c07c", //    Success
  warning: "#f0b24e", //    Warning
  information: "#6fb0e8", //    Information

  nav01: "#0f110c", //    Global top bar
  nav02: "#0f110c", //    CTA footer

  tabIconDefault: "#9a9c8d",
  tabIconSelected: GREEN,
  activeTintColor: GREEN,
  inactiveTintColor: "#a7a99a",
  activeBackgroundColor: CHARCOAL,
  inactiveBackgroundColor: CHARCOAL,
  navBg: CHARCOAL,
  navText: BONE,
};

export const antdLightTheme: AntdTheme = {
  color_text_base: lightTheme.text01,
  brand_primary: lightTheme.primary,
  color_link: lightTheme.primary,
  primary_button_fill: lightTheme.primary,
  primary_button_fill_tap: lightTheme.primary,
};

export const antdDarkTheme: AntdTheme = {
  color_text_base: darkTheme.text01,
  brand_primary: darkTheme.primary,
  color_link: darkTheme.primary,
  primary_button_fill: darkTheme.primary,
  primary_button_fill_tap: darkTheme.primary,
};

export const themes: { [key: string]: ThemeProps } = {
  light: {
    name: "light",
    colorTheme: lightTheme,
    antdTheme: antdLightTheme,
    sizing: [2, 6, 8, 10, 16, 24, 32],
  },
  dark: {
    name: "dark",
    colorTheme: darkTheme,
    antdTheme: antdDarkTheme,
    sizing: [2, 6, 8, 10, 16, 24, 32],
  },
};

const { ThemeProvider, withTheme, useTheme } = createTheming(themes[colorMode]);

export { ThemeProvider, withTheme, useTheme, colorMode };
