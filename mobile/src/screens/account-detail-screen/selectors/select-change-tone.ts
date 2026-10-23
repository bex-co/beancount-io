/** How a journal row's change reads: up, down, or neither. */
export type ChangeTone = "up" | "down" | "flat";

/** Half a cent: a split's rounded per-unit cost leaves less than this. */
const NO_COST = 0.005;

/**
 * The tone of a row's change, by its effect on net worth (`netWorthSign`).
 * Units that moved at no cost, the +90 shares of a 10-for-1 split, change
 * nothing the account is worth: flat, not a green gain (w21/713). `unitsCost`
 * is the row's cost in a units account, null when unknown. With `shownScale`,
 * a change that rounds to nothing there is flat: −0.003 USD read a red
 * "$0.00" (w21/784).
 */
export function journalChangeTone(
  change: number,
  netWorthSign: 1 | -1,
  unitsCost?: number | null,
  shownScale?: number,
): ChangeTone {
  if (typeof unitsCost === "number" && Math.abs(unitsCost) < NO_COST) {
    return "flat";
  }
  const shown =
    shownScale === undefined
      ? change
      : Number(change.toFixed(Math.min(100, Math.max(0, shownScale))));
  const effect = shown * netWorthSign;
  return effect > 0 ? "up" : effect < 0 ? "down" : "flat";
}
