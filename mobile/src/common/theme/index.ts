import { Appearance, Platform } from "react-native";
import { createTheming } from "@callstack/react-theme-provider";
import { ThemeProps, ColorTheme } from "@/types/theme-props";
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

export {
  space,
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
} from "./spacing";

export const getSystemColorScheme = () => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === "dark" ? "dark" : "light";
};

const colorMode = getSystemColorScheme();

/**
 * Brand palette — Beancount Brand v2 (beancount.io/brand-assets).
 *
 * One green, one ink, one paper. Green (#5FC535) is the only accent; use it
 * for the mark, one primary action per view, or a positive balance. For green
 * text on light surfaces, use #35761E (green/700) so it stays legible.
 */
const INK = "#0B0D0A"; // ink/900 — dark surfaces and strong text
const PAPER = "#E8EDE4"; // paper — dark-mode foreground and body copy
const MUTED = "#7C8577"; // secondary labels, inactive icons
const SECONDARY_TEXT = "#A6AFA0"; // body/meta on dark backgrounds
const CARD = "#101309"; // elevated dark surfaces

const GREEN_400 = "#86DC63";
const GREEN_500 = "#5FC535"; // Brand Green
const GREEN_600 = "#47A024";
const GREEN_700 = "#35761E"; // green text on light surfaces
const BONE = "#F1EFE4"; // warm inset surfaces
const ERROR_RED = "#D9603F";

const lightTheme: ColorTheme = {
  overlay: "rgba(0, 0, 0, 0.5)", // modal scrim

  // Brand / interaction
  primary: GREEN_700, // green text + filled buttons on light surfaces
  primaryLight: GREEN_500, // brand accent
  primaryDark: GREEN_600, // pressed / CTA footer
  secondary: "#b8894b", // Ochre — earthy complement to the green

  // Surfaces + warm-neutral ramp (light → dark)
  white: "#ffffff", // base surface
  black: INK, // strongest foreground
  black90: "#171a14", // titles / strong text
  black80: "#6b6e5f", // secondary text, inactive tabs (Stone family)
  black60: "#9a9c8d", // placeholders / disabled
  black40: "#c2c4b8", // borders / hairlines
  black20: "#e0e2d5", // dividers / faint fills
  black10: BONE, // inset surfaces

  text01: "#40433a", // primary text, body copy

  // Semantics — success stays a clear emerald so income never reads as brand green.
  error: ERROR_RED, // Error
  success: "#0a8748", // Success
  warning: "#e08a1e", // Warning
  information: "#4c8dd6", // Information

  nav01: INK, // Global top bar
  nav02: GREEN_600, // CTA footer

  tabIconDefault: "#9a9c8d",
  tabIconSelected: GREEN_700,
  activeTintColor: GREEN_700,
  inactiveTintColor: "#9a9c8d",
  activeBackgroundColor: "#ffffff",
  inactiveBackgroundColor: "#ffffff",
  navBg: "#ffffff",
  navText: INK,
};

const darkTheme: ColorTheme = {
  overlay: "rgba(0, 0, 0, 0.6)", // dark scrim in both modes

  // The brand green leads on dark; `white` inverts to ink so primary buttons
  // show near-black text on a bright green fill.
  primary: GREEN_500,
  primaryLight: GREEN_400, // lighter brand green
  primaryDark: GREEN_600, // deeper green — pressed keeps dark text readable
  secondary: "#cfa05e", // lighter Ochre

  // Surfaces + neutral ramp on an ink base
  white: INK, // base surface
  black: PAPER, // strongest foreground
  black90: "#d9dfd4", // bright text
  black80: SECONDARY_TEXT, // secondary text, inactive tabs
  black60: MUTED, // placeholders / disabled
  black40: "#5c6557", // borders
  black20: "#3a3f36", // dividers
  black10: CARD, // elevated surfaces / hairlines

  text01: PAPER, // primary text, body copy

  error: ERROR_RED, // Error
  success: "#37c07c", // Success
  warning: "#f0b24e", // Warning
  information: "#6fb0e8", // Information

  nav01: INK, // Global top bar
  nav02: INK, // CTA footer

  tabIconDefault: MUTED,
  tabIconSelected: GREEN_500,
  activeTintColor: GREEN_500,
  inactiveTintColor: SECONDARY_TEXT,
  activeBackgroundColor: INK,
  inactiveBackgroundColor: INK,
  navBg: INK,
  navText: PAPER,
};

export const themes: { [key: string]: ThemeProps } = {
  light: {
    name: "light",
    colorTheme: lightTheme,
  },
  dark: {
    name: "dark",
    colorTheme: darkTheme,
  },
};

const { ThemeProvider, withTheme, useTheme } = createTheming(themes[colorMode]);

export { ThemeProvider, withTheme, useTheme, colorMode };
