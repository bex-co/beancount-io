/**
 * Motion math for the ledger drawer, shared by the gesture worklets (UI thread)
 * and the unit tests. Deliberately import-free so both can run it.
 *
 * Position is `progress`: 0 = closed, 1 = fully open. Velocities are in progress
 * units per second, so callers divide a pixel velocity by the drawer width once
 * and every rule below stays independent of screen size.
 */

/**
 * How far a release velocity is projected forward when deciding where the
 * drawer settles. 150ms is long enough that a flick commits well before the
 * halfway point, short enough that a slow drag is decided by position alone.
 */
export const RELEASE_PROJECTION_SECONDS = 0.15;

export function clampProgress(value: number): number {
  "worklet";
  if (value < 0) {
    return 0;
  }
  return value > 1 ? 1 : value;
}

/**
 * Where the drawer settles once the finger lifts: the current position carried
 * forward by the release velocity, then snapped to the nearer end. One rule
 * covers both "dragged past halfway" and "flicked from anywhere", so the two
 * can't disagree at the boundary the way a separate distance and velocity
 * threshold could.
 */
export function settleTarget(progress: number, velocity: number): 0 | 1 {
  "worklet";
  return progress + velocity * RELEASE_PROJECTION_SECONDS > 0.5 ? 1 : 0;
}
