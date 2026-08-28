import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { NetworkStatus } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { getPrimaryCurrency } from "@/common/currency-util";
import { BalanceChartCard } from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useAccountReport } from "@/screens/accounts-screen/hooks/use-account-report";
import {
  ACCOUNT_JOURNAL_PAGE_SIZE,
  useAccountJournal,
} from "@/screens/accounts-screen/hooks/use-account-journal";
import { selectAccountBalanceSeries } from "@/screens/account-detail-screen/selectors/select-account-balance-series";
import {
  AccountJournalItem,
  AccountJournalRow,
  AccountJournalSection,
  accountJournalItemKey,
  hasMoreAccountJournal,
  mergeAccountJournalItems,
  selectAccountJournalRows,
  groupAccountJournalRowsToSections,
} from "@/screens/account-detail-screen/selectors/select-account-journal";
import {
  JournalDirectiveType,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { AccountEntryRow } from "@/screens/account-detail-screen/components/account-entry-row";
import { DateSectionHeader } from "@/screens/transactions-screen/date-section-header";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    sectionTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      marginTop: 4,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    stateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      gap: 8,
    },
    footerText: {
      fontSize: fontSizes.md,
      color: theme.black60,
    },
    chartContainer: {
      paddingHorizontal: 10,
    },
  });

const AccountDetailScreenImpl = ({
  account,
}: {
  account: string;
}): JSX.Element => {
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const { t, locale } = useTranslations();
  const styles = useThemeStyle(getStyles);
  // `.name` is the *resolved* theme — `themeVar` itself can hold "system", so
  // comparing that to "dark" gave every system-theme user the light indicator.
  const { colorTheme: theme, name: themeName } = useTheme();

  const { currencies, refetch: ledgerMetaRefetch } = useLedgerMeta(
    userId,
    ledgerId,
  );
  const currency = getPrimaryCurrency(currencies);

  const {
    data: reportData,
    loading: reportLoading,
    error: reportError,
    refetch: reportRefetch,
  } = useAccountReport(ledgerId, account);

  const {
    data: journalData,
    loading: journalLoading,
    error: journalError,
    refetch: journalRefetch,
    fetchMore,
    networkStatus,
  } = useAccountJournal(ledgerId, account);

  const balanceSeries = useMemo(
    () => selectAccountBalanceSeries(currency, reportData),
    [currency, reportData],
  );

  const items = useMemo(
    () => journalData?.getLedgerAccountJournal.items ?? [],
    [journalData],
  );
  const total = journalData?.getLedgerAccountJournal.total ?? 0;
  const rows = useMemo(
    () => selectAccountJournalRows(currency, items),
    [currency, items],
  );
  const sections = useMemo(
    () => groupAccountJournalRowsToSections(rows, currency, locale),
    [rows, currency, locale],
  );

  // Display rows carry only shaped fields; index the raw items by the same
  // key so a tapped row can hand its full entry to the detail screen.
  const itemsByKey = useMemo(() => {
    const map = new Map<string, AccountJournalItem>();
    for (const item of items) {
      map.set(accountJournalItemKey(item), item);
    }
    return map;
  }, [items]);

  const hasMore = hasMoreAccountJournal(items.length, total);
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;
  const isInitialLoading = journalLoading && items.length === 0;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || journalLoading || !ledgerId) {
      return;
    }
    try {
      await fetchMore({
        variables: {
          ledgerId,
          query: {
            account,
            limit: ACCOUNT_JOURNAL_PAGE_SIZE,
            offset: items.length,
            with_children: true,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getLedgerAccountJournal) {
            return prev;
          }
          return {
            ...prev,
            getLedgerAccountJournal: {
              ...fetchMoreResult.getLedgerAccountJournal,
              items: mergeAccountJournalItems(
                prev.getLedgerAccountJournal.items,
                fetchMoreResult.getLedgerAccountJournal.items,
              ),
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more account entries:", err);
    }
  }, [
    isLoadingMore,
    hasMore,
    journalLoading,
    ledgerId,
    account,
    items.length,
    fetchMore,
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        reportRefetch(),
        journalRefetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: AccountJournalRow }) => {
      const entry = itemsByKey.get(item.key)?.entry as
        JournalDirectiveType | undefined;
      const onPress =
        entry && isJournalTransaction(entry)
          ? () => openTransactionDetail(router, entry, account)
          : undefined;
      return (
        <AccountEntryRow row={item} currency={currency} onPress={onPress} />
      );
    },
    [currency, itemsByKey, router, account],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: AccountJournalSection }) => (
      <DateSectionHeader
        displayDate={section.displayDate}
        total={section.totalChange}
      />
    ),
    [],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.chartContainer}>
          <BalanceChartCard
            label={t("balance")}
            currency={currency}
            series={balanceSeries}
            // Skeleton only on first load: a pull-to-refresh keeps the chart
            // visible under the RefreshControl spinner rather than collapsing
            // it back to a tile.
            loading={reportLoading && !reportData}
            error={Boolean(reportError)}
          />
        </View>
        <Text style={styles.sectionTitle}>{t("transactions")}</Text>
      </>
    ),
    [
      t,
      currency,
      balanceSeries,
      reportLoading,
      reportData,
      reportError,
      styles.sectionTitle,
    ],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen options={{ title: account }} />
      <SectionList
        sections={isInitialLoading || journalError ? [] : sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={listHeader}
        // flexGrow keeps the empty / error state inside the scrollable content so
        // the whole area — not just the chart header — stays pull-to-refreshable.
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        indicatorStyle={themeName === "dark" ? "white" : "default"}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : journalError ? (
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{t("journalLoadError")}</Text>
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{t("noEntries")}</Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.footerText}>{t("loadingMore")}</Text>
            </View>
          ) : !hasMore && rows.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t("noMoreEntries")}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export const AccountDetailScreen = (): JSX.Element => {
  const params = useLocalSearchParams<{ account?: string }>();
  const account = typeof params.account === "string" ? params.account : "";

  return (
    <LedgerGuard>
      <AccountDetailScreenImpl account={account} />
    </LedgerGuard>
  );
};
