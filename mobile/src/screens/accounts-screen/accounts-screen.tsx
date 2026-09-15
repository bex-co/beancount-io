import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { gutter, rowMinHeight, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { getPrimaryCurrency } from "@/common/currency-util";
import { LedgerDrawerHeader, StaleDataBanner } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { AccountTable } from "@/components/account-table";
import { selectTrialBalanceCategories } from "@/components/account-list";
import { selectTrialBalanceDisplays } from "@/components/account-list/select-trial-balance";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useTrialBalance } from "@/screens/accounts-screen/hooks/use-trial-balance";
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
  const { userId } = useSession();
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
        pathname: "/account-detail",
        params: { account, ledger: ledgerId },
      });
    },
    [router, ledgerId],
  );

  const {
    data: ledgerMeta,
    currencies,
    refetch: ledgerMetaRefetch,
    error: ledgerMetaError,
  } = useLedgerMeta(userId, ledgerId);
  const currency = getPrimaryCurrency(currencies);

  // Commodity holdings are valued, so they count toward Assets rather than being
  // dropped for lack of a cash balance.
  const {
    data: accountData,
    loading: accountsLoading,
    refetch: accountsRefetch,
    error: accountsError,
  } = useTrialBalance(ledgerId);
  // The same trial balance in units: what a commodity account holds, which the
  // at-cost read has already converted away (see `selectBalanceDisplay`).
  const {
    data: unitsData,
    loading: unitsLoading,
    refetch: unitsRefetch,
    error: unitsError,
  } = useTrialBalance(ledgerId, undefined, "units");

  const categories = useMemo(
    () =>
      selectTrialBalanceCategories(currency, accountData, ledgerMeta?.accounts),
    [currency, accountData, ledgerMeta?.accounts],
  );
  const displays = useMemo(
    () => selectTrialBalanceDisplays(currency, accountData, unitsData),
    [currency, accountData, unitsData],
  );

  const handleOpenAccount = useCallback(() => {
    router.push("/open-account");
  }, [router]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        ledgerMetaRefetch(),
        accountsRefetch(),
        unitsRefetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Held until the units read lands too, so a commodity row does not first
  // render as money and then switch. A failed units read still shows the table.
  const accountsPending =
    (accountsLoading && !accountData) ||
    (unitsLoading && !unitsData && !unitsError);
  const showStale = isShowingStaleDataFromQueries([
    { data: accountData, error: accountsError },
    { data: unitsData, error: unitsError },
    { data: ledgerMeta, error: ledgerMetaError },
  ]);

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("accounts")}
        right={
          canWrite && (
            <TouchableOpacity
              testID="open-account-button"
              onPress={handleOpenAccount}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("openAccount")}
            >
              <Ionicons name="add" size={26} color={theme.black} />
            </TouchableOpacity>
          )
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
      ) : (
        <FadeInView fill>
          <AccountTable
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
