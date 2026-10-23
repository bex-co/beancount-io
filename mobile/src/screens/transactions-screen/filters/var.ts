import { makeVar } from "@apollo/client";
import { renamedLedgerScope } from "@/common/ledger-owner-rename";
import {
  NO_SCOPED_FILTERS,
  ScopedTransactionFilters,
  TransactionFilters,
} from "./types";

/**
 * The transactions tab's active filters, together with the ledger they were
 * applied to.
 *
 * The filter modal (`@/screens/transaction-filters-screen`) edits a draft and
 * writes it here on Apply; the tab subscribes with `useReactiveVar` and folds
 * the result into its query variables. Living outside the tab means the
 * selection survives the tab unmounting, and both screens can reach it without
 * threading route params.
 *
 * The ledger id travels with the filters because an account filter is only
 * meaningful inside the ledger it was picked in: the seven places that write
 * `ledgerVar` do not (and should not have to) clear this var, and the tab can be
 * unmounted while the ledger changes. Readers therefore resolve filters through
 * `selectFiltersForLedger`, which yields `NO_FILTERS` on a mismatch — so no
 * query can ever pair one ledger's id with another ledger's account.
 */
export const transactionFiltersVar =
  makeVar<ScopedTransactionFilters>(NO_SCOPED_FILTERS);

/**
 * Back to no filters, for sign-out: the var lives in memory, keyed by ledger
 * but not by account, so the next sign-in opened Transactions narrowed by the
 * last session's filters (w21/115).
 */
export function resetTransactionFilters(): void {
  transactionFiltersVar(NO_SCOPED_FILTERS);
}

/**
 * How many times filters were set from outside the tab. The search text is
 * the tab's own state, so a journal link replaced the filters and kept the
 * search, and the linked account and month could read "No transactions
 * match" (w21/786); a search typed before the latest count is dropped.
 */
export const transactionSearchResetVar = makeVar(0);

/**
 * Replace the filters with ones chosen outside the filter modal, such as a
 * journal app link's (w21/344), owned by the ledger they were meant for. The
 * search box empties with them.
 */
export function setTransactionFiltersForLedger(
  ledgerId: string,
  filters: TransactionFilters,
): void {
  transactionFiltersVar({ ledgerId, filters });
  transactionSearchResetVar(transactionSearchResetVar() + 1);
}

/**
 * Keep the filters on their ledger when the account's username changes: left
 * on the old id, readers dropped them and the full journal showed with no
 * message (w21/644).
 */
export function renameTransactionFiltersOwner(
  oldOwner: string,
  newOwner: string,
): void {
  transactionFiltersVar(
    renamedLedgerScope(transactionFiltersVar(), oldOwner, newOwner),
  );
}
