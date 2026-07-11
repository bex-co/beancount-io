import { StyleSheet } from "react-native";
import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useHomeCharts } from "@/screens/home-screen/hooks/use-home-charts";
import { useAccountHierarchy } from "@/screens/home-screen/hooks/use-account-hierarchy";
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
import {
  DashboardScrollView,
  LedgerDrawerHeader,
  SplitButton,
} from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // The quick-add button isn't a card, so give it the same 16px gap the
    // cards get from their own marginBottom, keeping the vertical rhythm even.
    splitButton: {
      marginBottom: 16,
    },
  });

export const HomeScreenImpl = (): JSX.Element => {
  const { userId } = useSession();
  const { t } = useTranslations();
  usePageView("home");
  const styles = useThemeStyle(getStyles);
  const router = useRouter();
  const ledgerId = useLedgerGuard();
  const { currencies, refetch: ledgerMetaRefetch } = useLedgerMeta(userId);

  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);
  const {
    netWorthSeries,
    loading: netWorthLoading,
    refetch: netWorthRefetch,
    error: netWorthError,
  } = useHomeCharts(userId, currency, ledgerId);
  const {
    accounts,
    data: accountData,
    loading: accountsLoading,
    refetch: accountsRefetch,
    error: accountsError,
  } = useAccountHierarchy(userId, currency, ledgerId);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const isLoading = netWorthLoading || accountsLoading || refreshing;
  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshSignal((signal) => signal + 1);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        netWorthRefetch(),
        accountsRefetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader title={t("home")} />
      <DashboardScrollView refreshing={refreshing} onRefresh={onRefresh}>
        <AccountChartsCard
          currency={currency}
          currencySymbol={currencySymbol}
          netWorthSeries={netWorthSeries}
          accountTotals={accounts}
          hierarchyData={accountData}
          loading={isLoading}
          error={Boolean(netWorthError || accountsError)}
        />

        <SplitButton
          style={styles.splitButton}
          label={t("quickAdd")}
          onMenuOpen={() => analytics.track("tap_quick_add_menu", {})}
          onPress={async () => {
            analytics.track("tap_quick_add", {});
            AddTransactionCallback.setFn(onRefresh);
            router.navigate({ pathname: "/add-transaction" });
          }}
          menuItems={[
            {
              label: t("multiLegEntry"),
              onPress: async () => {
                analytics.track("tap_split_add", {});
                AddTransactionCallback.setFn(onRefresh);
                router.navigate({ pathname: "/add-transaction-multi" });
              },
            },
          ]}
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
