/** Leaf segment of a colon-delimited beancount account
 * (e.g. "Assets:Bank:Checking" → "Checking"). */
export function leafName(account: string): string {
  const parts = account.split(":");
  return parts[parts.length - 1] || account;
}

/** Everything below the root (e.g. "Expenses:Food:Groceries" → "Food:Groceries").
 * Keeps the branch a row sits on, which `leafName` drops. */
export function dropRoot(account: string): string {
  const parts = account.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : account;
}
