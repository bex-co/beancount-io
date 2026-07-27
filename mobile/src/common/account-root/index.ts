/**
 * Beancount's five root account types, and how to resolve the one that best
 * describes a directive.
 *
 * Account names are colon-separated and always anchored at one of these roots
 * (`Expenses:Food:Restaurant`, `Assets:Investments:Vanguard`, …), which makes
 * the root a reliable, offline signal for a row's icon.
 */
export type AccountRoot =
  "assets" | "liabilities" | "equity" | "income" | "expenses";

/**
 * Priority order used when a directive touches several roots. Expenses and
 * income win over the funding side, so a restaurant charge reads as an expense
 * rather than as the bank account it was paid from. A transfer between two
 * asset accounts falls through to `assets`.
 */
const ROOT_PRIORITY: AccountRoot[] = [
  "expenses",
  "income",
  "equity",
  "liabilities",
  "assets",
];

const KNOWN_ROOTS = new Set<string>(ROOT_PRIORITY);

/**
 * Resolve an account name to its root type.
 * @param account - Full account name, e.g. `Expenses:Food:Restaurant`.
 * @returns The lowercased root, or null when it is not one of the five.
 */
export function getAccountRoot(account: string): AccountRoot | null {
  if (!account) return null;
  const first = account.split(":")[0].trim().toLowerCase();
  return KNOWN_ROOTS.has(first) ? (first as AccountRoot) : null;
}

/**
 * Pick the root that best describes a directive from all the accounts it
 * touches, using {@link ROOT_PRIORITY}.
 * @param accounts - Every account on the directive (postings, or its own).
 * @returns The winning root, or null when none of them resolve.
 */
export function pickAccountRoot(accounts: string[]): AccountRoot | null {
  if (!accounts?.length) return null;

  const present = new Set<AccountRoot>();
  for (const account of accounts) {
    const root = getAccountRoot(account);
    if (root) present.add(root);
  }

  for (const root of ROOT_PRIORITY) {
    if (present.has(root)) return root;
  }
  return null;
}

/**
 * Order accounts by {@link ROOT_PRIORITY} so the categorization side (Expenses,
 * Income) comes before the funding side (Liabilities, Assets). Used to decide
 * which account to try first when matching a brand logo — the "target" account
 * wins over the account it was paid from. Accounts whose root does not resolve
 * sort last; ties keep their original order (stable).
 */
export function orderAccountsByRootPriority(accounts: string[]): string[] {
  const rank = (account: string): number => {
    const root = getAccountRoot(account);
    const idx = root ? ROOT_PRIORITY.indexOf(root) : -1;
    return idx === -1 ? ROOT_PRIORITY.length : idx;
  };
  return accounts
    .map((account, i) => ({ account, i, r: rank(account) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.account);
}
