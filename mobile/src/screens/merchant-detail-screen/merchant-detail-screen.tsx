import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { NetworkStatus, useReactiveVar } from "@apollo/client";
import { analytics } from "@/common/analytics";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatLedgerDateShort } from "@/common/date-format";
import { formatMoneyWithCurrency } from "@/common/number-utils";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { ColorTheme } from "@/types/theme-props";
import {
  useGetLedgerJournalQuery,
  useQueryShellQuery,
} from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { AccountTypeIcon } from "@/components/account-type-icon";
import {
  merchantRecurringOverridesVar,
  overrideFor,
  toggleRecurringOverride,
} from "@/common/vars/merchant-recurring-overrides";
import { cadenceLabelKey } from "@/screens/merchants-screen/selectors/merchant-sections";
import { resolveRecurringVerdict } from "@/screens/merchants-screen/selectors/resolve-recurring";
import { usePayeeRecurrence } from "@/screens/merchants-screen/use-payee-recurrence";
import { EntryRow } from "@/screens/transactions-screen/entry-row";
import { DateSectionHeader } from "@/screens/transactions-screen/date-section-header";
import {
  DirectiveType,
  JournalDirectiveType,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import {
  JournalSection,
  groupToSections,
} from "@/screens/transactions-screen/utils/transaction-display-utils";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import {
  filterExactPayee,
  journalSearchFilter,
} from "./selectors/filter-exact-payee";
import {
  buildMerchantCurrencyTotalsBql,
  buildMerchantMetaBql,
  composeMerchantStats,
  mapMerchantCurrencyTotals,
  mapMerchantMeta,
} from "./selectors/merchant-stats";
import { MerchantDetailSkeleton } from "./merchant-detail-skeleton";

const PAGE_SIZE = 20;
/** Free-text filter inflates pages; stop after this many raw fetches. */
const MAX_PAGES = 25;
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
    listContent: {
      flexGrow: 1,
    },
    header: {
      paddingHorizontal: gutter,
      paddingTop: space.lg,
      paddingBottom: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
      gap: space.sm,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    headerText: {
      flex: 1,
    },
    payeeName: {
      fontSize: fontSizes.xxl,
      lineHeight: 28,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: LEADING_TEXT_ALIGN,
    },
    count: {
      marginTop: 2,
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      textAlign: LEADING_TEXT_ALIGN,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.sm,
    },
    chip: {
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.black10,
    },
    chipText: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black90,
    },
    totalLine: {
      fontSize: fontSizes.lg,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      fontVariant: ["tabular-nums"],
      textAlign: LEADING_TEXT_ALIGN,
    },
    dateRange: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      fontVariant: ["tabular-nums"],
      textAlign: LEADING_TEXT_ALIGN,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.md,
      paddingVertical: space.sm,
      marginTop: space.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black20,
    },
    toggleCopy: {
      flex: 1,
      gap: 4,
    },
    toggleTitle: {
      fontSize: fontSizes.lg,
      lineHeight: 22,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: LEADING_TEXT_ALIGN,
    },
    toggleHelper: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black60,
      textAlign: LEADING_TEXT_ALIGN,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.regular,
      color: theme.black60,
      textAlign: "center",
      lineHeight: 24,
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 40,
      gap: space.md,
    },
    errorText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black60,
      textAlign: "center",
      lineHeight: 24,
    },
    retryButton: {
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.controlFill,
    },
    retryText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black90,
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

