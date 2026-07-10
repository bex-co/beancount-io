import type { TextStyle } from "react-native";
import type { ColorTheme } from "@/types/theme-props";

/**
 * Typography tokens — the single source of truth for fonts, sizes, and weights.
 *
 * Rules:
 * - Prose (payees, narrations, labels, titles) uses the system font.
 * - Structured ledger text (accounts, entry source, and amounts that sit in
 *   ledger rows) uses the mono family, never below `monoMinFontSize`;
 *   standalone amounts (headlines, hero entry) stay in the system font.
 * - Every money amount composes `amountStyle` so digits are tabular and
 *   stacked amounts align on the decimal point (see `AmountText` in
 *   `@/components/amount-text`).
 * - Weights are limited to `fontWeights.regular` and `fontWeights.medium`.
 *
 * This module is pure (no runtime react-native import) so unit tests can load
 * it under Node; the Platform-bound `fonts` object lives in `./index.ts`.
 */

/** Embedded via the expo-font config plugin (see app.json). */
export const JETBRAINS_MONO_REGULAR = "JetBrainsMono-Regular";
export const JETBRAINS_MONO_MEDIUM = "JetBrainsMono-Medium";

/**
 * Resolves the mono family for a platform. Pass `embedded: false` where the
 * config-plugin fonts are unavailable (e.g. Expo Go) to fall back to the
 * platform's built-in mono — note `"monospace"` is not a valid iOS font name,
 * iOS needs Menlo.
 */
export const resolveMonoFontFamily = (
  os: string,
  opts: { embedded?: boolean; weight?: "regular" | "medium" } = {},
): string => {
  const { embedded = true, weight = "regular" } = opts;
  if (embedded) {
    return weight === "medium" ? JETBRAINS_MONO_MEDIUM : JETBRAINS_MONO_REGULAR;
  }
  return os === "ios" ? "Menlo" : "monospace";
};

/**
 * Font-size scale, clustered from the app's pre-existing sizes. Pick the step
 * matching the text's role; don't invent in-between sizes.
 */
export const fontSizes = {
  /** Tiny meta: tags, timestamps, auto labels. */
  xs: 12,
  /** Small labels and captions; the mono floor. */
  sm: 13,
  /** Secondary body: list meta, descriptions. */
  md: 14,
  /** Primary body: row titles, inputs, buttons. */
  lg: 16,
  /** Section and card titles. */
  xl: 18,
  /** Screen titles and prominent amounts. */
  xxl: 24,
  /** Headline totals (accounts list, category headers). */
  display: 28,
  /** Hero amount sharing the screen with other content (detail screens). */
  heroSm: 36,
  /** Full-screen amount entry. */
  hero: 56,
} as const;

/** Mono text below this size loses its 0/O, 1/l disambiguation. */
export const monoMinFontSize = 13;

export const fontWeights = {
  regular: "400",
  medium: "500",
} as const satisfies Record<string, TextStyle["fontWeight"]>;

/**
 * Compose into every style that renders a money amount: tabular figures give
 * each digit the same advance width, so stacked amounts align on the decimal
 * point and don't wobble as digits change.
 */
export const amountStyle: TextStyle = {
  fontVariant: ["tabular-nums"],
};

/**
 * `maxFontSizeMultiplier` for amount Texts in space-constrained rows: prose
 * scales fully with Dynamic Type (and truncates gracefully), but amounts
 * can't shrink or ellipsize without lying, so cap their growth instead of
 * letting the last digits clip off the row edge.
 */
export const amountMaxFontSizeMultiplier = 1.4;

/** Nav-header text action (Done/Save buttons rendered via headerRight). */
export const headerActionStyle = (theme: ColorTheme): TextStyle => ({
  fontSize: fontSizes.lg,
  fontWeight: fontWeights.medium,
  color: theme.primary,
});
