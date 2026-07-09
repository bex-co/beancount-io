import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { themeVar } from "@/common/vars";
import { getCurrencySymbol } from "@/common/currency-util";
import { groupThousands } from "@/common/number-utils";
import { CommonMargin } from "@/common/common-margin";
import {
  BalanceChartCard,
  DashboardCard,
  LedgerDrawerHeader,
} from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { AccountListPage, selectAccountTree } from "@/components/account-list";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { TimeRange } from "@/common/series-util";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { useAccountHierarchy } from "@/screens/home-screen/hooks/use-account-hierarchy";
import { useBalanceSheet } from "@/screens/accounts-screen/hooks/use-balance-sheet";
import { selectNetWorthHeaderSeries } from "@/screens/accounts-screen/selectors/select-net-worth-header";

const LIST_SKELETON_HEIGHT = 220;

// Beancount's five root account categories, in conventional order. Each key is
// both the account-hierarchy label and its i18n label key.
const ACCOUNT_GROUP_KEYS = [
  "assets",
  "liabilities",
  "equity",
  "income",
  "expenses",
] as const;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
  });

const AccountsScreenImpl = (): JSX.Element => {
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const { t } = useTranslations();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const currentTheme = useReactiveVar(themeVar);
  usePageView("accounts");

  const handlePressAccount = useCallback(
    (account: string) => {
      analytics.track("accounts_open_account", { account });
      router.push({ pathname: "/account-detail", params: { account } });
    },
    [router],
  );

  const onNetWorthRangeChange = useCallback((range: TimeRange) => {
    analytics.track("accounts_net_worth_range", { range });
  }, []);

  const { currencies, refetch: ledgerMetaRefetch } = useLedgerMeta(userId);
  const currency = currencies.length > 0 ? currencies[0] : "USD";
  const currencySymbol = getCurrencySymbol(currency);

  const {
    data: balanceSheet,
    loading: balanceSheetLoading,
    error: balanceSheetError,
    refetch: balanceSheetRefetch,
  } = useBalanceSheet(ledgerId);

  const {
    accounts,
    data: accountData,
    loading: accountsLoading,
    refetch: accountsRefetch,
  } = useAccountHierarchy(userId, currency, ledgerId);

  const netWorthSeries = useMemo(
    () => selectNetWorthHeaderSeries(currency, balanceSheet),
    [currency, balanceSheet],
  );
  const groupTrees = useMemo(
    () =>
      ACCOUNT_GROUP_KEYS.map((key) => ({
        key,
        items: selectAccountTree(currency, key, accountData),
      })),
    [currency, accountData],
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        balanceSheetRefetch(),
        accountsRefetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const accountsPending = accountsLoading && !accountData;

  const formatTotal = (value: string) =>
    `${currencySymbol}${groupThousands(Number(value))}`;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader title={t("accounts")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        indicatorStyle={currentTheme === "dark" ? "white" : "default"}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme === "dark" ? "white" : "black"}
          />
        }
      >
        <BalanceChartCard
          label={t("netWorth")}
          currencySymbol={currencySymbol}
          series={netWorthSeries}
          loading={balanceSheetLoading || refreshing}
          error={Boolean(balanceSheetError)}
          onRangeChange={onNetWorthRangeChange}
        />
        {accountsPending ? (
          <DashboardCard bleed>
            <LoadingTile height={LIST_SKELETON_HEIGHT} mx={16} />
          </DashboardCard>
        ) : (
          groupTrees
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <DashboardCard bleed key={group.key}>
                <AccountListPage
                  label={t(group.key)}
                  total={formatTotal(accounts[group.key])}
                  items={group.items}
                  currencySymbol={currencySymbol}
                  scrollable={false}
                  onPressAccount={handlePressAccount}
                />
              </DashboardCard>
            ))
        )}
        <CommonMargin />
      </ScrollView>
    </SafeAreaView>
  );
};

export const AccountsScreen = (): JSX.Element => {
  return (
    <LedgerGuard>
      <AccountsScreenImpl />
    </LedgerGuard>
  );
};
