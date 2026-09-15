import { useCallback, useEffect, useMemo, useState } from "react";
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
import { BALANCE_CONVERSION } from "@/common/balance-util";
import { balanceNotes } from "@/common/balance-display";
import { formatUnits } from "@/common/number-utils";
import {
  selectAccountBalanceDisplay,
  selectAccountBalanceSeries,
  selectAccountUnitsSeries,
} from "@/screens/account-detail-screen/selectors/select-account-balance-series";
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
import { selectAccountDetailTarget } from "@/screens/account-detail-screen/select-account-detail-target";

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
    backLink: {
      marginTop: 16,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.primary,
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
  // The same report in units says what the account holds, and that decides how
  // every figure on this screen reads: one commodity reads in its units, with
  // its cost; anything else stays money at cost (see `selectBalanceDisplay`).
  const {
    data: unitsReportData,
    loading: unitsReportLoading,
    error: unitsReportError,
    refetch: unitsReportRefetch,
  } = useAccountReport(ledgerId, account, undefined, undefined, "units");
  // First loads only: a refetch keeps showing what is already there.
  const reportPending = reportLoading && !reportData;
  const unitsReportPending = unitsReportLoading && !unitsReportData;
  const display = useMemo(
    () => selectAccountBalanceDisplay(currency, reportData, unitsReportData),
    [currency, reportData, unitsReportData],
  );
  const units = display.kind === "units" ? display.units : null;
  const unitsCurrency = units?.currency;
  const unitsScale = units?.scale;
  const journalConversion = unitsCurrency ? "units" : BALANCE_CONVERSION;

  const {
    data: journalData,
    loading: journalLoading,
    error: journalError,
    refetch: journalRefetch,
    fetchMore,
    networkStatus,
  } = useAccountJournal(
    ledgerId,
    account,
    { conversion: journalConversion },
    // Held until the units report settles — it is what decides the conversion,
    // so a read any earlier could arrive in one about to be replaced.
    unitsReportPending,
  );

  const balanceSeries = useMemo(
    () =>
      unitsCurrency
        ? selectAccountUnitsSeries(unitsCurrency, unitsReportData)
        : selectAccountBalanceSeries(currency, reportData),
    [currency, reportData, unitsCurrency, unitsReportData],
  );
  const formatChartValue = useMemo(
    () =>
      unitsCurrency === undefined
        ? undefined
        : (value: number, includePlus?: boolean) =>
            formatUnits(value, unitsCurrency, unitsScale ?? 0, includePlus),
    [unitsCurrency, unitsScale],
  );
  const chartLabel = [
    t(units ? "balance" : "balanceAtCost"),
    ...balanceNotes(display, currency, t),
  ].join(" · ");

  const [lastJournalPage, setLastJournalPage] = useState<{
    incoming: number;
    added: number;
  } | null>(null);

  useEffect(() => {
    setLastJournalPage(null);
  }, [account, ledgerId, journalConversion]);

  const items = useMemo(
    () => journalData?.getLedgerAccountJournal.items ?? [],
    [journalData],
  );
  const total = journalData?.getLedgerAccountJournal.total ?? 0;
  const rows = useMemo(
    () =>
      selectAccountJournalRows(
        currency,
        items,
        unitsCurrency ? { account, currency: unitsCurrency } : undefined,
      ),
    [currency, items, unitsCurrency, account],
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

  const hasMore = hasMoreAccountJournal(
    items.length,
    total,
    lastJournalPage ?? undefined,
  );
  const isLoadingMore = networkStatus === NetworkStatus.fetchMore;
  const isInitialLoading =
    (journalLoading || unitsReportPending) && items.length === 0;

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
            conversion: journalConversion,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.getLedgerAccountJournal) {
            return prev;
          }
          const incoming = fetchMoreResult.getLedgerAccountJournal.items;
          const merged = mergeAccountJournalItems(
            prev.getLedgerAccountJournal.items,
            incoming,
          );
          setLastJournalPage({
            incoming: incoming.length,
            added: merged.length - prev.getLedgerAccountJournal.items.length,
          });
          return {
            ...prev,
            getLedgerAccountJournal: {
              ...fetchMoreResult.getLedgerAccountJournal,
              items: merged,
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
    journalConversion,
    fetchMore,
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    setLastJournalPage(null);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        reportRefetch(),
        unitsReportRefetch(),
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
            label={chartLabel}
            currency={unitsCurrency ?? currency}
            formatValue={formatChartValue}
            series={balanceSeries}
            // Skeleton only on first load: a pull-to-refresh keeps the chart
            // visible under the RefreshControl spinner rather than collapsing
            // it back to a tile.
            loading={reportPending || unitsReportPending}
            error={Boolean(unitsCurrency ? unitsReportError : reportError)}
          />
        </View>
        <Text style={styles.sectionTitle}>{t("transactions")}</Text>
      </>
    ),
    [
      t,
      chartLabel,
      currency,
      unitsCurrency,
      formatChartValue,
      balanceSeries,
      reportPending,
      unitsReportPending,
      reportError,
      unitsReportError,
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

/**
 * The route entry is unusable: no account, or one belonging to a ledger that is
 * no longer selected. Rendering this instead of querying is what keeps a revived
 * back-stack entry from pairing the old ledger's account with the new ledger's
 * id (see `select-account-detail-target`).
 */
const AccountDetailUnavailable = (): JSX.Element => {
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const router = useRouter();

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen options={{ title: t("accounts") }} />
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>{t("accountDetailUnavailable")}</Text>
        <Text
          style={styles.backLink}
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          {t("back")}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const AccountDetailRoute = ({
  account,
  ledger,
}: {
  account?: string | string[];
  ledger?: string | string[];
}): JSX.Element => {
  const ledgerId = useLedgerGuard();
  const target = selectAccountDetailTarget({
    account,
    ledger,
    selectedLedgerId: ledgerId,
  });

  if (target.status !== "ready") {
    return <AccountDetailUnavailable />;
  }
  return <AccountDetailScreenImpl account={target.account} />;
};

export const AccountDetailScreen = (): JSX.Element => {
  // `ledger` binds the entry to the ledger it was opened for; see
  // `select-account-detail-target` for why the ambient selection is not enough.
  const params = useLocalSearchParams<{ account?: string; ledger?: string }>();

  return (
    <LedgerGuard>
      <AccountDetailRoute account={params.account} ledger={params.ledger} />
    </LedgerGuard>
  );
};
