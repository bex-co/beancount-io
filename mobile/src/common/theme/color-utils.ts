/**
 * Color helpers for composing theme tokens.
 *
 * This module is pure (no runtime react-native import) so unit tests can load
 * it under Node, same as `./typography.ts`.
 */

/**
 * Apply an alpha channel to a hex color, for tinted fills built from a token.
 *
 * Every `ColorTheme` value is a 6-digit hex, which React Native accepts with an
 * `#rrggbbaa` suffix. Anything else (already-aliased colors, `rgba(...)`
 * strings) is passed through untouched rather than corrupted.
 *
 * @param hex - A `#rrggbb` color, typically a theme token.
 * @param alpha - Opacity in the 0–1 range; clamped.
 * @returns `#rrggbbaa`, or `hex` unchanged when it is not 6-digit hex.
 */
export const withAlpha = (hex: string, alpha: number): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const clamped = Math.max(0, Math.min(1, alpha));
  const suffix = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${suffix}`;
};

/** One sRGB channel, 0–255, linearized per WCAG 2.x. */
const linearize = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

/**
 * WCAG relative luminance of a `#rrggbb` color.
 *
 * @param hex - A `#rrggbb` color, typically a theme token.
 * @returns Luminance in the 0–1 range.
 * @throws If `hex` is not 6-digit hex — a contrast claim about a color we
 * cannot parse would be worse than no claim.
 */
export const relativeLuminance = (hex: string): number => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`relativeLuminance expects #rrggbb, got: ${hex}`);
  }
  const value = parseInt(hex.slice(1), 16);
  return (
    0.2126 * linearize((value >> 16) & 0xff) +
    0.7152 * linearize((value >> 8) & 0xff) +
    0.0722 * linearize(value & 0xff)
  );
};

/**
 * WCAG contrast ratio between two `#rrggbb` colors, 1–21.
 *
 * The bars this codebase measures against: **3:1** for a control boundary or
 * other non-text graphic (WCAG 1.4.11) and **4.5:1** for text below 18pt
 * (1.4.3). Order of arguments does not matter.
 */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
