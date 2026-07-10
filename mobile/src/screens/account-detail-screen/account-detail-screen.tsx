import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { NetworkStatus, useReactiveVar } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { themeVar } from "@/common/vars";
import { getCurrencySymbol } from "@/common/currency-util";
import { leafName } from "@/common/account-util";
import { TimeRange } from "@/common/series-util";
import { BalanceChartCard } from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
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
} from "@/screens/journal-screen/types";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { AccountEntryRow } from "@/screens/account-detail-screen/components/account-entry-row";
import { JournalDateSectionHeader } from "@/screens/journal-screen/journal-date-section-header";

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
  });

const AccountDetailScreenImpl = ({
  account,
}: {
  account: string;
}): JSX.Element => {
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const currentTheme = useReactiveVar(themeVar);
  usePageView("account_detail", { account });

  const { currencies, refetch: ledgerMetaRefetch } = useLedgerMeta(userId);
  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);

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
    () => groupAccountJournalRowsToSections(rows, currencySymbol),
    [rows, currencySymbol],
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

  const onBalanceRangeChange = useCallback((range: TimeRange) => {
    analytics.track("account_detail_range", { range });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AccountJournalRow }) => {
      const entry = itemsByKey.get(item.key)?.entry as
        JournalDirectiveType | undefined;
      const onPress =
        entry && isJournalTransaction(entry)
          ? () =>
              openTransactionDetail(router, entry, "account_detail", account)
          : undefined;
      return (
        <AccountEntryRow
          row={item}
          currencySymbol={currencySymbol}
          onPress={onPress}
        />
      );
    },
    [currencySymbol, itemsByKey, router, account],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: AccountJournalSection }) => (
      <JournalDateSectionHeader
        displayDate={section.displayDate}
        total={section.totalChange}
      />
    ),
    [],
  );

  const listHeader = useMemo(
    () => (
      <>
        <BalanceChartCard
          label={t("balance")}
          currencySymbol={currencySymbol}
          series={balanceSeries}
          loading={reportLoading || refreshing}
          error={Boolean(reportError)}
          onRangeChange={onBalanceRangeChange}
        />
        <Text style={styles.sectionTitle}>{t("transactions")}</Text>
      </>
    ),
    [
      t,
      currencySymbol,
      balanceSeries,
      reportLoading,
      refreshing,
      reportError,
      onBalanceRangeChange,
      styles.sectionTitle,
    ],
  );

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen options={{ title: leafName(account) }} />
      <SectionList
        sections={isInitialLoading || journalError ? [] : sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        indicatorStyle={currentTheme === "dark" ? "white" : "default"}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme === "dark" ? "white" : "black"}
          />
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
