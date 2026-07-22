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
