import { useMemo, useCallback, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  SectionList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analytics } from "@/common/analytics";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useThemeStyle, usePageView, useDebouncedValue } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { NetworkStatus, useReactiveVar } from "@apollo/client";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { TransactionsHeader, TransactionsNavBar } from "./transactions-header";
import { EntryRow } from "./entry-row";
import { DateSectionHeader } from "./date-section-header";
import { TransactionsEmptyState } from "./transactions-empty-state";
import { NoResultsState } from "./no-results-state";
import { TransactionsListSkeleton } from "./transactions-list-skeleton";
import {
  DirectiveType,
  JournalDirectiveType,
  isJournalTransaction,
} from "./types";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import {
  JournalSection,
  groupToSections,
} from "./utils/transaction-display-utils";
import {
  countActiveFilters,
  toFilterQuery,
} from "./filters/select-filter-query";
import { transactionFiltersVar } from "./filters/var";

const PAGE_SIZE = 20;
/** Only transactions live on this tab; Open/Close/Balance/… stay in the journal. */
const DIRECTIVE_TYPES = [DirectiveType.TRANSACTION];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    list: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 40,
    },
    errorText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black60,
      textAlign: "center",
      lineHeight: 24,
    },
    loadingFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      gap: 8,
    },
    loadingFooterText: {
      fontSize: fontSizes.md,
      color: theme.black60,
    },
  });

const TransactionList = () => {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  usePageView("transactions");

  // Search runs server-side through `query.filter`, so it reaches transactions
  // past the first page — but only once typing settles.
  const search = useDebouncedValue(searchQuery.trim(), 300);
  const filter = search || undefined;

  // Status / date range / account, picked in the filter modal. Like the search
  // they narrow the query itself, so paging stays consistent with the filter.
  const filters = useReactiveVar(transactionFiltersVar);
  const activeFilterCount = countActiveFilters(filters, new Date());
  const filterQuery = useMemo(
    () => toFilterQuery(filters, new Date()),
    [filters],
  );

  const { data, loading, error, refetch, fetchMore, networkStatus } =
    useGetLedgerJournalQuery({
      variables: {
        ledgerId: ledgerId!,
        query: {
          offset: 0,
          limit: PAGE_SIZE,
          directiveTypes: DIRECTIVE_TYPES,
          filter,
          ...filterQuery,
        },
      },
      skip: !ledgerId,
      notifyOnNetworkStatusChange: true,
    });

  const rawTotal = data?.getLedgerJournal.total;
  const total = typeof rawTotal === "number" ? rawTotal : 0;

  const transactions = useMemo(
    () =>
      (data?.getLedgerJournal.data || []) as unknown as JournalDirectiveType[],
    [data?.getLedgerJournal.data],
  );
  const hasMore = transactions.length < total;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const sections = useMemo(() => groupToSections(transactions), [transactions]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading || !ledgerId) return;

    try {
      await fetchMore({
        variables: {
          ledgerId,
          query: {
            offset: transactions.length,
            limit: PAGE_SIZE,
            directiveTypes: DIRECTIVE_TYPES,
            filter,
            ...filterQuery,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getLedgerJournal?.data) return prev;
          return {
            ...prev,
            getLedgerJournal: {
              ...prev.getLedgerJournal,
              data: [
                ...(prev.getLedgerJournal.data || []),
                ...fetchMoreResult.getLedgerJournal.data,
              ],
              total: fetchMoreResult.getLedgerJournal.total,
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more transactions:", err);
    }
  }, [
    isLoadingMore,
    hasMore,
    loading,
    ledgerId,
    transactions.length,
    fetchMore,
    filter,
    filterQuery,
  ]);

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      await analytics.track("tap_refresh", {});
      await refetch();
    } catch (err) {
      console.error("Error refreshing transactions:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEntryPress = useCallback(
    (entry: JournalDirectiveType) => {
      // The query is pinned to transactions, so this guard only ever rejects a
      // surprise from the server — there is no detail screen for other kinds.
      if (!isJournalTransaction(entry)) return;
      openTransactionDetail(router, entry, "transactions");
    },
    [router],
  );

  const handleOpenFilters = useCallback(() => {
    analytics.track("tap_transaction_filters", {});
    router.push({ pathname: "/(app)/transaction-filters" });
  }, [router]);

  const handleQuickAdd = useCallback(() => {
    analytics.track("tap_quick_add", {});
    AddTransactionCallback.setFn(async () => {
      await refetch();
    });
    router.navigate({ pathname: "/add-transaction" });
  }, [refetch, router]);

  const renderSectionHeader = ({ section }: { section: JournalSection }) => (
    <DateSectionHeader displayDate={section.displayDate} />
  );

  const renderItem = ({ item }: { item: JournalDirectiveType }) => (
    <EntryRow entry={item} onPress={() => handleEntryPress(item)} />
  );

  const isInitialLoading = loading && !transactions.length;
  const isBlank = !loading && !error && sections.length === 0;
  const isNarrowed = !!search || activeFilterCount > 0;
  // A ledger with no transactions gets the welcome copy even when it holds
  // other directives — this tab only ever shows transactions.
  const showEmptyState = isBlank && !isNarrowed;
  const showNoResults = isBlank && isNarrowed;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <TransactionsNavBar onAdd={handleQuickAdd} />
      <SectionList
        ListHeaderComponent={
          <TransactionsHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenFilters={handleOpenFilters}
            activeFilterCount={activeFilterCount}
          />
        }
        style={styles.list}
        sections={isInitialLoading || error ? [] : sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.entry_hash}-${index}`}
        stickySectionHeadersEnabled={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        ListEmptyComponent={
          isInitialLoading
            ? TransactionsListSkeleton
            : error
              ? () => (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {t("transactionsLoadError")}
                      {error?.message}
                    </Text>
                  </View>
                )
              : showEmptyState
                ? TransactionsEmptyState
                : showNoResults
                  ? NoResultsState
                  : undefined
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingFooterText}>{t("loadingMore")}</Text>
            </View>
          ) : !hasMore && transactions.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingFooterText}>{t("noMoreEntries")}</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export const TransactionsScreen = () => {
  return (
    <LedgerGuard>
      <TransactionList />
    </LedgerGuard>
  );
};
