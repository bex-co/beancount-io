/**
 * Pure layout math for `RollingAmount` — import-free so the unit runner can
 * load it without React Native.
 */

/** One slot in a rolling figure: a digit that rolls, or a run that doesn't. */
export type RollingGlyph =
  { key: string; digit: number } | { key: string; text: string };

const isDigit = (char: string) => char >= "0" && char <= "9";

/**
 * Splits a formatted figure into rolling digits and static runs (sign,
 * currency symbol or code, grouping and decimal separators).
 *
 * Keys count from the **end** of the string, so the cents and the units keep
 * their identity when the figure grows or shrinks at the front: `$9.99` →
 * `$10.00` rolls every existing digit in place and only the new leading one
 * mounts, instead of every slot shifting one place and rolling the wrong digit.
 */
export function rollingGlyphs(text: string): RollingGlyph[] {
  const glyphs: RollingGlyph[] = [];
  const length = text.length;
  let run = "";
  for (let i = 0; i < length; i += 1) {
    const char = text[i];
    if (!isDigit(char)) {
      run += char;
      continue;
    }
    if (run !== "") {
      glyphs.push({ key: `s${length - i}`, text: run });
      run = "";
    }
    glyphs.push({ key: `d${length - 1 - i}`, digit: Number(char) });
  }
  if (run !== "") {
    glyphs.push({ key: "s0", text: run });
  }
  return glyphs;
}

/**
 * The font scale that fits a figure `natural` points wide (at full size) into
 * `available` points — the hand-rolled `adjustsFontSizeToFit`, which a row of
 * separate digit columns cannot get from a single `Text`. Never grows past full
 * size and never shrinks past `minimum`. Unmeasured sizes leave it at full size.
 */
export function fitFontScale(
  available: number,
  natural: number,
  minimum: number,
): number {
  if (available <= 0 || natural <= 0) {
    return 1;
  }
  return Math.max(minimum, Math.min(1, available / natural));
}
