import { sumDecimalNumbers } from "@/common/lib/beancount/decimal-number";
import type { DistributionItem } from "../../lib/overview-utils";

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
  const otherAmounts: string[] = [];

  for (const item of rawData) {
    const percentage = (Math.abs(item.value) / total) * 100;
    if (percentage >= 1) {
      mainItems.push(item);
    } else {
      otherAmounts.push(item.exact);
    }
  }

  // Summed as decimals: small balances that cancel leave no binary residue,
  // and a lone -0.00001 is not rounded away.
  const otherExact = sumDecimalNumbers(otherAmounts);
  const otherValue = Number(otherExact);
  if (otherValue !== 0) {
    mainItems.push({
      name: otherLabel,
      label: otherLabel,
      value: otherValue,
      exact: otherExact,
    });
  }

  return mainItems;
}
