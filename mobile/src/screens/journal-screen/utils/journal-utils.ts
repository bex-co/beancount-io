import { JournalDirectiveType, isJournalTransaction } from "../types";

// Type definitions that work with GraphQL generated types
// These types are compatible with the generated types but allow null for units.number
export type JournalEntryPosting = {
  account: string;
  units?: {
    number?: number | null;
  } | null;
};

export type JournalEntry = {
  date: string;
};

/**
 * Collects every account a directive touches, for resolving its row icon.
 *
 * Transactions expose their postings; most other directives (Open, Close,
 * Balance, Note, Document, Pad) are anchored to a single account. Price,
 * Commodity, Event and Custom have none — they return `[]` and fall back to a
 * neutral glyph.
 *
 * @param entry - Any journal directive
 * @returns The directive's account names, possibly empty
 */
export const getEntryAccounts = (entry: JournalDirectiveType): string[] => {
  if (isJournalTransaction(entry)) {
    return entry.postings?.map((p) => p.account).filter(Boolean) ?? [];
  }
  const account = (entry as { account?: string }).account;
  return account ? [account] : [];
};

/**
 * Formats an account name for display in journal entries
 * Shows TopLevel/LastSegment for multi-level accounts
 * @param account - Full account name with colon separators
 * @returns Formatted account name
 */
export const formatAccountName = (account: string): string => {
  const parts = account.split(":");
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return parts.join("/");
  } else {
    // Show first part (Assets, Expenses, etc.) and last part
    return `${parts[0]}/${parts[parts.length - 1]}`;
  }
};

/**
 * Gets account flow description for transactions
 * @param postings - Array of journal entry postings
 * @param t - Translation function
 * @returns Formatted account flow string
 */
export const getAccountFlow = (
  postings: JournalEntryPosting[],
  t: (key: string) => string,
): string => {
  if (!postings || postings.length === 0) return "";

  // Separate positive (debit) and negative (credit) postings
  const debits = postings.filter((p) => p.units?.number && p.units.number > 0);
  const credits = postings.filter((p) => p.units?.number && p.units.number < 0);

  // Handle different cases
  if (debits.length === 1 && credits.length === 1) {
    // Simple transfer
    return `${formatAccountName(debits[0].account)} ← ${formatAccountName(credits[0].account)}`;
  } else if (debits.length > 1 && credits.length === 1) {
    // Split from one source
    if (debits.length === 2) {
      return `${debits.map((d) => formatAccountName(d.account)).join(", ")} ← ${formatAccountName(credits[0].account)}`;
    } else {
      return `${debits.length} ${t("accountsPlural")} ← ${formatAccountName(credits[0].account)}`;
    }
  } else if (debits.length === 1 && credits.length > 1) {
    // Multiple sources to one destination
    if (credits.length === 2) {
      return `${formatAccountName(debits[0].account)} ← ${credits.map((c) => formatAccountName(c.account)).join(", ")}`;
    } else {
      return `${formatAccountName(debits[0].account)} ← ${credits.length} ${t("accountsPlural")}`;
    }
  } else if (debits.length > 0 && credits.length > 0) {
    // Complex multi-leg transaction
    return `${debits.length} → ${credits.length} ${t("accountsPlural")}`;
  } else {
    // Fallback
    return postings[0] ? formatAccountName(postings[0].account) : "";
  }
};

/**
 * Calculates the transaction amount from postings
 * @param postings - Array of journal entry postings
 * @returns Transaction amount
 */
export const getTransactionAmount = (
  postings: JournalEntryPosting[],
): number => {
  if (!postings || postings.length === 0) return 0;

  // Sum all positive amounts (debits)
  const positiveSum = postings
    .filter((p) => p.units?.number && p.units.number > 0)
    .reduce((sum, p) => sum + (p.units?.number || 0), 0);

  // Sum all negative amounts (credits) - make it positive for display
  const negativeSum = Math.abs(
    postings
      .filter((p) => p.units?.number && p.units.number < 0)
      .reduce((sum, p) => sum + (p.units?.number || 0), 0),
  );

  // Return the non-zero sum (typically they should be equal in a balanced transaction)
  return positiveSum || negativeSum;
};

/**
 * Groups journal entries by date
 * @param entries - Array of journal entries
 * @returns Array of tuples [formattedDate, entries[]]
 */
export const groupEntriesByDate = (
  entries: JournalEntry[],
): [string, JournalEntry[]][] => {
  const groups: { [key: string]: JournalEntry[] } = {};
  entries.forEach((entry) => {
    const date = new Date(entry.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(entry);
  });
  return Object.entries(groups).sort(
    (a, b) =>
      new Date(b[1][0].date).getTime() - new Date(a[1][0].date).getTime(),
  );
};
