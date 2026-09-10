/**
 * Format an import amount for Configure review without cash-style 2dp rounding.
 * Preserves significant fractional commodity values (e.g. BTC satoshi-scale).
 */
export function formatImportReviewAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return "0";
  }

  return amount.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}
