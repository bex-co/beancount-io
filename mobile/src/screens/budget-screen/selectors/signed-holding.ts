import type { Holding } from "../../../common/balance-display";

/**
 * `holding` in a budget's sign convention, where income reads positive as
 * spending does: `direction` is the budget's (1 for spending, -1 for income).
 */
export function signed(holding: Holding, direction: 1 | -1): Holding {
  if (direction === 1) return holding;
  const exact = holding.exact?.startsWith("-")
    ? holding.exact.slice(1)
    : holding.exact && `-${holding.exact}`;
  return { ...holding, number: -holding.number, ...(exact ? { exact } : {}) };
}
