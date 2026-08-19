/**
 * Scrub math for the interactive line chart — the pure seam between the finger
 * and everything the chart shows under it.
 *
 * Import-free so the same functions run inside a worklet on the UI thread and
 * under the unit-test runner, matching `bar-geometry.ts` and
 * `components/ledger-drawer/drawer-motion.ts`.
 *
 * The chart's own geometry cannot come along for the ride. d3's scales and
 * shape generators are closures over class instances and the worklet serializer
 * copies neither (see `buildPaths`), so the gesture works entirely in plain
 * numbers: an index resolved from the touch x, then used to look up point
 * positions the JS thread precomputed once into `number[]`.
 */

/**
 * No finger down.
 *
 * A sentinel rather than `null` because the index lives in a shared value that
 * worklets read every frame, and `-1` keeps that value a plain number — no
 * boxing, no null checks scattered through the animated props, and one
 * comparison (`>= 0`) to mean "scrubbing".
 */
export const SCRUB_IDLE = -1;

/**
 * The data point nearest a touch at `x`, in the chart container's own
 * coordinates.
 *
 * `x` is clamped to the plot's padded box before it is mapped, so dragging
 * past either edge holds the end point rather than running off the series —
 * a finger that leaves the chart is still scrubbing its last position.
 *
 * An empty series resolves to `SCRUB_IDLE`: there is no point to sit on, and
 * returning index 0 would put a cursor on a curve that was never drawn.
 */
export function scrubIndexForX(
  x: number,
  chartWidth: number,
  count: number,
  padX: number,
): number {
  "worklet";
  if (count <= 0) {
    return SCRUB_IDLE;
  }
  if (count === 1) {
    return 0;
  }
  const inner = chartWidth - padX * 2;
  if (inner <= 0) {
    return 0;
  }
  const clamped = Math.max(padX, Math.min(chartWidth - padX, x));
  const ratio = (clamped - padX) / inner;
  return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
}

/**
 * The index the chart displays: the scrubbed one while a finger is down, the
 * latest point otherwise.
 *
 * Also the guard for a stale index. The scrub index outlives a single series —
 * a range switch can land a shorter array under a finger that is still
 * touching — so an index past the end resolves to the last point instead of
 * reading `undefined` out of the array.
 */
export function shownScrubIndex(scrubIndex: number, count: number): number {
  "worklet";
  if (count <= 0) {
    return SCRUB_IDLE;
  }
  if (scrubIndex < 0 || scrubIndex >= count) {
    return count - 1;
  }
  return scrubIndex;
}

/**
 * The index the cursor sits on, or `SCRUB_IDLE` when there is no cursor to draw.
 *
 * The plot's counterpart to `shownScrubIndex`, which the header uses: both
 * clamp a stale index to the last point, and they differ only in what "no
 * finger down" means to each. A resting header still shows a figure, so idle
 * resolves to the latest point there; a resting plot draws no cursor at all, so
 * idle stays idle here. Asking this rather than testing the sentinel inline is
 * what keeps the two in step — without it a range switch under a live finger
 * clamps the headline while blinking the cursor off the curve.
 */
export function activeScrubIndex(scrubIndex: number, count: number): number {
  "worklet";
  if (scrubIndex === SCRUB_IDLE) {
    return SCRUB_IDLE;
  }
  return shownScrubIndex(scrubIndex, count);
}

/** The value under the cursor, or the latest one at rest. Zero if there is no series. */
export function scrubbedValue(values: number[], scrubIndex: number): number {
  "worklet";
  const index = shownScrubIndex(scrubIndex, values.length);
  return index === SCRUB_IDLE ? 0 : values[index];
}

/**
 * Whether crossing from `previous` to `current` earns a selection tick.
 *
 * Gated on the index *changing*, never on the touch moving: at frame rate a
 * selection haptic stops reading as a tick per point and becomes a buzz.
 *
 * Touch-in and lift-off are both silent here. Landing a finger gets the impact
 * haptic instead (the "tap-in" feel), and firing a tick for the same point the
 * impact just announced would double up; lifting off ends the interaction and
 * has nothing to announce. `previous` is `null` on a reaction's first run,
 * which is neither of those events but is likewise nothing the user did.
 */
export function shouldTickHaptic(
  previous: number | null,
  current: number,
): boolean {
  "worklet";
  if (current === SCRUB_IDLE) {
    return false;
  }
  if (previous === null || previous === SCRUB_IDLE) {
    return false;
  }
  return previous !== current;
}
