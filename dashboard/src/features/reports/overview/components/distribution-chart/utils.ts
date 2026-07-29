export type DistributionItem = { name: string; label: string; value: number };

/**
 * Groups items whose share of the total is below 1% into a single "other" bucket.
 * Returns an empty array when rawData is empty or the total is zero.
 */
export function groupDistributionData(
  rawData: DistributionItem[],
  otherLabel: string,
): DistributionItem[] {
  if (rawData.length === 0) return [];

  const total = rawData.reduce((sum, item) => sum + Math.abs(item.value), 0);

  if (total === 0) return rawData;

  const mainItems: DistributionItem[] = [];
  let otherValue = 0;

  for (const item of rawData) {
    const percentage = (Math.abs(item.value) / total) * 100;
    if (percentage >= 1) {
      mainItems.push(item);
    } else {
      otherValue += item.value;
    }
  }

  if (otherValue !== 0) {
    mainItems.push({ name: otherLabel, label: otherLabel, value: otherValue });
  }

  return mainItems;
}
