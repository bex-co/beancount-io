import { StyleSheet } from "react-native";
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
import { FeedCard } from "@/screens/home-screen/components/feed-card";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTheme } from "@/common/theme";
import {
  DashboardScrollView,
  LedgerDrawerHeader,
  MenuButton,
} from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";

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
  const { currencies, refetch: ledgerMetaRefetch } = useLedgerMeta(userId);

  const currency = currencies.length > 0 ? currencies[0] : "USD";
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
  const isLoading = balanceSheetLoading || refreshing;
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
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader
        title={t("home")}
        right={
          <MenuButton
            testID="home-add-menu-button"
            accessibilityLabel={t("quickAdd")}
            icon={<Ionicons name="add" size={28} color={theme.black} />}
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
      <DashboardScrollView refreshing={refreshing} onRefresh={onRefresh}>
        <AccountChartsCard
          currencySymbol={currencySymbol}
          netWorthSeries={netWorthSeries}
          assetsSeries={assetsSeries}
          liabilitiesSeries={liabilitiesSeries}
          loading={isLoading}
          error={Boolean(balanceSheetError)}
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

        <FeedCard refreshSignal={refreshSignal} />
      </DashboardScrollView>
    </SafeAreaView>
  );
};

export const HomeScreen = () => {
  return (
    <LedgerGuard>
      <HomeScreenImpl />
    </LedgerGuard>
  );
};
