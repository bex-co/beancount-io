/**
 * Dynamic Type layout policy — the one place that decides when enlarged text
 * stops fitting a side-by-side row.
 *
 * Rows that pair a leading label with a trailing value (merchant rows, report
 * breakdown rows) work fine at the default text size and start fighting for
 * width as the user's text size grows: the label truncates to an ambiguous
 * `RealEst…` while the amount keeps its own cap. Above the threshold below,
 * those rows stack the trailing block under the label instead.
 *
 * This module is pure (no react-native import) so the unit-test runner can load
 * it under plain Node; callers read the live scale from
 * `useWindowDimensions().fontScale`.
 */

/**
 * Font scale at or above which a label+value row stacks.
 *
 * React Native reports iOS Dynamic Type as these `fontScale`s
 * (`RCTAccessibilityManager.mm`, which nothing in this app overrides): xxLarge
 * 1.235, xxxLarge 1.353 — the largest *non*-accessibility size — and
 * accessibility-medium (AX1) 1.786. 1.5 sits between the last two, so the default
 * and every ordinary larger setting keep the existing single-line geometry byte
 * for byte, and only the accessibility sizes (AX1 and up) switch to the stacked
 * variant. It was 1.3, written as "the first step past xxxLarge ≈ 1.235" with the
 * ladder one step off, which put xxxLarge on the stacked side (w22/032).
 */
export const STACKED_LAYOUT_FONT_SCALE = 1.5;

/**
 * Whether label+value rows should stack at this text size.
 *
 * Defensive about the input because `fontScale` comes from the platform: a
 * missing or non-finite value means "unknown", which must read as the default
 * size rather than silently restyling every row.
 */
export function prefersStackedLayout(fontScale: number | undefined): boolean {
  if (typeof fontScale !== "number" || !Number.isFinite(fontScale)) {
    return false;
  }
  return fontScale >= STACKED_LAYOUT_FONT_SCALE;
}

/**
 * `styles` with each fixed `lineHeight` dropped once text is enlarged, so the
 * platform's natural line height applies. React Native already multiplies a
 * point `lineHeight` by the text size on iOS, so growing it here as well made
 * every line about twice as tall at AX2 (24 pt became 111 pt) and split a
 * wrapped name far apart (w21/247); no pre-scaling is needed, and the natural
 * line height can neither clip a glyph nor double the spacing. The default and
 * smaller sizes keep their line heights exactly.
 */
export function relaxLineHeights<T extends Record<string, object>>(
  styles: T,
  fontScale: number | undefined,
): T {
  if (typeof fontScale !== "number" || !Number.isFinite(fontScale)) {
    return styles;
  }
  if (fontScale <= 1) return styles;
  const relaxed: Record<string, object> = {};
  for (const [name, style] of Object.entries(styles)) {
    if (typeof (style as { lineHeight?: unknown }).lineHeight !== "number") {
      relaxed[name] = style;
      continue;
    }
    const { lineHeight: _lineHeight, ...rest } = style as {
      lineHeight: number;
    };
    relaxed[name] = rest;
  }
  return relaxed as T;
}
