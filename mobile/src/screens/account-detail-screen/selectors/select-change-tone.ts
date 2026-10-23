/** How a journal row's change reads: up, down, or neither. */
export type ChangeTone = "up" | "down" | "flat";

/** Half a cent: a split's rounded per-unit cost leaves less than this. */
const NO_COST = 0.005;

/**
 * The tone of a row's change, by its effect on net worth (`netWorthSign`).
 * Units that moved at no cost, the +90 shares of a 10-for-1 split, change
 * nothing the account is worth: flat, not a green gain (w21/713). `unitsCost`
 * is the row's cost in a units account, null when unknown.
 */
export function journalChangeTone(
  change: number,
  netWorthSign: 1 | -1,
  unitsCost?: number | null,
): ChangeTone {
  if (typeof unitsCost === "number" && Math.abs(unitsCost) < NO_COST) {
    return "flat";
  }
  const effect = change * netWorthSign;
  return effect > 0 ? "up" : effect < 0 ? "down" : "flat";
}
