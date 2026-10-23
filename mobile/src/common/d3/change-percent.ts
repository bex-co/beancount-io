import { groupThousands } from "../number-utils";

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

/**
 * The change row's percentage as it is shown: rounded to two places first, a
 * rounded -0 normalised to 0, and the sign and the verdict taken from the
 * rounded value, as the amount's sign is (w21/055). Prefixed from the raw
 * change, a move of -$12 on 2,500,000 read "-$12.00 (-0.00%)" in the
 * unfavourable colour, and a sub-cent gain "+$0.00 (-0.00%)" (w21/237).
 * `flat` is true when it rounds to nothing, which reads in the neutral colour.
 * Grouped in thousands as the amount beside it is: a card from −$143.25 to
 * −$15,143.25 read "(−10471.20%)" (w21/752).
 */
export function formatChangePercent(pct: number): {
  text: string;
  flat: boolean;
} {
  const rounded = Math.round(pct * 100) / 100 + 0;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return {
    text: `${sign}${groupThousands(rounded, 2)}%`,
    flat: rounded === 0,
  };
}

/**
 * The change row's amount and whether it reads in the neutral colour. A change
 * that rounds to nothing is flat whatever the percentage: from a zero baseline
 * there is no percentage, and "+$0.00" was drawn in the gain colour on an empty
 * ledger (w21/416). Flat when the formatted amount holds no non-zero digit; a
 * flat amount is shown unsigned. `pct` is the formatted percentage, if any,
 * and decides flatness when there is one.
 */
export function describeChange(
  change: number,
  pct: { flat: boolean } | null,
  format: (value: number, includePlus?: boolean) => string,
): { amount: string; flat: boolean } {
  const amount = format(change, true);
  const roundsToNothing = !/[1-9]/.test(amount);
  if (pct !== null) return { amount, flat: pct.flat };
  return roundsToNothing
    ? { amount: format(0), flat: true }
    : { amount, flat: false };
}

/**
 * Whether a move from `baseline` to `value` reads flat in the change row, as
 * the row decides it with `describeChange`. The line and its fill take the
 * neutral colour then too: a range that rounded to "+$0.00 (0.00%)" read grey
 * above a green line, or a red one for a near-flat drop (w21/750).
 */
export function changeReadsFlat(
  baseline: number,
  value: number,
  format: (value: number, includePlus?: boolean) => string,
): boolean {
  const pct = changePercent(baseline, value);
  return describeChange(
    value - baseline,
    pct === null ? null : formatChangePercent(pct),
    format,
  ).flat;
}
