/**
 * Geometry for a bar growing out of a chart's zero baseline.
 *
 * Import-free so it can run inside a worklet on the UI thread and under the
 * unit-test runner, matching `components/ledger-drawer/drawer-motion.ts`.
 */

export type BarRect = { y: number; height: number };

/**
 * Whether a bar extends above the baseline.
 *
 * Taken from the bar's resting top edge rather than from its underlying value,
 * because the charts clamp near-zero bars to a minimum visible height: a bar
 * worth £0.001 is drawn as a 2px sliver, and it has to grow in the direction
 * its sign points even though its geometry no longer encodes that sign.
 */
export function barGrowsUp(y: number, baselineY: number): boolean {
  "worklet";
  return y < baselineY;
}

/**
 * A bar's rectangle partway through its growth.
 *
 * SVG y grows downward, so a bar above the baseline has to move its top edge
 * up as it gets taller, while one below keeps its top edge pinned to the
 * baseline and only extends. Direction is fixed by the resting geometry and
 * never recomputed from the animated height, so a bar cannot cross zero or
 * flip partway through.
 */
export function barRectAt(
  y: number,
  height: number,
  baselineY: number,
  progress: number,
): BarRect {
  "worklet";
  const grown = height * progress;
  return {
    height: grown,
    y: barGrowsUp(y, baselineY) ? baselineY - grown : baselineY,
  };
}
