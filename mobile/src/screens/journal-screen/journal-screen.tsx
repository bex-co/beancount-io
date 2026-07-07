import { useMemo, useCallback, useRef, useState } from "react";
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
import BottomSheet from "@gorhom/bottom-sheet";
import { analytics } from "@/common/analytics";
import { useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { NetworkStatus } from "@apollo/client";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { JournalHeader, JournalNavBar } from "./journal-header";
import { JournalEntryItem } from "./journal-entry-item";
import { JournalDateSectionHeader } from "./journal-date-section-header";
import { JournalEmptyState } from "./journal-empty-state";
import { JournalNoEntriesForFiltersState } from "./journal-no-entries-for-filters-state";
import { JournalBottomSheet } from "./journal-bottom-sheet";
import { JournalDirectiveType, DirectiveType } from "./types";
import {
  JournalSection,
  groupToSections,
} from "./utils/journal-display-utils";

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
  });

const JournalList = () => {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  usePageView("journal");

  const limit = 20;

  const [selectedDirectiveTypes, setSelectedDirectiveTypes] = useState<
    DirectiveType[]
  >([DirectiveType.TRANSACTION]);
  const [selectedTransactionSubtypes, setSelectedTransactionSubtypes] =
    useState<string[]>([]);
  const [selectedDocumentSubtypes, setSelectedDocumentSubtypes] = useState<
    string[]
  >([]);
  const [selectedCustomSubtypes, setSelectedCustomSubtypes] = useState<
    string[]
  >([]);

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

  const rawTotal = data?.getLedgerJournal.total;
  const total = typeof rawTotal === "number" ? rawTotal : 0;

  const journalEntries = useMemo(
    () =>
      (data?.getLedgerJournal.data || []) as unknown as JournalDirectiveType[],
    [data?.getLedgerJournal.data],
  );
  const isEmpty = data?.getLedgerJournal.is_empty;

  const hasMore = journalEntries.length < total;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const sections = useMemo(
    () => groupToSections(journalEntries, searchQuery),
    [journalEntries, searchQuery],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || loading || !ledgerId) return;

    try {
      await fetchMore({
        variables: {
          ledgerId,
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
    } catch (err) {
      console.error("Error refreshing journal:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEntryPress = useCallback((entry: JournalDirectiveType) => {
    setSelectedEntry(entry);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleQuickAdd = useCallback(() => {
    analytics.track("tap_quick_add", {});
    AddTransactionCallback.setFn(async () => { await refetch(); });
    router.navigate({ pathname: "/add-transaction" });
  }, [refetch, router]);

  const renderSectionHeader = ({ section }: { section: JournalSection }) => (
    <JournalDateSectionHeader
      displayDate={section.displayDate}
      total={section.total}
    />
  );

  const renderItem = ({ item }: { item: JournalDirectiveType }) => (
    <JournalEntryItem entry={item} onPress={() => handleEntryPress(item)} />
  );

  const isInitialLoading = loading && !journalEntries.length;
  const showEmptyState = !loading && !error && isEmpty && sections.length === 0;
  const showNoFiltersState =
    !loading && !error && !isEmpty && sections.length === 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <JournalNavBar onAdd={handleQuickAdd} />
      <SectionList
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
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        }
        style={styles.list}
        sections={isInitialLoading || error ? [] : sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          `${item.date}-${item.directive_type}-${index}`
        }
        stickySectionHeadersEnabled={false}
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
            ? () => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )
            : error
              ? () => (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      {t("journalLoadError")}
                      {error?.message}
                    </Text>
                  </View>
                )
              : showEmptyState
                ? JournalEmptyState
                : showNoFiltersState
                  ? JournalNoEntriesForFiltersState
                  : undefined
        }
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
