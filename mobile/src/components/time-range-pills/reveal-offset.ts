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

/**
 * Where to scroll a row that is already scrolled to `offset` so the pill shows
 * whole, or `null` when it does. The first-paint reveal above assumes offset 0;
 * a chip tapped, or a range set from outside, later is judged against where the
 * row actually is, cut off at either edge (w21/891).
 */
export function pillScrollTarget(
  pill: { x: number; width: number },
  viewport: number,
  offset: number,
): number | null {
  if (viewport <= 0 || pill.width <= 0) return null;
  if (pill.x >= offset && pill.x + pill.width <= offset + viewport) return null;
  if (pill.x < offset) return Math.max(0, pill.x - gutter);
  return pill.x + pill.width - viewport + gutter;
}
