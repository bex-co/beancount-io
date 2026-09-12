import {
  isJournalTransaction,
  JournalDirectiveType,
  JournalTransaction,
} from "../../transactions-screen/types";
import { rangeStartMonth, TimeRange } from "../../../common/series-util";

/** Max number of account transactions to surface in a report list. */
const ACCOUNT_TRANSACTIONS_LIMIT = 10;

/**
 * Predicate + type guard: a transaction with at least one posting under the
 * given account subtree (e.g. "Expenses", "Income"). Beancount account types
 * live at the top of the name — `Expenses:Groceries`, `Income:Salary` — the
 * same convention as select-spending-compare.ts.
 */
function involvesAccount(
  entry: JournalDirectiveType,
  accountPrefix: string | string[],
): entry is JournalTransaction {
  if (!isJournalTransaction(entry)) {
    return false;
  }
  const prefixes = Array.isArray(accountPrefix)
    ? accountPrefix
    : [accountPrefix];
  return (entry.postings ?? []).some((posting) =>
    prefixes.some((prefix) => posting.account.startsWith(prefix)),
  );
}

/**
 * Transactions for a report: those with at least one posting under
 * `accountPrefix` (a single subtree, or any of several when an array is passed —
 * e.g. `["Income", "Expenses"]` for a combined money-in/out list), within the
 * active time range, newest first, capped at `limit`.
 *
 * The window is anchored to `anchorMonth` ("YYYY-MM") — the report's latest
 * statement month, the same "latest data point" the bar charts anchor to — so a
 * stale ledger still surfaces history instead of an empty list. Anchoring to the
 * latest *matching* entry instead would put the list on a different month than
 * the chart whenever the newest statement month's only activity is a transfer.
 * "ALL" skips the window; a null anchor (statement not resolved yet) yields an
 * empty list rather than a list windowed on the wrong month.
 *
 * NOTE (backend gap): there is no account-filtered transaction query, so this
 * filters a fetched window of journal entries client-side — the same interim
 * approach as select-spending-compare.ts.
 */
export function selectAccountTransactions(
  entries: JournalDirectiveType[],
  accountPrefix: string | string[],
  timeRange: TimeRange,
  anchorMonth: string | null,
  limit: number = ACCOUNT_TRANSACTIONS_LIMIT,
): JournalTransaction[] {
  const matching = entries
    .filter((entry) => involvesAccount(entry, accountPrefix))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  if (timeRange === "ALL") {
    return matching.slice(0, limit);
  }
  if (matching.length === 0 || !anchorMonth) {
    return [];
  }

  const cutoffKey = rangeStartMonth(timeRange, anchorMonth);
  return matching
    .filter((entry) => entry.date.slice(0, 7) >= cutoffKey)
    .slice(0, limit);
}
