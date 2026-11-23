import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useUrlView } from "@/common/hooks/use-url-view";
import {
  type IntervalDataSeries,
  getIntervalDates,
  resolveMovementTimeFilter,
} from "../lib/overview-utils";
import {
  dataThroughOf,
  dateForOverviewMonth,
  openingMonth,
} from "../lib/overview-month";
import { recentTransactionsVariables } from "../lib/recent-transactions";

/**
 * The last day the ledger's data covers: its newest transaction, capped at
 * today. A month after it is incomplete, whether it is still running or the
 * ledger simply stops part-way through it.
 */
export function useDataThrough({
  ledgerId,
  account,
  filter,
  time,
  today,
}: {
  ledgerId: string;
  account: string;
  filter: string;
  time: string;
  today: string;
}): string {
  const { data } = useQuery(GetLedgerJournalDocument, {
    variables: recentTransactionsVariables({ ledgerId, account, filter, time }),
    fetchPolicy: "cache-first",
  });
  return dataThroughOf(data?.getLedgerJournal?.data, today);
}

/**
 * The month the whole Overview is showing. The page header steps it, the
 * summary describes it, and Money movement, its history and the cash-flow
 * diagram all follow it, so no two modules answer for different periods.
 *
 * It opens on the latest month, except that a ledger which stopped part-way
 * through its last month opens on the last one it finished.
 */
export function useOverviewMonth({
  income,
  expenses,
  preferActiveMonth,
  dataThrough,
  today,
}: {
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  preferActiveMonth: boolean;
  /** The ledger's last day with data. */
  dataThrough: string;
  today: string;
}) {
  const { searchParams } = useLedgerSearchParams();
  const dates = useMemo(
    () => getIntervalDates(income, expenses),
    [expenses, income],
  );
  const months = useMemo(() => dates.map((date) => date.slice(0, 7)), [dates]);
  const hasFilters = Boolean(
    searchParams.account || searchParams.filter || searchParams.time,
  );
  // The route loader reads this month's balances by the same rule.
  const defaultDate = useMemo(
    () =>
      openingMonth({
        income,
        expenses,
        preferActiveMonth,
        hasFilters,
        dataThrough,
        today,
        dates,
      }),
    [
      income,
      expenses,
      preferActiveMonth,
      hasFilters,
      dates,
      dataThrough,
      today,
    ],
  );
  const [selectedMonth, selectMonth] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/",
    months,
    defaultDate.slice(0, 7),
    "month",
    { writeFallback: true },
  );
  const selectedDate =
    dateForOverviewMonth(dates, selectedMonth) ?? defaultDate;
  // The month as a time filter, narrowed to the dashboard's own Time filter.
  const timeFilter = selectedDate
    ? resolveMovementTimeFilter(selectedDate, searchParams.time || undefined)
    : "";

  return {
    dates,
    selectedDate,
    setSelectedDate: (date: string) => selectMonth(date.slice(0, 7)),
    timeFilter,
  };
}
