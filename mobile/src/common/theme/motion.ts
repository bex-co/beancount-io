/**
 * Motion scale — the single source of truth for animation durations, easing
 * curves and spring presets.
 *
 * Motion does not change between light and dark, so it lives here as plain
 * constants rather than on the theme object, the same way `spacing.ts` does.
 * Every duration in the app should resolve to one of these tokens; the
 * hard-coded millisecond values that used to live per-file had already drifted
 * to eleven different numbers across six files (300, 200/150, 500, 2000, …),
 * which is why a sheet, a toast and a skeleton all animated at subtly
 * different speeds.
 *
 * Deliberately **import-free** so the same module can be read from a worklet on
 * the UI thread and from the unit-test runner, matching
 * `components/ledger-drawer/drawer-motion.ts`. Easing curves are stored as
 * cubic-bezier control points rather than Reanimated `Easing` objects for the
 * same reason; `motion-easing.ts` materializes them for React code.
 *
 * ## The motion budget
 *
 * - **Entrances and transitions stay under 500ms.** Past that a transition
 *   stops reading as motion and starts reading as latency.
 * - **Direct feedback stays under 300ms.** A press or a selection must feel
 *   like it happened when the finger moved, not after.
 *
 * `durations` below is asserted against these limits in the unit tests, so the
 * budget cannot quietly drift. Ambient looping animations (the skeleton pulse)
 * are not transitions and live in `loopDurations`, exempt by design.
 */

/**
 * Transition durations, in milliseconds. Every value here is bound by the
 * motion budget above.
 */
export const durations = {
  /** No animation. For the reduce-motion path and for instant state swaps. */
  instant: 0,
  /** Direct feedback: press states, selection indicators. */
  fast: 150,
  /** The default for ordinary UI transitions — sheets, fades, toasts. */
  base: 250,
  /** Larger or longer-travel transitions. */
  slow: 400,
  /** Chart entrances and series morphs — the long end of the budget. */
  chart: 450,
} as const;

/** Upper bound for anything in `durations`. */
export const MAX_TRANSITION_MS = 500;

/** Upper bound for durations used as direct response to a touch. */
export const MAX_FEEDBACK_MS = 300;

/**
 * Ambient loop durations. These repeat for as long as a view is on screen, so
 * they are not transitions and the budget above does not apply.
 */
export const loopDurations = {
  /**
   * Half-cycle of the skeleton pulse, so a full dim-and-back takes twice this.
   * The old 300ms half-cycle read as a nervous throb; at this length it reads
   * as a breath.
   */
  pulse: 800,
} as const;

/**
 * Easing curves as cubic-bezier control points `[x1, y1, x2, y2]`, ready for
 * `Easing.bezier(...)`. See `motion-easing.ts` for the materialized versions.
 */
export const easings = {
  /**
   * Entrances: starts at full speed and settles. Things arriving on screen
   * should decelerate into place rather than ease in from nothing.
   */
  decelerate: [0, 0, 0.2, 1],
  /** Transitions between two states that are both already on screen. */
  standard: [0.4, 0, 0.2, 1],
  /** Exits: accelerates away. */
  accelerate: [0.4, 0, 1, 1],
} as const;

/**
 * Spring presets, as plain `withSpring` config objects.
 *
 * Springs are preferred over timings for anything the user is directly
 * manipulating, because they can absorb a velocity. `SnappySpringConfig` from
 * Reanimated already covers the drawer's settle (see `ledger-drawer.tsx`);
 * these cover the smaller cases.
 */
export const springs = {
  /** Press-down and release. Fast and overshoot-free. */
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  /** A selection indicator travelling between positions. */
  indicator: { damping: 20, stiffness: 260, mass: 0.8 },
} as const;

/** Clamp to the 0..1 range. Worklet-safe. */
export function clamp01(value: number): number {
  "worklet";
  if (value < 0) {
    return 0;
  }
  return value > 1 ? 1 : value;
}

/**
 * Fraction of a staggered sweep spent offsetting the start of each item. The
 * remainder is how long any single item takes, so a larger window means more
 * visible cascade and a shorter per-item animation.
 */
export const STAGGER_WINDOW = 0.45;

/**
 * Per-item progress within a staggered sweep, derived from one shared overall
 * progress value.
 *
 * A chart with N bars runs **one** animation from 0 to 1 and asks this for each
 * bar, rather than starting N independent animations with N delays. That keeps
 * the whole sweep inside a single duration token no matter how many bars there
 * are — a 3-bar month and a 36-bar year finish at the same moment — and it
 * means cancelling the sweep cancels every bar with it.
 *
 * Worklet-safe.
 */
export function staggeredProgress(
  overall: number,
  index: number,
  count: number,
): number {
  "worklet";
  if (count <= 1) {
    return clamp01(overall);
  }
  const start = (STAGGER_WINDOW * index) / (count - 1);
  const span = 1 - STAGGER_WINDOW;
  return clamp01((overall - start) / span);
}
