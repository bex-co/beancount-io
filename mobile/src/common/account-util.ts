/** Leaf segment of a colon-delimited beancount account
 * (e.g. "Assets:Bank:Checking" → "Checking"). */
export function leafName(account: string): string {
  const parts = account.split(":");
  return parts[parts.length - 1] || account;
}
