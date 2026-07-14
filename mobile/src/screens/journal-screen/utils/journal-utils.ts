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
 * Gets initials from a name for avatar display
 * @param name - The name to extract initials from
 * @returns Two-character initials in uppercase
 */
export const getAvatarInitials = (name: string): string => {
  if (!name) return "?";
  const words = name.split(" ").filter((word) => word.length > 0);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Gets a deterministic color from a string for avatar background
 * @param name - The name to generate color from
 * @returns Hex color code
 */
export const getAvatarColor = (name: string): string => {
  if (!name) return "#6b6e5f"; // Brand Stone — neutral fallback avatar

  // Normalize the name to ensure consistent hashing (lowercase, trimmed)
  const normalizedName = name.toLowerCase().trim();

  // Create a more robust hash function
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Expanded color palette for better variety
  const colors = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Violet
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#EC4899", // Pink
    "#6366F1", // Indigo
    "#14B8A6", // Teal
    "#A855F7", // Purple
  ];

  return colors[Math.abs(hash) % colors.length];
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
