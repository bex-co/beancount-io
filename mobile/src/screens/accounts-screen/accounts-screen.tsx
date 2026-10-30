import { useApolloClient } from "@apollo/client";
import {
  ACCOUNT_CLOSE_DATE_QUERIES,
  LEDGER_ERROR_QUERIES,
  refetchNamedQueries,
} from "@/common/apollo/refresh-named-queries";
import {
  selectCardLoadState,
  selectReadContextState,
} from "@/common/apollo/card-load-state";
import { CardLoadFailure } from "@/components/card-load-failure";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { gutter, rowMinHeight, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useGuest } from "@/common/guest/guest-context";
import { LedgerDrawerHeader, StaleDataBanner } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { AccountTable } from "@/components/account-table";
import { selectTrialBalanceCategories } from "@/components/account-list";
import { selectTrialBalanceDisplays } from "@/components/account-list/select-trial-balance";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { useTrialBalance } from "@/screens/accounts-screen/hooks/use-trial-balance";
import { useLedgerPrices } from "@/common/hooks/use-ledger-prices";
import { throughToday } from "@/common/balance-util";
import { useToday } from "@/common/hooks/use-today";
import { useAccountCloseDatesState } from "@/common/hooks/use-account-close-dates";
import { listedAccountsAsOf } from "@/common/account-close-dates";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";

// Skeleton rows sized to the loaded table's rhythm: each tile plus its vertical
// margins fills the same line box a real row occupies (rowMinHeight), so nothing
// shifts when data lands. Widths vary across rows so it reads as content, not
// stripes.
const SKELETON_ROWS = [
  { indent: 0, labelWidth: 78, valueWidth: 92 },
  { indent: 1, labelWidth: 148, valueWidth: 80 },
  { indent: 1, labelWidth: 120, valueWidth: 88 },
  { indent: 1, labelWidth: 164, valueWidth: 72 },
  { indent: 0, labelWidth: 96, valueWidth: 84 },
  { indent: 1, labelWidth: 132, valueWidth: 78 },
  { indent: 0, labelWidth: 70, valueWidth: 96 },
  { indent: 0, labelWidth: 84, valueWidth: 90 },
];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingEnd: gutter,
      minHeight: rowMinHeight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
  });

const AccountsScreenImpl = (): JSX.Element => {
  const guest = useGuest();
  const ledgerId = useLedgerGuard();
  const { canWrite } = useLedgerAccess();
  const { t } = useTranslations();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const handlePressAccount = useCallback(
    (account: string) => {
      // `ledger` binds the pushed entry to this ledger, so a later ledger
      // switch cannot revive it under a different one.
      router.push({
        pathname: guest ? "/examples/account-detail" : "/account-detail",
        params: { account, ledger: ledgerId },
      });
    },
    [router, ledgerId, guest],
  );

  const {
    data: ledgerMeta,
    accounts,
    primaryCurrency: currency,
    refetch: ledgerMetaRefetch,
    error: ledgerMetaError,
  } = useLedgerReadContext(ledgerId);

  // Commodity holdings are valued at market, as on Home, so they count toward
  // Assets rather than being dropped for lack of a cash balance.
  const today = useToday();
  const balanceTime = throughToday(today);
  const {
    data: accountData,
    loading: accountsLoading,
    refetch: accountsRefetch,
    error: accountsError,
  } = useTrialBalance(ledgerId, balanceTime);
  // The same trial balance in units: what a commodity account holds, which the
  // market read has already converted away (see `selectBalanceDisplay`).
  const {
    data: unitsData,
    loading: unitsLoading,
    refetch: unitsRefetch,
    error: unitsError,
  } = useTrialBalance(ledgerId, balanceTime, "units");

  // Closed accounts the ledger emptied stay out of the tree (w21/099).
  const { closeDates, settled: closeDatesSettled } =
    useAccountCloseDatesState(ledgerId);
  const listed = useMemo(
    () => listedAccountsAsOf(accounts ?? [], today, closeDates),
    [accounts, today, closeDates],
  );
  const categories = useMemo(
    () => selectTrialBalanceCategories(currency, accountData, listed),
    [currency, accountData, listed],
  );
  // Which commodities had a price: a row's value reads "at market" or "at
  // cost", and each root dates its prices the way Home's pages do.
  const {
    prices,
    managed,
    data: pricesData,
    loading: pricesLoading,
    refetch: pricesRefetch,
    error: pricesError,
  } = useLedgerPrices(ledgerId);
  const displays = useMemo(
    () =>
      selectTrialBalanceDisplays(
        currency,
        accountData,
        unitsData,
        prices,
        today,
        managed,
      ),
    [currency, accountData, unitsData, prices, today, managed],
  );

  const handleOpenAccount = useCallback(() => {
    router.push("/open-account");
  }, [router]);

  const client = useApolloClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        accountsRefetch(),
        unitsRefetch(),
        pricesRefetch(),
        // The bell's errors and the close dates the tree is filtered by (w21/839).
        refetchNamedQueries(client, [
          ...LEDGER_ERROR_QUERIES,
          ...ACCOUNT_CLOSE_DATE_QUERIES,
        ]),
      ]);
    } catch {
      // Query errors render in the screen or the guest access boundary.
    } finally {
      setRefreshing(false);
    }
  };

  // Held until the units and price reads land too, so a commodity row does not
  // first render as money, or without its basis, and then switch. A failed read
  // still shows the table.
  const contextState = selectReadContextState(ledgerMeta, ledgerMetaError);
  const accountsPending =
    contextState === "loading" ||
    !closeDatesSettled ||
    (accountsLoading && !accountData) ||
    (unitsLoading && !unitsData && !unitsError) ||
    (pricesLoading && !pricesData && !pricesError);
  // A failed first load has no accounts to list; the table read that as "No
  // accounts" (w21/080).
  const accountsFailed =
    contextState === "failed" ||
    selectCardLoadState({
      loading: accountsLoading,
      hasData: accountData !== undefined,
      error: accountsError,
    }) === "failed";
  const showStale = isShowingStaleDataFromQueries([
    { data: accountData, error: accountsError },
    { data: unitsData, error: unitsError },
    { data: pricesData, error: pricesError },
    { data: ledgerMeta, error: ledgerMetaError },
  ]);

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("accounts")}
        action={
          canWrite && {
            accessibilityLabel: t("openAccount"),
            onPress: handleOpenAccount,
            icon: <Ionicons name="add" size={26} color={theme.black} />,
            testID: "open-account-button",
          }
        }
      />
      {showStale ? <StaleDataBanner /> : null}
      {accountsPending ? (
        <View>
          {SKELETON_ROWS.map((row, index) => (
            <View
              key={index}
              style={[
                styles.skeletonRow,
                // gutter + one INDENT_STEP (18) per depth, mirroring AccountTable.
                { paddingStart: gutter + row.indent * 18 },
              ]}
            >
              <LoadingTile width={row.labelWidth} height={14} />
              <LoadingTile width={row.valueWidth} height={14} />
            </View>
          ))}
        </View>
      ) : accountsFailed ? (
        <CardLoadFailure onRetry={() => onRefresh()} />
      ) : (
        <FadeInView fill>
          <AccountTable
            // Expand and collapse choices belong to one ledger's tree (w21/384).
            key={ledgerId}
            categories={categories}
            currency={currency}
            displays={displays}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onPressAccount={handlePressAccount}
          />
        </FadeInView>
      )}
    </View>
  );
};

export const AccountsScreen = (): JSX.Element => {
  return (
    <LedgerGuard>
      <AccountsScreenImpl />
    </LedgerGuard>
  );
};
