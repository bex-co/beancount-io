/**
 * Which figure `AnimatedAmount` should format.
 *
 * The tween's intermediate frames are rounded to cents (anything finer cannot
 * change a pixel), so the rounded value must not become the *resting* value: a
 * -367.985 balance would settle at -367.98 while the table cell beside it shows
 * -367.99. Once the tween reports completion — or when it is bypassed entirely,
 * including reduce-motion — the exact `value` is rendered instead.
 */
export function selectAnimatedAmountValue(input: {
  /** The real target figure. */
  value: number;
  /** The cent-rounded figure the running tween last scheduled back to JS. */
  shown: number;
  /** Whether a tween is being used at all. */
  animate: boolean;
  /** Whether the tween towards the current `value` has finished. */
  settled: boolean;
}): number {
  return input.animate && !input.settled ? input.shown : input.value;
}

/**
 * Whether a `withTiming` completion callback should mark the component settled.
 *
 * Rapid target replacement leaves earlier tweens' callbacks in flight; one that
 * reports for a superseded target must not settle the component, or the render
 * would snap to the stale exact figure while the live tween is still counting.
 * An interrupted tween (`finished === false`) never settles either.
 */
export function shouldSettleAnimatedAmount(
  finished: boolean | undefined,
  completedTarget: number,
  currentTarget: number,
): boolean {
  return finished === true && Object.is(completedTarget, currentTarget);
}
