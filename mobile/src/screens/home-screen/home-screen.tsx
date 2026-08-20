import { StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useBalanceSheet } from "@/screens/home-screen/hooks/use-balance-sheet";
import {
  selectAssetsSeries,
  selectLiabilitiesSeries,
  selectNetWorthSeries,
} from "@/screens/home-screen/selectors/select-balance-sheet-series";
import { AccountChartsCard } from "@/screens/home-screen/components/account-charts-card";
import { RecentTransactionsCard } from "@/screens/home-screen/components/recent-transactions-card";
import { SpendingCard } from "@/screens/home-screen/components/spending-card";
import { BudgetCard } from "@/screens/home-screen/components/budget-card";
import { FeedCard } from "@/screens/home-screen/components/feed-card";
import { AskAiCard } from "@/screens/home-screen/components/ask-ai-card";
import { config } from "@/config";
import { getCurrencySymbol, getPrimaryCurrency } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import {
  DashboardScrollView,
  LedgerDrawerHeader,
  MenuButton,
  StaleDataBanner,
} from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
  });

export const HomeScreenImpl = (): JSX.Element => {
  const { userId } = useSession();
  const { t } = useTranslations();
  usePageView("home");
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const router = useRouter();
  const ledgerId = useLedgerGuard();
  const {
    currencies,
    refetch: ledgerMetaRefetch,
    data: ledgerMeta,
    error: ledgerMetaError,
  } = useLedgerMeta(userId, ledgerId);

  const currency = getPrimaryCurrency(currencies);
  const currencySymbol = getCurrencySymbol(currency);
  // One balance-sheet query feeds all three curves on the card. Home is the
  // only place net worth is charted; the Accounts tab is account lists only.
  const {
    data: balanceSheet,
    loading: balanceSheetLoading,
    refetch: balanceSheetRefetch,
    error: balanceSheetError,
  } = useBalanceSheet(ledgerId);
  const netWorthSeries = useMemo(
    () => selectNetWorthSeries(currency, balanceSheet),
    [currency, balanceSheet],
  );
  const assetsSeries = useMemo(
    () => selectAssetsSeries(currency, balanceSheet),
    [currency, balanceSheet],
  );
  const liabilitiesSeries = useMemo(
    () => selectLiabilitiesSeries(currency, balanceSheet),
    [currency, balanceSheet],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  // Skeleton only on first load. Folding `refreshing` in here meant every
  // pull-to-refresh tore a perfectly good chart down to a pulsing tile — the
  // inverse of the rule the rest of the app follows, where current content
  // stays visible under the RefreshControl spinner.
  const isLoading = balanceSheetLoading && !balanceSheet;
  // First-load failure (error, no cache) keeps the chart skeleton; cached
  // data with a failed refetch shows the numbers + stale banner instead.
  const chartError = Boolean(balanceSheetError) && !balanceSheet;
  const showStale = isShowingStaleDataFromQueries([
    { data: balanceSheet, error: balanceSheetError },
    { data: ledgerMeta, error: ledgerMetaError },
  ]);
  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshSignal((signal) => signal + 1);
    try {
      await Promise.all([ledgerMetaRefetch(), balanceSheetRefetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("home")}
        right={
          <MenuButton
            testID="home-add-menu-button"
            accessibilityLabel={t("quickAdd")}
            icon={<Ionicons name="add" size={26} color={theme.black} />}
            onOpen={() => analytics.track("tap_quick_add_menu", {})}
            items={[
              {
                label: t("enterNewTransaction"),
                icon: (
                  <MaterialCommunityIcons
                    name="gesture-tap"
                    size={22}
                    color={theme.black80}
                  />
                ),
                onPress: () => {
                  analytics.track("tap_quick_add", {});
                  AddTransactionCallback.setFn(onRefresh);
                  router.navigate({ pathname: "/add-transaction" });
                },
              },
              {
                label: t("scanReceipt"),
                icon: (
                  <Ionicons
                    name="scan-outline"
                    size={22}
                    color={theme.black80}
                  />
                ),
                onPress: () => {
                  analytics.track("tap_scan_receipt", {});
                  AddTransactionCallback.setFn(onRefresh);
                  router.navigate({ pathname: "/receipt-capture" });
                },
              },
            ]}
          />
        }
      />
      {showStale ? <StaleDataBanner /> : null}
      <DashboardScrollView refreshing={refreshing} onRefresh={onRefresh}>
        {config.features.agentChat && <AskAiCard />}
        <AccountChartsCard
          currency={currency}
          netWorthSeries={netWorthSeries}
          assetsSeries={assetsSeries}
          liabilitiesSeries={liabilitiesSeries}
          loading={isLoading}
          error={chartError}
        />

        <RecentTransactionsCard
          ledgerId={ledgerId}
          refreshSignal={refreshSignal}
        />

        <SpendingCard
          ledgerId={ledgerId}
          currency={currency}
          currencySymbol={currencySymbol}
          refreshSignal={refreshSignal}
        />

        <BudgetCard ledgerId={ledgerId} refreshSignal={refreshSignal} />

        <FeedCard refreshSignal={refreshSignal} />
      </DashboardScrollView>
    </View>
  );
};

export const HomeScreen = () => {
  return (
    <LedgerGuard>
      <HomeScreenImpl />
    </LedgerGuard>
  );
};
