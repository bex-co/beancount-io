import { useApolloClient } from "@apollo/client";
import {
  LEDGER_ERROR_QUERIES,
  refetchNamedQueries,
} from "@/common/apollo/refresh-named-queries";
import { useGuest } from "@/common/guest/guest-context";
import { parseFormatDate } from "@/common/format-util";
import { useToday } from "@/common/hooks/use-today";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useMemo, useCallback, useRef, useState } from "react";
import { LoadMoreFailed } from "@/components/load-more-failed";
import { useRouter, useScrollToTop } from "expo-router";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useThemeStyle, useDebouncedValue } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { NetworkStatus, useReactiveVar } from "@apollo/client";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { LedgerDrawerHeader, StaleDataBanner } from "@/components";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { TransactionsHeader } from "./transactions-header";
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
import { toWordsSearchFilter } from "./utils/plain-search-filter";
import { searchForLedger, type ScopedSearch } from "./filters/scoped-search";
import {
  journalListKey,
  journalRowKeys,
  mergeJournalPage,
} from "./utils/merge-journal-page";
import {
  countActiveFilters,
  selectFiltersForLedger,
  toFilterQuery,
} from "./filters/select-filter-query";
import {
  transactionFiltersVar,
  transactionSearchResetVar,
} from "./filters/var";

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
    // Fills the frame when there are no sections (empty / no-results / error), so
    // the whole area stays inside the scrollable content and pull-to-refresh works
    // even with nothing to show.
    listContent: {
      flexGrow: 1,
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
      color: theme.black80,
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
      color: theme.black80,
    },
  });

