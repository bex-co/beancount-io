/**
 * Percent change from `baseline` to `value`, or null when no percentage means
 * anything: a zero start, or a start and end on opposite sides of zero (net
 * worth from −76 to +1,347 has no percent change). Measured against the
 * baseline's magnitude, so a liability shrinking from −1,000 to −500 reads
 * +50% rather than as a loss.
 */
export function changePercent(baseline: number, value: number): number | null {
  if (
    baseline === 0 ||
    (value !== 0 && Math.sign(value) !== Math.sign(baseline))
  ) {
    return null;
  }
  return ((value - baseline) / Math.abs(baseline)) * 100;
}
