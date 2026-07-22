import {
  isJournalTransaction,
  JournalDirectiveType,
  JournalTransaction,
} from "../../transactions-screen/types";
import { rangeStartMonth, TimeRange } from "../../../common/series-util";

/** Max number of account transactions to surface in a report list. */
export const ACCOUNT_TRANSACTIONS_LIMIT = 10;

/**
 * Predicate + type guard: a transaction with at least one posting under the
 * given account subtree (e.g. "Expenses", "Income"). Beancount account types
 * live at the top of the name — `Expenses:Groceries`, `Income:Salary` — the
 * same convention as select-spending-compare.ts.
 */
function involvesAccount(
  entry: JournalDirectiveType,
  accountPrefix: string,
): entry is JournalTransaction {
  if (!isJournalTransaction(entry)) {
    return false;
  }
  return (entry.postings ?? []).some((posting) =>
    posting.account.startsWith(accountPrefix),
  );
}

/**
 * Transactions for a report: those with at least one posting under
 * `accountPrefix`, within the active time range, newest first, capped at `limit`.
 *
 * The window is anchored to the latest matching transaction's month — the same
 * "latest data point" anchoring the report bar charts use — so a stale ledger
 * still surfaces history instead of an empty list. "ALL" skips the window.
 *
 * NOTE (backend gap): there is no account-filtered transaction query, so this
 * filters a fetched window of journal entries client-side — the same interim
 * approach as select-spending-compare.ts.
 */
export function selectAccountTransactions(
  entries: JournalDirectiveType[],
  accountPrefix: string,
  timeRange: TimeRange,
  limit: number = ACCOUNT_TRANSACTIONS_LIMIT,
): JournalTransaction[] {
  const matching = entries
    .filter((entry) => involvesAccount(entry, accountPrefix))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  if (matching.length === 0 || timeRange === "ALL") {
    return matching.slice(0, limit);
  }

  const cutoffKey = rangeStartMonth(timeRange, matching[0].date.slice(0, 7));
  return matching
    .filter((entry) => entry.date.slice(0, 7) >= cutoffKey)
    .slice(0, limit);
}
