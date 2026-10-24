import {
  isJournalTransaction,
  JournalDirectiveType,
  JournalTransaction,
} from "../../transactions-screen/types";
import { recentTransactionsWindow } from "../../home-screen/selectors/recent-window";
import {
  flowAnchorMonth,
  rangeStartMonth,
  TimeRange,
} from "../../../common/series-util";

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
 * The ledger's `account` filter for the subtree(s) a report lists, as a pattern
 * the journal query understands: an entry is returned when one of its accounts
 * starts with a prefix, which is what `involvesAccount` then checks per posting.
 * Without it the card read the newest 200 transactions of every account, and a
 * busy month hid the salary and said "No transactions yet" (w21/563).
 */
export function accountPrefixFilter(accountPrefix: string | string[]): string {
  const prefixes = Array.isArray(accountPrefix)
    ? accountPrefix
    : [accountPrefix];
  const escaped = prefixes.map((prefix) =>
    prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return `^(?:${escaped.join("|")})`;
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
 * "YTD" is the current calendar year (`currentYear`, from the clock unless
 * given), so a stale ledger lists nothing for it.
 * "ALL" skips the window, entries after `today` included; a null anchor (statement not resolved yet) yields an
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
  currentYear?: number,
  today?: string,
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

  const cutoffKey = rangeStartMonth(timeRange, anchorMonth, currentYear);
  // Bounded above too: the anchor stops at the current month, and an entry
  // dated after it belongs to no range but "ALL" (w21/166).
  return matching
    .filter((entry) => {
      const month = entry.date.slice(0, 7);
      // Not past today either: the charts above leave a pre-entered entry out,
      // so a list that opened on it matched no figure (w21/908).
      return (
        month >= cutoffKey &&
        month <= anchorMonth &&
        (today === undefined || entry.date <= today)
      );
    })
    .slice(0, limit);
}

/**
 * The month the list windows on. The statement's anchor when it has one; else,
 * once the statement is no longer loading (it failed, or holds no series), the
 * newest matching entry's month capped at the current month, so a failed
 * statement shows rows rather than a "No transactions yet" the ledger does not
 * back (w21/266). Null only while the statement is still loading.
 */
export function resolveListAnchor(
  anchorMonth: string | null,
  statementLoading: boolean,
  entries: JournalDirectiveType[],
  accountPrefix: string | string[],
  currentMonth: string,
): string | null {
  if (anchorMonth) {
    return anchorMonth;
  }
  if (statementLoading) {
    return null;
  }
  const newest = selectAccountTransactions(
    entries,
    accountPrefix,
    "ALL",
    null,
    1,
  )[0];
  return newest ? flowAnchorMonth(newest.date.slice(0, 7), currentMonth) : null;
}

/**
 * Whether the account has any transaction at all, whatever the range: the
 * difference between "No transactions yet" and "No transactions in this range"
 * (w21/266).
 */
export function hasAnyAccountTransaction(
  entries: JournalDirectiveType[],
  accountPrefix: string | string[],
): boolean {
  return (
    selectAccountTransactions(entries, accountPrefix, "ALL", null, 1).length > 0
  );
}

/**
 * The journal window the card asks for. A range ends by the current month, so
 * the newest 200 entries must not be later ones: 200 pre-entered entries left
 * every range but ALL empty (w21/669). The window holds still through the month
 * for the offline copy's key, as Home's does (w21/513). ALL has no end.
 */
export function accountTransactionsWindow(
  timeRange: TimeRange,
  today: string,
): string | undefined {
  return timeRange === "ALL" ? undefined : recentTransactionsWindow(today);
}

/**
 * Whether the card should look for any transaction beyond its page. Only a
 * windowed range can miss one (ALL has no end), and only once the page came
 * back with none of the report's accounts in it (w21/696).
 */
export function shouldProbeForAny(
  timeRange: TimeRange,
  loaded: boolean,
  anyInWindow: boolean,
): boolean {
  return loaded && timeRange !== "ALL" && !anyInWindow;
}
