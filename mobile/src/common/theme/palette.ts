/**
 * The light and dark color palettes, and the `themes` map the provider selects
 * from.
 *
 * Split out of `index.ts` for the same reason `motion.ts` is: this module is
 * **import-free** (types only), so the unit-test runner can read the real
 * palettes without pulling in React Native. Anything that needs the palettes
 * plus the platform-resolved extras (`fonts`, `colorMode`) keeps importing
 * `@/common/theme`, which re-exports everything here.
 */
import type { ColorTheme, ThemeProps } from "@/types/theme-props";

/** A resolved theme — never `"system"`, which is a *setting*, not a theme. */
export type ThemeName = "light" | "dark";

/** What the user picked. `"system"` follows the OS. */
export type ThemeSetting = ThemeName | "system";

/**
 * The theme actually in effect.
 *
 * The one place `"system"` is collapsed into a real theme. Code that reads
 * `themeVar` directly and compares it to `"dark"` gets the light appearance for
 * every user on the system setting — the bug this function exists to prevent.
 * Prefer `useTheme()` in components; this is for the provider and for tests.
 */
export function effectiveThemeName(
  setting: ThemeSetting,
  systemScheme: ThemeName,
): ThemeName {
  return setting === "system" ? systemScheme : setting;
}

/**
 * Brand palette — https://beancount.io/brand-assets.
 *
 * Built directly from the official swatches (Brand Green #5FC535, Deep Green
 * #307D04, Forest #215C01, Bone #F1EFE4, Stone #6B6E5F, Charcoal #171A14): the
 * brand green carries brand + interaction, and the neutral ramp is the warm
 * khaki Bone → Stone → Charcoal rather than clinical grays, so the whole UI
 * reads as one cohesive, on-brand surface. `primary` is Deep Green in light
 * and the vivid Brand Green in dark: `white` (the button text token) inverts
 * to near-black on dark, so light needs the deeper green (white text stays
 * legible ~5:1) while dark can run the bright brand green (near-black text on
 * it reads cleanly).
 */
const GREEN = "#5fc535"; // Brand Green — primary in dark; brand reference
const GREEN_DARK = "#307d04"; // Deep Green — primary in light (white text legible)
const GREEN_DEEP = "#215c01"; // Forest — deepest green, pressed / CTA footer
const BONE = "#f1efe4"; // Bone — warm paper / dark-mode foreground
const STONE = "#6b6e5f"; // Stone — secondary text, inactive tabs (light mode)
const CHARCOAL = "#171a14"; // Charcoal — warm near-black — dark base + top bar

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
  black80: STONE, //    secondary text, inactive tabs
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
  inactiveTintColor: STONE,
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

export const themes: Record<ThemeName, ThemeProps> = {
  light: {
    name: "light",
    colorTheme: lightTheme,
  },
  dark: {
    name: "dark",
    colorTheme: darkTheme,
  },
};
