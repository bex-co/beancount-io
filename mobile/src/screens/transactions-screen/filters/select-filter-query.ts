import { getFormatDate } from "../../../common/format-util";
import { getAccountRoot, type RootNames } from "../../../common/account-root";
import {
  NO_FILTERS,
  ScopedTransactionFilters,
  TRANSACTION_STATUSES,
  TransactionFilters,
} from "./types";

/**
 * The filters that apply to `ledgerId`, or `NO_FILTERS` when the stored
 * selection belongs to a different ledger (or to none).
 *
 * Every reader of `transactionFiltersVar` goes through here, so switching
 * ledgers cannot carry an account restriction into the new ledger's journal —
 * whether the transactions tab was mounted at the time or not. Navigating
 * within the same ledger keeps the selection, which is the whole point of
 * storing it outside the tab.
 */
export const selectFiltersForLedger = (
  scoped: ScopedTransactionFilters,
  ledgerId: string | null | undefined,
): TransactionFilters =>
  ledgerId && scoped.ledgerId === ledgerId ? scoped.filters : NO_FILTERS;

/**
 * The last day a custom window may reach. The server computes the day after the
 * end, so an end of 9999-12-31 overflows to year 10000, fails to parse and
 * takes the whole journal with it (w21/307).
 */
export const MAX_FILTER_DAY = "9999-12-30";

/** An inclusive `YYYY-MM-DD` window. */
export type DateRange = { start: string; end: string };

/** The `JournalQueryInput` fields the filter modal controls. */
export type FilterQuery = {
  transactionSubtypes?: string[];
  time?: string;
  account?: string;
};

/**
 * The first day of the calendar month `months - 1` months before `today`'s, as
 * Reports, Home and Spending count a "1M" or "3M" range: whole calendar months
 * through today. A pill label names one window on every screen (w21/646).
 */
export const calendarMonthsStart = (today: Date, months: number): Date =>
  new Date(today.getFullYear(), today.getMonth() - (months - 1), 1, 12);

/**
 * Whether the filter's custom window is serializable.
 *
 * A reversed pair (`2026-10-10 - 2026-09-10`) is rejected by the backend's date
 * parser, which replaces the whole journal with an error, so the filter sheet
 * gates Apply on this. Dates are compared as `YYYY-MM-DD` strings, where
 * lexical order is calendar order, and the comparison is inclusive so a
 * single-day window stays valid. A half-filled range is not *invalid* — it
 * simply filters nothing (see `resolveDateRange`) — and every non-custom range
 * is computed here, so those all pass.
 */
export const isDateRangeValid = (filters: TransactionFilters): boolean => {
  if (filters.range !== "custom" || !filters.startDate || !filters.endDate) {
    return true;
  }
  return filters.startDate <= filters.endDate;
};

/**
 * The window a filter asks for, resolved against `today`.
 *
 * @param filters - Current filter state
 * @param today - The day to anchor relative ranges to
 * @returns The window, or null when the range is unbounded or incomplete
 */
export const resolveDateRange = (
  filters: TransactionFilters,
  today: Date,
): DateRange | null => {
  const end = getFormatDate(today);

  switch (filters.range) {
    case "1M":
      return { start: getFormatDate(calendarMonthsStart(today, 1)), end };
    case "3M":
      return { start: getFormatDate(calendarMonthsStart(today, 3)), end };
    case "YTD":
      return { start: `${today.getFullYear()}-01-01`, end };
    case "custom":
      // A half-filled custom range filters nothing — both ends are required.
      // A reversed one is never serialized: the backend cannot parse it, and
      // silently swapping the ends would query a window the user never asked
      // for. The sheet blocks Apply, so this is the backstop.
      return filters.startDate && filters.endDate && isDateRangeValid(filters)
        ? {
            start:
              filters.startDate <= MAX_FILTER_DAY
                ? filters.startDate
                : MAX_FILTER_DAY,
            end:
              filters.endDate <= MAX_FILTER_DAY
                ? filters.endDate
                : MAX_FILTER_DAY,
          }
        : null;
    case "all":
    default:
      return null;
  }
};

/**
 * Renders a window into the backend's `time` expression.
 *
 * The ledger API is Fava-derived (it shares `filter` / `time` / `conversion`),
 * so the range is written the way Fava spells one: `2026-01-01 - 2026-07-22`.
 * Every caller goes through here, so a different server dialect is a one-line
 * change.
 */
export const formatTimeFilter = (range: DateRange): string =>
  `${range.start} - ${range.end}`;

/**
 * Whether the status chips filter anything. Cleared, Pending and Other together
 * match every transaction, so selecting all three is the same as none: no dot,
 * no subtype sent, and an empty ledger keeps its welcome instead of "No
 * transactions match your search or filters" (w21/306).
 */
const statusFilterActive = (filters: TransactionFilters): boolean =>
  filters.statuses.length > 0 &&
  !TRANSACTION_STATUSES.every((status) => filters.statuses.includes(status));

/** Characters that make an account filter a pattern rather than a name. */
const REGEX_SYNTAX = /[.*+?^${}()|[\]\\]/;

/**
 * Translates filter state into query fields, omitting whatever is inactive so
 * the variables stay identical to an unfiltered query when nothing is set.
 */
export const toFilterQuery = (
  filters: TransactionFilters,
  today: Date,
  roots: RootNames = {},
): FilterQuery => {
  const query: FilterQuery = {};

  if (statusFilterActive(filters)) {
    query.transactionSubtypes = [...filters.statuses];
  }

  const range = resolveDateRange(filters, today);
  if (range) {
    query.time = formatTimeFilter(range);
  }

  if (filters.account) {
    // A path from a root is a whole account and its children, not a run of
    // components found anywhere: `Expenses:Travel` also matched
    // `Assets:Reimbursable:Expenses:Travel`. A bare component, as a link
    // carries it, stays the looser match (w21/113, w21/959). A value with regex
    // syntax is the server's own Fava regex, as a dashboard link writes it
    // (`^Expenses:(Food|Rent)`, `Expenses:Food.*`), and passes through as it
    // is, the same split the server makes (w21/983).
    query.account =
      filters.account.includes(":") &&
      !REGEX_SYNTAX.test(filters.account) &&
      getAccountRoot(filters.account, roots) !== null
        ? `^${filters.account}(:|$)`
        : filters.account;
  }

  return query;
};

/**
 * How many filter groups are active — drives the dot on the filter button. A
 * custom range missing one of its ends counts for nothing, matching what the
 * query actually does.
 */
export const countActiveFilters = (
  filters: TransactionFilters,
  today: Date,
): number => {
  let count = 0;
  if (statusFilterActive(filters)) count += 1;
  if (resolveDateRange(filters, today)) count += 1;
  if (filters.account) count += 1;
  return count;
};
