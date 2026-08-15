/**
 * Pure helpers for morphing one chart series into another.
 *
 * Import-free so the unit-test runner can reach them, matching
 * `components/ledger-drawer/drawer-motion.ts`.
 *
 * Two series drawn from different time ranges rarely share a point count — a
 * 1M range and an ALL range can differ by an order of magnitude — so they are
 * resampled onto a common grid before being blended. Resampling in *value*
 * space rather than along the drawn path keeps the blend meaningful: every
 * intermediate frame is still a real balance curve, just a partly-rescaled one.
 */

/** Linear blend between two numbers. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Resample a series onto exactly `count` evenly spaced points, interpolating
 * linearly between the originals.
 *
 * A single-point series is held flat across the whole grid, and a request for
 * fewer than two points returns empty — both are degenerate inputs that the
 * chart declines to draw anyway, and neither should throw mid-animation.
 */
export function resampleSeries(values: number[], count: number): number[] {
  if (count < 2) {
    return [];
  }
  if (values.length === 0) {
    return [];
  }
  if (values.length === 1) {
    return new Array(count).fill(values[0]);
  }

  const out: number[] = [];
  const lastIndex = values.length - 1;
  for (let i = 0; i < count; i++) {
    // Position along the source series, in source-index units.
    const position = (i / (count - 1)) * lastIndex;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, lastIndex);
    out.push(lerp(values[lower], values[upper], position - lower));
  }
  return out;
}

/**
 * Element-wise blend of two equal-length series. Returns `to` unchanged if the
 * lengths disagree — callers are expected to resample first, and a mismatched
 * blend would silently draw a truncated curve.
 */
export function lerpSeries(from: number[], to: number[], t: number): number[] {
  if (from.length !== to.length) {
    return to;
  }
  return from.map((value, i) => lerp(value, to[i], t));
}

/**
 * Whether two series are the same curve. Used to tell a genuine range change
 * from the many re-renders that hand back an equal-but-new array — animating
 * on those would restart the transition on every scrub tick.
 */
export function sameSeries(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, i) => value === b[i]);
}