function MerchantDetailBody({ payee }: { payee: string }) {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();
  const overrides = useReactiveVar(merchantRecurringOverridesVar);
  const { detections } = usePayeeRecurrence(ledgerId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pagesFetchedRef = useRef(1);

  usePageView("merchant_detail");

  const metaBql = useMemo(() => buildMerchantMetaBql(payee), [payee]);
  const totalsBql = useMemo(
    () => buildMerchantCurrencyTotalsBql(payee),
    [payee],
  );

  const {
    data: metaData,
    loading: metaLoading,
    error: metaError,
    refetch: refetchMeta,
  } = useQueryShellQuery({
    variables: { ledgerId: ledgerId!, query: metaBql },
    skip: !ledgerId,
  });

  const {
    data: totalsData,
    loading: totalsLoading,
    error: totalsError,
    refetch: refetchTotals,
  } = useQueryShellQuery({
    variables: { ledgerId: ledgerId!, query: totalsBql },
    skip: !ledgerId,
  });

  const journalFilter = useMemo(() => journalSearchFilter(payee), [payee]);

  const {
    data: journalData,
    loading: journalLoading,
    error: journalError,
    refetch: refetchJournal,
    fetchMore,
    networkStatus,
  } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: PAGE_SIZE,
        directiveTypes: DIRECTIVE_TYPES,
        filter: journalFilter || undefined,
      },
    },
    skip: !ledgerId,
    notifyOnNetworkStatusChange: true,
  });

  const stats = useMemo(
    () =>
      composeMerchantStats(
        mapMerchantMeta(metaData?.queryShell?.table ?? null),
        mapMerchantCurrencyTotals(totalsData?.queryShell?.table ?? null),
      ),
    [metaData?.queryShell?.table, totalsData?.queryShell?.table],
  );

  const rawEntries = useMemo(
    () =>
      (journalData?.getLedgerJournal.data ||
        []) as unknown as JournalDirectiveType[],
    [journalData?.getLedgerJournal.data],
  );

  const transactions = useMemo(
    () => filterExactPayee(rawEntries.filter(isJournalTransaction), payee),
    [rawEntries, payee],
  );

  const rawTotal = journalData?.getLedgerJournal.total;
  const total = typeof rawTotal === "number" ? rawTotal : 0;
  const hasMore =
    rawEntries.length < total && pagesFetchedRef.current < MAX_PAGES;
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;

  const sections = useMemo(
    () => groupToSections(transactions, "", locale),
    [transactions, locale],
  );

  const detection = detections.get(payee) ?? null;
  const resolved = useMemo(
    () =>
      resolveRecurringVerdict(
        detection,
        overrideFor(overrides, ledgerId!, payee),
      ),
    [detection, overrides, ledgerId, payee],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || journalLoading || !ledgerId) {
      return;
    }
    try {
      await fetchMore({
        variables: {
          ledgerId,
          query: {
            offset: rawEntries.length,
            limit: PAGE_SIZE,
            directiveTypes: DIRECTIVE_TYPES,
            filter: journalFilter || undefined,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getLedgerJournal?.data) {
            return prev;
          }
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
      pagesFetchedRef.current += 1;
    } catch (err) {
      console.error("Error loading more merchant transactions:", err);
    }
  }, [
    isLoadingMore,
    hasMore,
    journalLoading,
    ledgerId,
    rawEntries.length,
    fetchMore,
    journalFilter,
  ]);

  // Free-text pages are noisy; keep filling until we have a screenful of
  // exact matches or the window is exhausted.
  useEffect(() => {
    if (
      !journalLoading &&
      !isLoadingMore &&
      hasMore &&
      transactions.length < PAGE_SIZE
    ) {
      void loadMore();
    }
  }, [journalLoading, isLoadingMore, hasMore, transactions.length, loadMore]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    pagesFetchedRef.current = 1;
    try {
      await Promise.all([refetchMeta(), refetchTotals(), refetchJournal()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMeta, refetchTotals, refetchJournal]);

  const onRetry = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const handleEntryPress = useCallback(
    (entry: JournalDirectiveType) => {
      if (!isJournalTransaction(entry)) {
        return;
      }
      openTransactionDetail(router, entry, "merchants");
    },
    [router],
  );

  const onToggleRecurring = () => {
    analytics.track("merchant_toggle_recurring", {
      on: !resolved.isRecurring,
    });
    toggleRecurringOverride(
      ledgerId!,
      payee,
      resolved.isRecurring,
      detection !== null,
    );
  };

  const statsLoading = (metaLoading || totalsLoading) && !stats;
  const journalInitialLoading = journalLoading && !journalData && !journalError;
  const isInitialLoading = statsLoading || journalInitialLoading;
  // Stats and journal are independent; a journal failure must not hide stats.
  const fatalError = !stats && (metaError || totalsError);
  const listError = journalError;

  const cadenceKey = cadenceLabelKey(resolved.cadence);
  const toggleTitle = resolved.isRecurring
    ? t("merchantsMarkNotRecurring")
    : t("merchantsMarkRecurring");

  const listHeader = (
    <View style={styles.header} testID="merchant-stats-header">
      <View style={styles.logoRow}>
        <AccountTypeIcon postings={[]} payee={payee} />
        <View style={styles.headerText}>
          <Text style={styles.payeeName} numberOfLines={2}>
            {payee}
          </Text>
          {stats ? (
            <Text style={styles.count}>
              {t("merchantsTransactionCount", {
                count: stats.transactionCount,
              })}
            </Text>
          ) : null}
        </View>
      </View>

      {resolved.isRecurring && cadenceKey ? (
        <View style={styles.chipRow}>
          <View style={styles.chip} testID="merchant-cadence-chip">
            <Text style={styles.chipText}>{t(cadenceKey)}</Text>
          </View>
        </View>
      ) : null}

      {stats?.totalsByCurrency.map((row) => (
        <Text key={row.currency} style={styles.totalLine} numberOfLines={1}>
          {formatMoneyWithCurrency(row.total, row.currency)}
        </Text>
      ))}

      {stats?.firstDate && stats?.lastDate ? (
        <Text style={styles.dateRange}>
          {t("merchantDetailDateRange", {
            first: formatLedgerDateShort(stats.firstDate, locale),
            last: formatLedgerDateShort(stats.lastDate, locale),
          })}
        </Text>
      ) : null}

      <View style={styles.toggleRow}>
        <View style={styles.toggleCopy}>
          <Text style={styles.toggleTitle}>{toggleTitle}</Text>
          <Text style={styles.toggleHelper}>
            {t("merchantsRecurringToggleHelper")}
          </Text>
        </View>
        <Switch
          testID="merchant-recurring-toggle"
          value={resolved.isRecurring}
          onValueChange={onToggleRecurring}
          trackColor={{ false: theme.black20, true: theme.primary }}
          thumbColor={theme.white}
        />
      </View>
    </View>
  );

  const listEmpty = () => {
    if (isInitialLoading) {
      return <MerchantDetailSkeleton />;
    }
    if (fatalError) {
      const message =
        (metaError ?? totalsError)?.message ?? t("merchantDetailLoadError");
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t("merchantDetailLoadError")}
            {message}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t("merchantDetailRetry")}
          >
            <Text style={styles.retryText}>{t("merchantDetailRetry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (listError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t("merchantDetailLoadError")}
            {listError.message}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t("merchantDetailRetry")}
          >
            <Text style={styles.retryText}>{t("merchantDetailRetry")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t("merchantDetailEmptyTitle")}</Text>
        <Text style={styles.emptyMessage}>
          {t("merchantDetailEmptyMessage")}
        </Text>
      </View>
    );
  };

  if (isInitialLoading) {
    return <MerchantDetailSkeleton />;
  }

  return (
    <View style={styles.container} testID="merchant-detail">
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={listError ? [] : sections}
        keyExtractor={(item, index) =>
          `${isJournalTransaction(item) ? item.entry_hash : "row"}:${index}`
        }
        renderItem={({ item }) => (
          <EntryRow entry={item} onPress={() => handleEntryPress(item)} />
        )}
        renderSectionHeader={({ section }: { section: JournalSection }) => (
          <DateSectionHeader displayDate={section.displayDate} />
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={fatalError ? null : listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={theme.black60} />
              <Text style={styles.loadingFooterText}>
                {t("merchantDetailLoadingMore")}
              </Text>
            </View>
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <ThemedRefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export function MerchantDetailScreen() {
  const params = useLocalSearchParams<{ payee?: string | string[] }>();
  const raw = params.payee;
  const payee = Array.isArray(raw) ? raw[0] : raw;
  const theme = useTheme().colorTheme;

  if (!payee) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View style={{ flex: 1, backgroundColor: theme.white }} />
      </>
    );
  }

  return (
    <LedgerGuard>
      <Stack.Screen
        options={{
          title: payee,
          contentStyle: { backgroundColor: theme.white },
        }}
      />
      <MerchantDetailBody payee={payee} />
    </LedgerGuard>
  );
}
