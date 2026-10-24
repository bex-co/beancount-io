import { merchantDateRangeText } from "./selectors/merchant-date-range";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLedgerRootNames } from "@/common/hooks/use-ledger-root-names";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { NetworkStatus, useReactiveVar } from "@apollo/client";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToday } from "@/common/hooks/use-today";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { ColorTheme } from "@/types/theme-props";
import {
  useGetLedgerJournalQuery,
  useQueryShellQuery,
} from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { RouteLedgerUnavailable } from "@/components/route-ledger-unavailable";
import { bindRouteLedger } from "@/common/route-ledger";
import { isolateLtr } from "@/common/bidi";
import {
  aggregatePayees,
  PAYEE_ROLLUP_BQL,
} from "@/screens/merchants-screen/selectors/aggregate-payees";
import { merchantSpellings } from "@/screens/merchant-detail-screen/selectors/merchant-spellings";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { AmountText } from "@/components/amount-text";
import { StaleDataBanner } from "@/components/stale-data-banner";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";
import { HERO_AMOUNT_FIT } from "@/components/amount-text/hero-amount-fit";
import {
  merchantRecurringOverridesVar,
  overrideFor,
  toggleRecurringOverride,
} from "@/common/vars/merchant-recurring-overrides";
import { cadenceLabelKey } from "@/screens/merchants-screen/selectors/merchant-sections";
import {
  endedBeforeSeriesWindow,
  resolveRecurringVerdict,
} from "@/screens/merchants-screen/selectors/resolve-recurring";
import { usePayeeRecurrence } from "@/screens/merchants-screen/use-payee-recurrence";
import { EntryRow } from "@/screens/transactions-screen/entry-row";
import {
  journalListKey,
  journalRowKeys,
  mergeJournalPage,
} from "@/screens/transactions-screen/utils/merge-journal-page";
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
  parseSpellings,
  exactPayeeFilter,
} from "./selectors/filter-exact-payee";
import {
  buildMerchantDailyMetaBql,
  buildMerchantDailyTotalsBql,
  buildMerchantDailyWeightsBql,
  composeMerchantStats,
  mapMerchantDailyMeta,
  mapMerchantDailyTotals,
  pricedTotals,
  splitMerchantMeta,
  splitMerchantTotals,
} from "./selectors/merchant-stats";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { formatMerchantTotals } from "./selectors/format-merchant-total";
import { MerchantDetailSkeleton } from "./merchant-detail-skeleton";
import { merchantKey } from "@/common/merchant-key";
import { useRouteParams } from "@/common/hooks/use-route-params";

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
      color: theme.black80,
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
    },
    dateRange: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: theme.black80,
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
      color: theme.black80,
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
      color: theme.black80,
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
      color: theme.black80,
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
      color: theme.black80,
    },
  });

