import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useHomeCharts } from "@/screens/home-screen/hooks/use-home-charts";
import { useAccountHierarchy } from "@/screens/home-screen/hooks/use-account-hierarchy";
import { CommonMargin } from "@/common/common-margin";
import { AccountChartsCard } from "@/screens/home-screen/components/account-charts-card";
import { RecentTransactionsCard } from "@/screens/home-screen/components/recent-transactions-card";
import { SpendingCard } from "@/screens/home-screen/components/spending-card";
import { getCurrencySymbol } from "@/common/currency-util";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddTransactionCallback } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { themeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { Button, LedgerDrawerHeader } from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    quickAddLabel: {
      color: theme.white,
      fontSize: 20,
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
  const currentTheme = useReactiveVar(themeVar);

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        indicatorStyle={currentTheme === "dark" ? "white" : "default"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme === "dark" ? "white" : "black"}
          />
        }
      >
        <AccountChartsCard
          currency={currency}
          currencySymbol={currencySymbol}
          netWorthSeries={netWorthSeries}
          accountTotals={accounts}
          hierarchyData={accountData}
          loading={isLoading}
          error={Boolean(netWorthError || accountsError)}
        />

        <Button
          type="primary"
          onPress={async () => {
            analytics.track("tap_quick_add", {});
            AddTransactionCallback.setFn(onRefresh);
            router.navigate({
              pathname: "/add-transaction",
            });
          }}
        >
          <Text style={styles.quickAddLabel}>{t("quickAdd")}</Text>
        </Button>
        <CommonMargin />

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

        <CommonMargin />
      </ScrollView>
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
