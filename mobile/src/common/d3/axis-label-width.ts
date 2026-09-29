/** Reserve room for the full tick, including a currency code such as MUSD. */
export function axisLabelWidth(
  labels: string[],
  fontSize: number,
  minimum: number,
): number {
  return Math.max(
    minimum,
    ...labels.map((label) => Math.ceil(label.length * fontSize * 0.7 + 8)),
  );
}