function MerchantDetailBody({
  payee,
  spellings,
}: {
  payee: string;
  /** Every spelling the Merchants row merged, the displayed one first. */
  spellings: readonly string[];
}) {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();
  const today = useToday();
  const overrides = useReactiveVar(merchantRecurringOverridesVar);
  const { detections, enoughHistory } = usePayeeRecurrence(ledgerId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pagesFetchedRef = useRef(1);

  // One read per figure, by day and free of today's date, split at today here:
  // what was paid apart from what is pre-entered after it (w21/796). A date in
  // the statement changed its cache key daily, so a merchant opened offline the
  // next day showed its load error over cached rows (w21/918).
  const metaBql = useMemo(
    () => buildMerchantDailyMetaBql(spellings),
    [spellings],
  );
  const { expenses, income } = useLedgerRootNames();
  const totalsBql = useMemo(
    () => buildMerchantDailyTotalsBql(spellings, { expenses, income }),
    [spellings, expenses, income],
  );
  const weightsBql = useMemo(
    () => buildMerchantDailyWeightsBql(spellings, { expenses, income }),
    [spellings, expenses, income],
  );
  const { data: weightsData, refetch: refetchWeights } = useQueryShellQuery({
    variables: { ledgerId: ledgerId!, query: weightsBql },
    skip: !ledgerId,
  });

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

  // Quoted-and-escaped STRING literal: a bare needle makes the advanced-filter
  // lexer reject an apostrophe ("Lowe's") or a period ("Ethereum 2.0"), which
  // failed the journal while the BQL-driven header still loaded.
  // Only this merchant's rows are paged: a free-text match on the payee also
  // took longer names and narrations, and the 500-entry cap then cut the
  // merchant's own rows off (w21/181).
  const journalFilter = useMemo(() => exactPayeeFilter(spellings), [spellings]);

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

  const metaTable = metaData?.queryShell?.table;
  const totalsTable = totalsData?.queryShell?.table;
  const weightsTable = weightsData?.queryShell?.table;
  const stats = useMemo(() => {
    const meta = splitMerchantMeta(
      mapMerchantDailyMeta(metaTable ?? null),
      today,
    );
    const totals = splitMerchantTotals(
      mapMerchantDailyTotals(totalsTable ?? null),
      today,
    );
    return composeMerchantStats(meta.paid, totals.paid, {
      meta: meta.scheduled,
      totals: totals.scheduled,
    });
  }, [metaTable, totalsTable, today]);

  // Totals in currencies that share a symbol read by code, the ledger's own
  // keeping it (w21/535).
  const { primaryCurrency } = useLedgerReadContext(ledgerId!);
  const paidTotals = stats?.totalsByCurrency ?? [];
  const scheduledTotals = stats?.scheduledTotalsByCurrency ?? [];
  // What the rows add up to, when legs were priced into another currency.
  const priced = pricedTotals(
    paidTotals,
    splitMerchantTotals(mapMerchantDailyTotals(weightsTable ?? null), today)
      .paid,
  );
  // A symbol is told apart across all three lines, not within each (w21/897).
  const lineCurrencies = [...paidTotals, ...scheduledTotals, ...priced].map(
    (row) => row.currency,
  );
  const totalLines = formatMerchantTotals(
    paidTotals,
    primaryCurrency,
    lineCurrencies,
  );
  const scheduledLines = formatMerchantTotals(
    scheduledTotals,
    primaryCurrency,
    lineCurrencies,
  );
  const pricedLines = formatMerchantTotals(
    priced,
    primaryCurrency,
    lineCurrencies,
  );

  const rawEntries = useMemo(
    () =>
      (journalData?.getLedgerJournal.data ||
        []) as unknown as JournalDirectiveType[],
    [journalData?.getLedgerJournal.data],
  );

  const rowKeys = useMemo(() => journalRowKeys(rawEntries), [rawEntries]);

  const transactions = useMemo(
    () => filterExactPayee(rawEntries.filter(isJournalTransaction), spellings),
    [rawEntries, spellings],
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

  const detection = detections.get(merchantKey(payee)) ?? null;
  const resolved = useMemo(
    () =>
      resolveRecurringVerdict(
        detection,
        overrideFor(overrides, ledgerId!, payee),
        enoughHistory.has(merchantKey(payee)),
        endedBeforeSeriesWindow(stats?.lastDate, today),
      ),
    [detection, overrides, ledgerId, payee, enoughHistory, stats, today],
  );

  // The list the query shows now, read when a page lands (w21/116).
  const listKeyRef = useRef("");
  listKeyRef.current = journalListKey(ledgerId ?? "", {
    filter: journalFilter || undefined,
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || journalLoading || !ledgerId) {
      return;
    }
    const requestedFor = listKeyRef.current;
    // An entry added elsewhere shifted the pages; reload from the top, where
    // it now sits (w21/035).
    let listMoved = false;
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
          // Requested for a list no longer shown (w21/116).
          if (listKeyRef.current !== requestedFor) return prev;
          if (!fetchMoreResult?.getLedgerJournal?.data) {
            return prev;
          }
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
      pagesFetchedRef.current += 1;
      if (listMoved) void refetchJournal().catch(() => undefined);
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
    refetchJournal,
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
      await Promise.all([
        refetchMeta(),
        refetchTotals(),
        refetchWeights(),
        refetchJournal(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMeta, refetchTotals, refetchWeights, refetchJournal]);

  const onRetry = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const handleEntryPress = useCallback(
    (entry: JournalDirectiveType) => {
      if (!isJournalTransaction(entry)) {
        return;
      }
      openTransactionDetail(router, entry, ledgerId);
    },
    [router, ledgerId],
  );

  const onToggleRecurring = () => {
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
  // A refresh that failed over rows already loaded keeps them, under the stale
  // banner; only a failed first load has nothing to list (w21/081, w21/575).
  const listError = journalData ? undefined : journalError;

  const cadenceKey = cadenceLabelKey(resolved.cadence);
  // Label the setting, not the flip action — Switch already announces on/off.
  const toggleTitle = t("merchantsRecurringToggle");

  const listHeader = (
    <View style={styles.header} testID="merchant-stats-header">
      <View style={styles.logoRow}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <AccountTypeIcon postings={[]} payee={payee} />
        </View>
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

      {stats?.totalsByCurrency.map((row, index) => (
        // A total must never ellipsize — "51,230.00…" loses its currency at
        // accessibility text sizes. AmountText caps the scale like every other
        // amount, and the hero fit shrinks a still-too-wide figure instead.
        <AmountText
          key={row.currency}
          style={styles.totalLine}
          {...HERO_AMOUNT_FIT}
        >
          {totalLines[index]}
        </AmountText>
      ))}

      {scheduledLines.map((line) => (
        <AmountText key={`scheduled-${line}`} style={styles.dateRange}>
          {t("merchantScheduledTotal", { amount: isolateLtr(line) })}
        </AmountText>
      ))}

      {pricedLines.map((line) => (
        <AmountText key={line} style={styles.dateRange}>
          {t("merchantTotalAtRates", { amount: isolateLtr(line) })}
        </AmountText>
      ))}

      {stats?.firstDate && stats?.lastDate ? (
        <Text style={styles.dateRange}>
          {merchantDateRangeText(
            stats.firstDate,
            stats.lastDate,
            today,
            locale,
            t,
          )}
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
          // The title and helper live in a sibling View, which carries no
          // accessibility relationship to the control — without these the
          // switch announces as an unnamed toggle. Switch already reports its
          // own checked state, so the label is the visible title only.
          accessibilityLabel={toggleTitle}
          accessibilityHint={t("merchantsRecurringToggleHelper")}
          value={resolved.isRecurring}
          onValueChange={onToggleRecurring}
          trackColor={{ false: theme.black20, true: theme.primary }}
          thumbColor={theme.white}
        />
      </View>
    </View>
  );

  // A failed header query used to drop the header silently whenever the rows
  // loaded, hiding the count, the totals and the Recurring toggle (w21/032).
  // A whole translated sentence, never transport text (w21/118).
  const statsError = (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{t("merchantDetailLoadError")}</Text>
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

  const listEmpty = () => {
    if (isInitialLoading) {
      return <MerchantDetailSkeleton />;
    }
    // The header already says why the stats failed (`statsError`).
    if (fatalError) return null;
    if (listError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t("merchantDetailLoadError")}</Text>
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
      {isShowingStaleDataFromQueries([
        { data: journalData, error: journalError },
      ]) ? (
        <StaleDataBanner />
      ) : null}
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={listError ? [] : sections}
        keyExtractor={(item, index) =>
          // Unique per row: identical twins share a hash (w21/419).
          isJournalTransaction(item)
            ? (rowKeys.get(item) ?? item.entry_hash)
            : `row:${index}`
        }
        renderItem={({ item }) => (
          // A payment pre-entered for later reads Upcoming, as on
          // Transactions; without it it looked booked (w21/795).
          <EntryRow
            entry={item}
            onPress={() => handleEntryPress(item)}
            upcomingAfter={today}
          />
        )}
        renderSectionHeader={({ section }: { section: JournalSection }) => (
          <DateSectionHeader displayDate={section.displayDate} />
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={fatalError ? statsError : listHeader}
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

function MerchantDetailRoute({
  payee,
  otherSpellings,
  ledger,
}: {
  payee: string;
  otherSpellings: readonly string[];
  ledger?: string;
}) {
  const { t } = useTranslations();
  const selectedLedgerId = useLedgerGuard();
  const binding = bindRouteLedger(ledger, selectedLedgerId);
  const opened = useMemo(
    () => [payee, ...otherSpellings],
    [payee, otherSpellings],
  );
  // The Merchants list's own rollup, refreshed after a write: an edit that
  // recased the payee moves the spellings the detail reads by (w21/724).
  const { data: rollup } = useQueryShellQuery({
    variables: { ledgerId: selectedLedgerId, query: PAYEE_ROLLUP_BQL },
    skip: !selectedLedgerId || binding.status === "mismatch",
  });
  const spellings = useMemo(
    () =>
      merchantSpellings(
        opened,
        aggregatePayees(rollup?.queryShell?.table ?? null),
      ),
    [opened, rollup?.queryShell?.table],
  );

  if (binding.status === "mismatch") {
    // A revived merchant from another ledger: its stats and journal would be
    // the new ledger's (usually empty) results under this payee's name, and
    // its recurring toggle would write the new ledger's override.
    return (
      <RouteLedgerUnavailable
        title={payee}
        message={t("merchantDetailUnavailable")}
      />
    );
  }
  return <MerchantDetailBody payee={payee} spellings={spellings} />;
}

export function MerchantDetailScreen() {
  // `ledger` binds the entry to the ledger it was opened for; see
  // `common/route-ledger` for why the ambient selection is not enough.
  const params = useRouteParams<{
    payee?: string;
    otherSpellings?: string;
    ledger?: string;
  }>();
  const raw = params.payee;
  const payee = Array.isArray(raw) ? raw[0] : raw;
  const otherSpellings = useMemo(
    () => parseSpellings(params.otherSpellings),
    [params.otherSpellings],
  );
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
      <MerchantDetailRoute
        payee={payee}
        otherSpellings={otherSpellings}
        ledger={params.ledger}
      />
    </LedgerGuard>
  );
}
