import { makeVar } from "@apollo/client";
import { NO_SCOPED_FILTERS, ScopedTransactionFilters } from "./types";

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
