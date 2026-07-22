import { useEffect, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
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
import { selectAccountTransactions } from "../selectors/select-account-transactions";

// Pull enough recent transactions to cover the selected range client-side.
// Matches the interim approach in spending-card.tsx (no account-filter query).
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
  /** Beancount account subtree to filter by, e.g. "Expenses" or "Income". */
  accountPrefix: string;
  /** Translation key for the card title. */
  titleKey: string;
  /** Translation key for the empty-state message. */
  emptyKey: string;
  timeRange: TimeRange;
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
  refreshing,
}: AccountTransactionsCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();

  const { data, loading, refetch } = useGetLedgerJournalQuery({
    variables: {
      ledgerId,
      query: {
        offset: 0,
        limit: FETCH_WINDOW,
        directiveTypes: [DirectiveType.TRANSACTION],
      },
    },
    fetchPolicy: "cache-and-network",
  });

  // Keep this card in sync with the report's pull-to-refresh.
  useEffect(() => {
    if (refreshing) {
      refetch();
    }
  }, [refreshing, refetch]);

  const entries = useMemo(
    () =>
      selectAccountTransactions(
        (data?.getLedgerJournal.data ??
          []) as unknown as JournalDirectiveType[],
        accountPrefix,
        timeRange,
      ),
    [data, accountPrefix, timeRange],
  );

  return (
    <DashboardCard title={t(titleKey)} bleed>
      {loading && entries.length === 0 ? (
        <LoadingTile height={160} mx={16} />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>{t(emptyKey)}</Text>
      ) : (
        entries.map((entry, index) => (
          <EntryRow
            key={entry.entry_hash || index}
            entry={entry}
            onPress={
              isJournalTransaction(entry)
                ? () => openTransactionDetail(router, entry, "reports")
                : undefined
            }
          />
        ))
      )}
    </DashboardCard>
  );
}
