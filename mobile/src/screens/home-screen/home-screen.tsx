import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useHomeCharts } from "@/screens/home-screen/hooks/use-home-charts";
import { useAccountHierarchy } from "@/screens/home-screen/hooks/use-account-hierarchy";
import { HeaderText, SmallHeaderText } from "@/screens/home-screen/text-styled";
import { CommonMargin } from "@/common/common-margin";
import { LoadingTile } from "@/components/loading-tile";
import { AccountsStyled } from "@/screens/home-screen/components/accounts-styled";
import { NetAssetsStyled } from "@/screens/home-screen/components/net-assets-styled";
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
import { Button } from "@/components";
import { BarChartD3 } from "@/common/d3/bar-chart-d3";
import { LineChartD3 } from "@/common/d3/line-chart-d3";
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
    netWorth,
    lastSixProfitData,
    lastSixWorthData,
    loading: netWorthLoading,
    refetch: netWorthRefetch,
    error: netWorthError,
  } = useHomeCharts(userId, currency, ledgerId);
  const {
    accounts,
    loading: accountsLoading,
    refetch: accountsRefetch,
    error: accountsError,
  } = useAccountHierarchy(userId, currency, ledgerId);
  const [refreshing, setRefreshing] = useState(false);
  const isLoading = netWorthLoading || refreshing;
  const onRefresh = async () => {
    setRefreshing(true);
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
        <CommonMargin />
        <SmallHeaderText>{t("netAssets")}</SmallHeaderText>
        <View>
          {netWorthLoading || netWorthError || refreshing ? (
            <LoadingTile height={40} mx={16} />
          ) : (
            <NetAssetsStyled netAssets={`${netWorth.netAssets} ${currency}`} />
          )}
        </View>
        <CommonMargin />

        <HeaderText>{t("accounts")}</HeaderText>
        <CommonMargin />
        <View>
          {accountsLoading || accountsError || refreshing ? (
            <LoadingTile height={216} mx={16} />
          ) : (
            <AccountsStyled
              assets={`${accounts.assets} ${currency}`}
              liabilities={`${accounts.liabilities} ${currency}`}
              income={`${accounts.income} ${currency}`}
              expenses={`${accounts.expenses} ${currency}`}
              equity={`${accounts.equity} ${currency}`}
            />
          )}
        </View>
        <CommonMargin />
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
        <HeaderText>{t("monthlyNetIncome")}</HeaderText>
        <CommonMargin />
        <View>
          {isLoading || netWorthError || accountsError ? (
            <LoadingTile height={200} mx={16} />
          ) : (
            <>
              <BarChartD3
                currencySymbol={currencySymbol}
                labels={lastSixProfitData.labels}
                numbers={lastSixProfitData.numbers}
              />
            </>
          )}
        </View>
        <CommonMargin />
        <HeaderText>{t("monthlyNetWorth")}</HeaderText>
        <CommonMargin />
        <View>
          {isLoading || netWorthError ? (
            <LoadingTile height={200} mx={16} />
          ) : (
            <>
              <LineChartD3
                currencySymbol={currencySymbol}
                labels={lastSixWorthData.labels}
                numbers={lastSixWorthData.numbers}
              />
            </>
          )}
        </View>
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
