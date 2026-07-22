import { makeVar } from "@apollo/client";
import { NO_FILTERS, TransactionFilters } from "./types";

/**
 * The transactions tab's active filters.
 *
 * The filter modal (`@/screens/transaction-filters-screen`) edits a draft and
 * writes it here on Apply; the tab subscribes with `useReactiveVar` and folds
 * the result into its query variables. Living outside the tab means the
 * selection survives the tab unmounting, and both screens can reach it without
 * threading route params.
 */
export const transactionFiltersVar = makeVar<TransactionFilters>(NO_FILTERS);
