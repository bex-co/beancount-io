import { useMemo, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";
import { analytics } from "@/common/analytics";
import { useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { NetworkStatus } from "@apollo/client";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { JournalHeader } from "./journal-header";
import { JournalEntryItem } from "./journal-entry-item";
import { JournalEmptyState } from "./journal-empty-state";
import { JournalNoEntriesForFiltersState } from "./journal-no-entries-for-filters-state";
import { JournalBottomSheet } from "./journal-bottom-sheet";
import { JournalDirectiveType, DirectiveType } from "./types";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    list: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 40,
    },
    errorText: {
      fontSize: 16,
      fontWeight: "500",
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
      fontSize: 14,
      color: theme.black60,
    },
    itemSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black10,
    },
  });

const JournalList = () => {
  const ledgerId = useLedgerGuard();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  usePageView("journal");

  const limit = 20;

  // State for directive type filtering
  const [selectedDirectiveTypes, setSelectedDirectiveTypes] = useState<
    DirectiveType[]
  >([DirectiveType.TRANSACTION]);

  // State for subtype filtering
  const [selectedTransactionSubtypes, setSelectedTransactionSubtypes] =
    useState<string[]>([]);
  const [selectedDocumentSubtypes, setSelectedDocumentSubtypes] = useState<
    string[]
  >([]);
  const [selectedCustomSubtypes, setSelectedCustomSubtypes] = useState<
    string[]
  >([]);

  // Use GetLedgerJournal query with Apollo Client's native infinite scroll support
  const { data, loading, error, refetch, fetchMore, networkStatus } =
    useGetLedgerJournalQuery({
      variables: {
        ledgerId: ledgerId!,
        query: {
          offset: 0,
          limit,
          directiveTypes:
            selectedDirectiveTypes.length > 0
              ? selectedDirectiveTypes
              : undefined,
          transactionSubtypes:
            selectedTransactionSubtypes.length > 0
              ? selectedTransactionSubtypes
              : undefined,
          documentSubtypes:
            selectedDocumentSubtypes.length > 0
              ? selectedDocumentSubtypes
              : undefined,
          customSubtypes:
            selectedCustomSubtypes.length > 0
              ? selectedCustomSubtypes
              : undefined,
        },
      },
      skip: !ledgerId,
      notifyOnNetworkStatusChange: true,
    });

  // Get total count (same as web dashboard)
  const rawTotal = data?.getLedgerJournal.total;
  const total = typeof rawTotal === "number" ? rawTotal : 0;

  // Extract journal entries from Apollo cache (merged by updateQuery)
  const journalEntries = useMemo(
    () =>
      (data?.getLedgerJournal.data || []) as unknown as JournalDirectiveType[],
    [data?.getLedgerJournal.data],
  );
  const isEmpty = data?.getLedgerJournal.is_empty;

  // Check if we have more data to load
  const hasMore = journalEntries.length < total;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  // Load more entries using Apollo's native fetchMore with updateQuery
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading || !ledgerId) {
      return;
    }

    try {
      await fetchMore({
        variables: {
          ledgerId: ledgerId,
          query: {
            offset: journalEntries.length,
            limit,
            directiveTypes:
              selectedDirectiveTypes.length > 0
                ? selectedDirectiveTypes
                : undefined,
            transactionSubtypes:
              selectedTransactionSubtypes.length > 0
                ? selectedTransactionSubtypes
                : undefined,
            documentSubtypes:
              selectedDocumentSubtypes.length > 0
                ? selectedDocumentSubtypes
                : undefined,
            customSubtypes:
              selectedCustomSubtypes.length > 0
                ? selectedCustomSubtypes
                : undefined,
          },
        },
        // Apollo Client's native way to merge paginated data
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getLedgerJournal?.data) {
            return prev;
          }

          const prevData = prev.getLedgerJournal.data || [];
          const newData = fetchMoreResult.getLedgerJournal.data || [];

          return {
            ...prev,
            getLedgerJournal: {
              ...prev.getLedgerJournal,
              data: [...prevData, ...newData],
              total: fetchMoreResult.getLedgerJournal.total,
            },
          };
        },
      });
    } catch (err) {
      console.error("Error loading more entries:", err);
    }
  }, [
    isLoadingMore,
    hasMore,
    loading,
    ledgerId,
    journalEntries.length,
    limit,
    fetchMore,
    selectedDirectiveTypes,
    selectedTransactionSubtypes,
    selectedDocumentSubtypes,
    selectedCustomSubtypes,
  ]);

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      await analytics.track("tap_refresh", {});
      await refetch();
    } catch (error) {
      console.error("Error refreshing journal:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEntryPress = useCallback((entry: JournalDirectiveType) => {
    setSelectedEntry(entry);
    // Use snapToIndex to control which snap point to open to:
    // 0 = "50%", 1 = "75%", 2 = "90%"
    bottomSheetRef.current?.snapToIndex(0); // Change this number to control initial snap point
  }, []);

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        {t("journalLoadError")}
        {error?.message}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  // Determine what to show in the FlatList
  const listData = error
    ? [] // Show error in ListEmptyComponent
    : loading && !journalEntries.length
      ? [] // Show loading in ListEmptyComponent
      : journalEntries;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* Journal entries list */}
      <FlatList
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <JournalHeader
            selectedDirectiveTypes={selectedDirectiveTypes}
            onDirectiveTypesChange={setSelectedDirectiveTypes}
            selectedTransactionSubtypes={selectedTransactionSubtypes}
            onTransactionSubtypesChange={setSelectedTransactionSubtypes}
            selectedDocumentSubtypes={selectedDocumentSubtypes}
            onDocumentSubtypesChange={setSelectedDocumentSubtypes}
            selectedCustomSubtypes={selectedCustomSubtypes}
            onCustomSubtypesChange={setSelectedCustomSubtypes}
          />
        }
        style={styles.list}
        data={listData}
        renderItem={({ item }) => (
          <JournalEntryItem
            entry={item}
            onPress={() => handleEntryPress(item)}
          />
        )}
        keyExtractor={(item, index) =>
          `${item.date}-${item.directive_type}-${index}`
        }
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
          loading && !journalEntries.length
            ? renderLoadingState
            : error
              ? renderErrorState
              : isEmpty
                ? JournalEmptyState
                : JournalNoEntriesForFiltersState
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListFooterComponent={
          isLoadingMore || (loading && journalEntries.length > 0) ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.loadingFooterText}>{t("loadingMore")}</Text>
            </View>
          ) : !hasMore && journalEntries.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingFooterText}>{t("noMoreEntries")}</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      <JournalBottomSheet
        bottomSheetRef={bottomSheetRef}
        entry={selectedEntry}
        ledgerId={ledgerId}
      />
    </SafeAreaView>
  );
};

export const JournalScreen = () => {
  return (
    <LedgerGuard>
      <JournalList />
    </LedgerGuard>
  );
};