const TransactionList = () => {
  const listRef =
    useRef<SectionList<JournalDirectiveType, JournalSection>>(null);
  useScrollToTop(listRef);

  const ledgerId = useLedgerGuard();
  const { canWrite } = useLedgerAccess();
  const router = useRouter();
  const guest = useGuest();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  // Kept with its ledger, so a switch starts with an empty box (w21/114), and
  // with the latest journal link's filters, which empty it too (w21/786).
  const searchReset = useReactiveVar(transactionSearchResetVar);
  const [scopedSearch, setScopedSearch] = useState<ScopedSearch>({
    ledgerId,
    text: "",
    reset: searchReset,
  });
  const searchQuery = searchForLedger(scopedSearch, ledgerId, searchReset);
  const setSearchQuery = (text: string) =>
    setScopedSearch({ ledgerId, text, reset: searchReset });

  // Search runs server-side through `query.filter`, so it reaches transactions
  // past the first page — but only once typing settles. Quote + escape so
  // ordinary merchant punctuation is a STRING literal, not advanced-filter syntax.
  // The debounced copy carries its ledger too, so the last term typed on the
  // previous ledger is never sent for this one while it settles.
  const search = searchForLedger(
    useDebouncedValue(scopedSearch, 300),
    ledgerId,
    searchReset,
  ).trim();
  const filter = useMemo(() => toWordsSearchFilter(search), [search]);

  // Status / date range / account, picked in the filter modal. Like the search
  // they narrow the query itself, so paging stays consistent with the filter.
  // Resolved against the selected ledger: an account filter picked in another
  // ledger is dropped rather than queried here, where it would match nothing
  // and read as an empty journal.
  const scopedFilters = useReactiveVar(
    guest?.transactionFilters ?? transactionFiltersVar,
  );
  const filters = useMemo(
    () => selectFiltersForLedger(scopedFilters, ledgerId),
    [scopedFilters, ledgerId],
  );
  // Relative ranges (1M, 3M, YTD) end today, which moves at midnight and on
  // a return to the app; captured once, they hid newer entries (w21/078).
  const today = useToday();
  const activeFilterCount = countActiveFilters(filters, parseFormatDate(today));
  const filterQuery = useMemo(
    () => toFilterQuery(filters, parseFormatDate(today)),
    [filters, today],
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

  const sections = useMemo(
    () => groupToSections(transactions, "", locale),
    [transactions, locale],
  );
  const rowKeys = useMemo(() => journalRowKeys(transactions), [transactions]);

  // The list the query shows now, read when a page lands (w21/116).
  const listKeyRef = useRef("");
  const listKey = journalListKey(ledgerId, { filter, ...filterQuery });
  listKeyRef.current = listKey;

  // The list whose next page failed to load, so a different list starts clean.
  // While set, scrolling to the end does not ask again; Retry does (w21/353).
  const [loadMoreFailedFor, setLoadMoreFailedFor] = useState<string | null>(
    null,
  );
  const loadMoreFailed = loadMoreFailedFor === listKey;

  const loadMore = useCallback(
    async (retry = false) => {
      if (isLoadingMore || !hasMore || loading || !ledgerId) return;
      if (loadMoreFailed && !retry) return;
      const requestedFor = listKeyRef.current;
      setLoadMoreFailedFor(null);

      // An entry added elsewhere shifted the pages; reload from the top, where
      // it now sits (w21/035).
      let listMoved = false;
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
            // Requested for a list no longer shown (w21/116).
            if (listKeyRef.current !== requestedFor) return prev;
            if (!fetchMoreResult?.getLedgerJournal?.data) return prev;
            const { data, overlapped } = mergeJournalPage(
              prev.getLedgerJournal.data || [],
              fetchMoreResult.getLedgerJournal.data,
              {
                loaded: prev.getLedgerJournal.total,
                page: fetchMoreResult.getLedgerJournal.total,
              },
            );
            listMoved = overlapped;
            return {
              ...prev,
              getLedgerJournal: {
                ...prev.getLedgerJournal,
                data,
                total: fetchMoreResult.getLedgerJournal.total,
              },
            };
          },
        });
        if (listMoved) void refetch().catch(() => undefined);
      } catch (err) {
        console.error("Error loading more transactions:", err);
        setLoadMoreFailedFor(requestedFor);
      }
    },
    [
      isLoadingMore,
      hasMore,
      loading,
      loadMoreFailed,
      ledgerId,
      transactions.length,
      fetchMore,
      refetch,
      filter,
      filterQuery,
    ],
  );

  const client = useApolloClient();
  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      // The bell's errors follow the pull without holding up the list (w21/839).
      void refetchNamedQueries(client, LEDGER_ERROR_QUERIES);
      await refetch();
      // The list is back at its first page: the next page failed on the old one
      // and is asked for again by scrolling (w21/465).
      setLoadMoreFailedFor(null);
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
      openTransactionDetail(router, entry, ledgerId, undefined, guest);
    },
    [router, ledgerId, guest],
  );

  const handleOpenFilters = useCallback(() => {
    router.push({
      pathname: guest
        ? "/examples/transaction-filters"
        : "/(app)/transaction-filters",
    });
  }, [router, guest]);

  const handleQuickAdd = useCallback(() => {
    AddTransactionCallback.setFn(async () => {
      await refetch();
    });
    router.navigate({ pathname: "/add-transaction" });
  }, [refetch, router]);

  const renderSectionHeader = ({ section }: { section: JournalSection }) => (
    <DateSectionHeader displayDate={section.displayDate} />
  );

  const renderItem = ({ item }: { item: JournalDirectiveType }) => (
    <EntryRow
      entry={item}
      onPress={() => handleEntryPress(item)}
      upcomingAfter={today}
    />
  );

  const isInitialLoading = loading && !transactions.length;
  // A failed refresh keeps the rows already loaded, under the stale banner;
  // only a failure with nothing to list replaces them (w21/081).
  const loadFailed = Boolean(error) && transactions.length === 0;
  const showStale = isShowingStaleDataFromQueries([{ data, error }]);
  const isBlank = !loading && !loadFailed && sections.length === 0;
  const isNarrowed = !!search || activeFilterCount > 0;
  // A ledger with no transactions gets the welcome copy even when it holds
  // other directives — this tab only ever shows transactions.
  const showEmptyState = isBlank && !isNarrowed;
  const showNoResults = isBlank && isNarrowed;

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("transactions")}
        action={
          canWrite && {
            accessibilityLabel: t("quickAdd"),
            onPress: handleQuickAdd,
            icon: <Ionicons name="add" size={26} color={theme.black90} />,
          }
        }
      />
      {showStale ? <StaleDataBanner /> : null}
      <SectionList
        ref={listRef}
        ListHeaderComponent={
          <TransactionsHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenFilters={handleOpenFilters}
            activeFilterCount={activeFilterCount}
          />
        }
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical
        sections={isInitialLoading ? [] : sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        // Unique per row: identical twins share a hash (w21/419).
        keyExtractor={(item) => rowKeys.get(item) ?? item.entry_hash}
        stickySectionHeadersEnabled={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <ThemedRefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        ListEmptyComponent={
          isInitialLoading ? (
            TransactionsListSkeleton
          ) : loadFailed ? (
            () => (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {t("transactionsLoadError")}
                </Text>
              </View>
            )
          ) : showEmptyState ? (
            <TransactionsEmptyState
              onAddTransaction={canWrite ? handleQuickAdd : undefined}
            />
          ) : showNoResults ? (
            NoResultsState
          ) : undefined
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingFooterText}>{t("loadingMore")}</Text>
            </View>
          ) : loadMoreFailed && hasMore ? (
            <LoadMoreFailed onRetry={() => void loadMore(true)} />
          ) : !hasMore && transactions.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingFooterText}>{t("noMoreEntries")}</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export const TransactionsScreen = () => {
  return (
    <LedgerGuard>
      <TransactionList />
    </LedgerGuard>
  );
};
