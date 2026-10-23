import { useEffect, useMemo } from "react";
import { journalRowKeys } from "@/screens/transactions-screen/utils/merge-journal-page";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToday } from "@/common/hooks/use-today";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { DashboardCard } from "@/components";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { EntryRow } from "@/screens/transactions-screen/entry-row";
import {
  DirectiveType,
  JournalDirectiveType,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { TimeRange } from "@/common/series-util";
import {
  accountTransactionsWindow,
  hasAnyAccountTransaction,
  resolveListAnchor,
  shouldProbeForAny,
  accountPrefixFilter,
  selectAccountTransactions,
} from "../selectors/select-account-transactions";
import { CardLoadFailure } from "@/components/card-load-failure";
import { selectCardLoadState } from "@/common/apollo/card-load-state";
import { useGuest } from "@/common/guest/guest-context";

// Pull enough recent transactions of the report's accounts to cover the selected
// range client-side.
const FETCH_WINDOW = 200;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    empty: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type AccountTransactionsCardProps = {
  ledgerId: string;
  /**
   * Beancount account subtree(s) to filter by — a single prefix ("Expenses") or
   * several (`["Income", "Expenses"]`) for a combined money-in/out list.
   */
  accountPrefix: string | string[];
  /** Translation key for the card title. */
  titleKey: string;
  /** Translation key for the empty-state message. */
  emptyKey: string;
  timeRange: TimeRange;
  /**
   * The report's anchor month ("YYYY-MM") — the latest month its statement has
   * data for — or null while that is unresolved. The time-range window is
   * measured back from here so this list and the chart above it always cover the
   * same months.
   */
  anchorMonth: string | null;
  /** The statement the anchor comes from is still on its first load. */
  statementLoading: boolean;
  refreshing: boolean;
};

/**
 * Transactions involving a given account subtree (Expenses, Income, …), shown
 * under a report chart. Fetches a window of journal entries and filters
 * client-side (see select-account-transactions.ts), within the active time
 * range. Rows reuse `EntryRow` and open the transaction detail on tap.
 */
export function AccountTransactionsCard({
  ledgerId,
  accountPrefix,
  titleKey,
  emptyKey,
  timeRange,
  anchorMonth,
  statementLoading,
  refreshing,
}: AccountTransactionsCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  // The day each row's date is judged against, kept current past midnight.
  const today = useToday();
  const router = useRouter();
  const guest = useGuest();

  const { data, loading, error, refetch } = useGetLedgerJournalQuery({
    variables: {
      ledgerId,
      query: {
        offset: 0,
        limit: FETCH_WINDOW,
        directiveTypes: [DirectiveType.TRANSACTION],
        // Only this report's accounts count against the window (w21/563).
        account: accountPrefixFilter(accountPrefix),
        // Not later than the range can reach (w21/669).
        time: accountTransactionsWindow(timeRange, today),
      },
    },
    fetchPolicy: "cache-and-network",
  });

  // Keep this card in sync with the report's pull-to-refresh.
  useEffect(() => {
    if (refreshing) {
      void refetch().catch(() => undefined);
    }
  }, [refreshing, refetch]);

  const journal = useMemo(
    () =>
      (data?.getLedgerJournal.data ?? []) as unknown as JournalDirectiveType[],
    [data],
  );
  const currentMonth = today.slice(0, 7);
  const listAnchor = resolveListAnchor(
    anchorMonth,
    statementLoading,
    journal,
    accountPrefix,
    currentMonth,
  );
  const entries = useMemo(
    () =>
      selectAccountTransactions(journal, accountPrefix, timeRange, listAnchor),
    [journal, accountPrefix, timeRange, listAnchor],
  );
  // Twin entries share a hash: their keys carry the ordinal (w21/419, w21/524).
  const rowKeys = useMemo(() => journalRowKeys(entries), [entries]);
  // Rows exist, just not in this range: say so instead of "No transactions yet".
  // The page ends at the month, so a ledger whose only transactions are later
  // ones needs one unbounded look for a single row (w21/696).
  const anyInWindow = hasAnyAccountTransaction(journal, accountPrefix);
  const probeAny = shouldProbeForAny(
    timeRange,
    data !== undefined,
    anyInWindow,
  );
  const { data: anyData } = useGetLedgerJournalQuery({
    variables: {
      ledgerId,
      query: {
        offset: 0,
        limit: 1,
        directiveTypes: [DirectiveType.TRANSACTION],
        account: accountPrefixFilter(accountPrefix),
      },
    },
    skip: !probeAny,
    fetchPolicy: "cache-and-network",
  });
  const hasAny =
    anyInWindow || (anyData?.getLedgerJournal.data?.length ?? 0) > 0;
  const emptyText = hasAny ? t("recentTransactionsEmptyRange") : t(emptyKey);

  return (
    <DashboardCard title={t(titleKey)} bleed testID="account-transactions-card">
      {selectCardLoadState({
        loading: loading,
        hasData: data !== undefined,
        error: error,
      }) === "failed" ? (
        <CardLoadFailure
          onRetry={() => void refetch().catch(() => undefined)}
        />
      ) : (loading || statementLoading) && entries.length === 0 ? (
        <LoadingTile height={160} mx={16} />
      ) : (
        <FadeInView>
          {entries.length === 0 ? (
            <Text style={styles.empty}>{emptyText}</Text>
          ) : (
            entries.map((entry, index) => (
              <EntryRow
                key={rowKeys.get(entry) ?? index}
                entry={entry}
                dateToday={today}
                onPress={
                  isJournalTransaction(entry)
                    ? () =>
                        openTransactionDetail(
                          router,
                          entry,
                          ledgerId,
                          undefined,
                          guest,
                        )
                    : undefined
                }
              />
            ))
          )}
        </FadeInView>
      )}
    </DashboardCard>
  );
}
