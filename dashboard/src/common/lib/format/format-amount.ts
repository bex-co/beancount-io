/**
 * Format a ledger amount for display by removing grouping commas.
 *
 * The decimal string is otherwise returned untouched: ledger quantities and
 * quotes carry their own significant digits (0.004 ETH, 0.0230 USD/CUSDC) and
 * a fixed two-decimal cap silently truncated them to 0.00. Currency-specific
 * rounding is the caller's concern, not this formatter's.
 *
 * @param amount - Amount string to format
 * @returns Formatted amount string
 */
export const formatAmount = (amount: string): string =>
  amount.replace(/,/g, "");
