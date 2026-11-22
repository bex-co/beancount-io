import { BadUserInputError } from "@/shared/errors";

/**
 * The most transactions one category-suggestion call accepts. Every row
 * becomes part of a single model prompt, so the cap bounds that prompt; a
 * larger import is sent as several calls.
 */
export const MAX_SUGGEST_TRANSACTIONS = 500;

/** Refuse an over-cap batch before any work, naming the cap and the fix. */
export function assertSuggestBatchSize(transactions: readonly unknown[]): void {
  if (transactions.length > MAX_SUGGEST_TRANSACTIONS) {
    throw new BadUserInputError(
      `transactions holds ${transactions.length} transactions; at most ${MAX_SUGGEST_TRANSACTIONS} may be categorized per call. Split them into several calls.`,
      "transactions",
    );
  }
}
