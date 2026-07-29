export type AccountCategory =
  | "source"
  | "operating"
  | "investing"
  | "financing"
  | "exclude";

/**
 * Categorize a Beancount account by its type prefix
 */
export function categorizeAccount(accountName: string): AccountCategory {
  if (!accountName) {
    return "exclude";
  }
  const prefix = accountName.split(":")[0];

  switch (prefix) {
    case "Income":
      return "source";
    case "Expenses":
      return "operating";
    case "Assets":
      return "investing";
    case "Liabilities":
      return "financing";
    case "Equity":
      return "exclude";
    default:
      return "exclude";
  }
}

/**
 * Check if an account should be excluded from cash flow visualization
 * (e.g., cash-equivalent accounts should not appear in "investing")
 */
export function isExcludedAccount(accountName: string): boolean {
  if (!accountName) {
    return false;
  }
  const exclusionPatterns = [
    /^Assets:.*Cash$/i,
    /^Assets:.*Checking$/i,
    /^Assets:.*Savings$/i,
    /^Assets:.*Bank/i,
  ];

  return exclusionPatterns.some((pattern) => pattern.test(accountName));
}

/**
 * Extract account name at a specific hierarchical depth
 * @param accountName - Full account name (e.g., "Income:Salary:Gross")
 * @param depth - Desired depth level (1, 2, or 3)
 * @returns Account name at specified depth (e.g., "Income:Salary" at depth 2)
 */
export function extractAccountAtDepth(
  accountName: string,
  depth: number,
): string {
  if (!accountName) {
    return "";
  }
  const parts = accountName.split(":");
  const targetDepth = Math.min(depth, parts.length);
  return parts.slice(0, targetDepth).join(":");
}
