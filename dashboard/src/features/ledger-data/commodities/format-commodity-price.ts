/**
 * Format commodity quote strings for tooltips without cash-style 2dp rounding.
 * Keeps the source decimal text, only stripping redundant trailing zeros.
 */
export function formatCommodityPriceLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.includes(".")) return trimmed;
  return trimmed.replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Choose y-axis decimals so nearby ticks in a low-price series stay distinct,
 * while large quotes (e.g. BTC) stay readable at two places.
 */
export function commodityAxisDecimals(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return 2;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = Math.abs(max - min);

  if (range === 0) {
    const abs = Math.abs(min);
    if (abs === 0 || abs >= 1) return 2;
    return Math.min(6, Math.max(2, Math.ceil(-Math.log10(abs)) + 1));
  }

  const decimals = Math.ceil(-Math.log10(range / 10));
  return Math.min(6, Math.max(2, decimals));
}

export function formatCommodityAxisTick(
  value: number,
  values: number[],
): string {
  return value.toFixed(commodityAxisDecimals(values));
}
