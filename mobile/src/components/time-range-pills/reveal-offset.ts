import { gutter } from "../../common/theme/spacing";

/**
 * Where to scroll a row so its selected pill is visible on first paint, or
 * `null` to leave it. A pill already inside the viewport stays put — scrolling
 * it to the edge would be a visible jolt — and an overflowing one is brought
 * in with a gutter of context before it.
 */
export function selectedPillRevealOffset(
  pill: { x: number; width: number },
  viewport: number,
): number | null {
  if (viewport <= 0 || (pill.x >= 0 && pill.x + pill.width <= viewport)) {
    return null;
  }
  return Math.max(0, pill.x - gutter);
}
