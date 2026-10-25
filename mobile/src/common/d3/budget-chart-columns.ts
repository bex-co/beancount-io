/**
 * Width of one budget-chart column.
 *
 * `containerWidth` is what the chart actually has: measured from its own
 * layout, because the card and the list around it each add a gutter that a
 * screen-derived width knows nothing about. Derived from the screen it came
 * out 32 pt wider than its viewport, which scrolled to the end and cut off
 * the first bar and its label (w21/220). Columns are never narrower than
 * `minColumn`; a span too long to fit scrolls.
 */
export function budgetColumnWidth(
  containerWidth: number,
  axisWidth: number,
  count: number,
  minColumn: number,
): number {
  if (count <= 0) return minColumn;
  return Math.max(minColumn, (containerWidth - axisWidth) / count);
}
