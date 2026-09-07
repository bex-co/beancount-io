import type {
  LegacyJournalQuery,
  LegacyJournalResult,
} from "@/features/ledger/workflow/ledger-workflow.types";

interface IAddedPosting {
  account: string;
  cost: string | null;
  flag: string | null;
  meta: {
    filename: string;
    lineno: number;
  };
  price: string | null;
  units: {
    currency: string;
    number: number;
  };
}

interface IAddedEntry {
  // Common fields for all entry types
  type: string; // "Transaction", "Open", "Close", "Balance", "Note", etc.
  date: string;
  meta: {
    filename: string;
    lineno: number;
  };

  // Transaction-specific fields (when type === "Transaction")
  flag?: "*" | "!" | string;
  links?: string[];
  narration?: string;
  payee?: string | null;
  postings?: Array<IAddedPosting>;
  tags?: string[];

  // Open/Close entry fields (when type === "Open" or "Close")
  account?: string;
  booking?: string | null;
  currencies?: string[] | null;

  // Balance entry fields (when type === "Balance")
  amount?: {
    currency: string;
    number: number;
  };

  // Note/Document entry fields
  comment?: string;
  filename?: string;

  // Entry hash for detailed mode
  entry_hash?: string;
  entry_type?: string;

  // Error handling
  error?: string;
  error_message?: string;
}

/** Preserve the legacy response's posting conversion and computed fields. */
export function enhanceLegacyJournal(
  entries: IAddedEntry[],
  args: LegacyJournalQuery,
): LegacyJournalResult {
  // Process the raw data to add enhanced fields
  const enhancedData = entries.map((entry) => {
    // Start with ALL fields from the Fava API
    const enhanced = { ...entry } as Record<string, unknown>;

    // Only transform fields that need it:
    // Ensure links and tags are arrays (Fava omits them when empty)
    enhanced.links = entry.links || [];
    enhanced.tags = entry.tags || [];

    // Transform postings to match GraphQL schema
    if (entry.postings && entry.postings.length > 0) {
      interface SourcePosting {
        account: string;
        cost?: string | null;
        flag?: string | null;
        price?: string | null;
        meta?: { filename: string; lineno: number } | null;
        units?: { currency: string; number: number } | null;
        amount?: string;
      }

      enhanced.postings = entry.postings.map((posting: SourcePosting) => {
        const transformedPosting: IAddedPosting = {
          account: posting.account,
          cost: posting.cost || null,
          flag: posting.flag || null,
          price: posting.price || null,
          // Provide entry's meta as fallback for posting meta
          meta: posting.meta || entry.meta,
          // Default to zero units if not provided (will be populated from amount string if present)
          units: posting.units || { currency: "", number: 0 },
        };

        // Convert amount string to units object if needed
        if (posting.amount && !posting.units) {
          const amountMatch = posting.amount.match(
            /^(-?[\d,.]+)\s*([A-Z]{3})$/,
          );
          if (amountMatch) {
            const [, numberStr, currency] = amountMatch;
            transformedPosting.units = {
              number: parseFloat(numberStr.replace(/,/g, "")),
              currency,
            };
          }
        }

        return transformedPosting;
      });
    }

    // Add computed fields for UI (only if not already present from Fava)

    // Calculate net amount for transactions using transformed postings
    if (!enhanced.netAmount) {
      const postings = enhanced.postings as IAddedPosting[];
      if (postings && postings.length > 0) {
        const totalAmount = postings.reduce(
          (sum: number, posting: IAddedPosting) => {
            return sum + (posting.units?.number || 0);
          },
          0,
        );
        enhanced.netAmount = totalAmount;
      }
    }

    // Set primary account (if not already set)
    if (!enhanced.primaryAccount) {
      // For Open/Close entries, use the account field
      if (entry.account) {
        enhanced.primaryAccount = entry.account;
      }
      // For transactions with postings, use first non-zero posting account
      else if (enhanced.postings) {
        const postings = enhanced.postings as IAddedPosting[];
        const primaryPosting = postings.find(
          (p: IAddedPosting) => p.units?.number !== 0,
        );
        enhanced.primaryAccount =
          primaryPosting?.account || postings[0]?.account;
      }
    }

    // Create searchable text (if not already present)
    if (!enhanced.searchableText) {
      const searchableText = [
        entry.payee || "",
        entry.narration || "",
        entry.account || "", // Include account field for Open/Close entries
        ...(entry.postings?.map((p) => p.account) || []),
      ]
        .join(" ")
        .toLowerCase();
      enhanced.searchableText = searchableText;
    }

    return enhanced;
  });

  // Determine if there are more entries
  // If we requested N entries and got exactly N, there might be more
  // If we got less than requested, we've reached the end
  // Special case: if we got 0 results, definitely no more
  const hasMore =
    args.first && entries.length > 0 ? entries.length === args.first : false;

  return {
    data: enhancedData as Array<Record<string, unknown> & { date: string }>,
    success: true,
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: !!args.after || !!args.before,
      startCursor: enhancedData.length > 0 ? String(enhancedData[0].date) : "",
      endCursor:
        enhancedData.length > 0
          ? String(enhancedData[enhancedData.length - 1].date)
          : "",
      totalCount: 0, // Return 0 instead of undefined
    },
  };
}
