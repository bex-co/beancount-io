/**
 * The y-domain of the spending bar chart. It always includes zero, so every bar
 * grows from a visible baseline and a negative month reads below it, and it
 * never collapses to an empty range: an empty or all-zero series gets 0…1.
 */
export function barChartValueDomain(
  numbers: readonly number[],
): [number, number] {
  return [Math.min(...numbers, 0), Math.max(...numbers, 1)];
}
