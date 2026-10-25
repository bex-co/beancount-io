/**
 * Format an import amount for Configure review without cash-style 2dp rounding.
 * Preserves significant fractional commodity values (e.g. BTC satoshi-scale).
 */
export function formatImportReviewAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) {
    return "0";
  }

  const formatted = amount.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
  // A nonzero amount below the 20-place fixed-format boundary (e.g. 1e-24)
  // would read as plain zero; keep its magnitude and sign visible instead.
  if (formatted === "0" || formatted === "-0") return String(amount);
  return formatted;
}
