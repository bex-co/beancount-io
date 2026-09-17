import type { TextProps } from "react-native";

/**
 * Text props for a hero-sized money figure: the transaction detail headline,
 * the chart headline on Home and the account drill-down, and the account
 * table balance (whose 21+ character figures wrapped mid-number at the
 * default text size — w1/034).
 *
 * A hero amount must stay one visual unit. Left to wrap, `-$26,560,000,000.00`
 * broke after its leading minus and `$640,480,000,000.00` broke inside a digit
 * group, so the first line read as a different number. It must not ellipsize
 * either — a truncated figure is also a different number — so a value too wide
 * for its row shrinks instead. The floor leaves room for the longest realistic
 * figure at the largest text size amounts allow.
 */
export const HERO_AMOUNT_FIT = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.35,
} as const satisfies Pick<
  TextProps,
  "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale"
>;
