/**
 * The transactions tab's filter state, as picked in the filter modal.
 *
 * Every field maps onto `JournalQueryInput`, so filtering happens server-side
 * and survives pagination — see `./select-filter-query`.
 */

/** Transaction flag buckets, as the API names them (`transactionSubtypes`). */
export type TransactionStatus = "cleared" | "pending" | "other";

export const TRANSACTION_STATUSES: TransactionStatus[] = [
  "cleared",
  "pending",
  "other",
];

/** Date window. Everything but `custom` is derived from today at query time. */
export type DateRangeKey = "all" | "1M" | "3M" | "YTD" | "custom";

export const DATE_RANGE_KEYS: DateRangeKey[] = [
  "all",
  "1M",
  "3M",
  "YTD",
  "custom",
];

/** Translation keys for each range's pill label. */
export const DATE_RANGE_LABEL_KEYS: Record<DateRangeKey, string> = {
  all: "rangeAll",
  "1M": "range1M",
  "3M": "range3M",
  YTD: "rangeYTD",
  custom: "rangeCustom",
};

export type TransactionFilters = {
  statuses: TransactionStatus[];
  range: DateRangeKey;
  /** ISO `YYYY-MM-DD`; only meaningful when `range` is `"custom"`. */
  startDate?: string;
  endDate?: string;
  account?: string;
};

/** The unfiltered state — what a fresh install and Reset both mean. */
export const NO_FILTERS: TransactionFilters = { statuses: [], range: "all" };

/**
 * Filters plus the ledger they belong to.
 *
 * `account` names a ledger's own account, so a filter applied in one ledger must
 * never reach another's journal query. Pairing the filters with their owner lets
 * every reader decide that at read time — see `selectFiltersForLedger` — which
 * also covers a ledger switch that happens while the transactions tab is
 * unmounted.
 */
export type ScopedTransactionFilters = {
  /** The ledger the filters were applied to; `null` when nothing is applied. */
  ledgerId: string | null;
  filters: TransactionFilters;
};

/** No filters, owned by no ledger — the initial and Reset state. */
export const NO_SCOPED_FILTERS: ScopedTransactionFilters = {
  ledgerId: null,
  filters: NO_FILTERS,
};
