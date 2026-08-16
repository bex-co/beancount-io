/**
 * Padding applied to a chord-sum length estimate so it always covers the real
 * curve.
 *
 * The charts draw with `curveMonotoneX`, which bows between points, so the true
 * arc is a few percent longer than the sum of the straight chords. That
 * direction matters: a `strokeDasharray` shorter than the real path leaves the
 * tail permanently undrawn, while one that is slightly too long only means the
 * stroke finishes fractionally before the animation does. So round up.
 */
export const CURVE_LENGTH_SLACK = 1.08;

/**
 * Approximate drawn length of a series, for `strokeDasharray` line-drawing.
 *
 * Sums the straight-line distance between consecutive points and pads the
 * result by `CURVE_LENGTH_SLACK`. Deliberately does **not** use
 * `getTotalLength()` from react-native-svg: that is flagged experimental in the
 * library's own source, is a synchronous JS-thread-only native call that can
 * only run after layout, and has open correctness bugs. Summing our own points
 * is exact input, free, and worklet-safe.
 */
export function polylineLength(xs: number[], ys: number[]): number {
  "worklet";
  const count = Math.min(xs.length, ys.length);
  if (count < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < count; i++) {
    const dx = xs[i] - xs[i - 1];
    const dy = ys[i] - ys[i - 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total * CURVE_LENGTH_SLACK;
}
