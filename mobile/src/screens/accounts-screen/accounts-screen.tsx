import { useCallback, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { analytics } from "@/common/analytics";
import { ColorTheme } from "@/types/theme-props";
import { gutter, rowMinHeight, useTheme } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useSession } from "@/common/hooks/use-session";
import { getPrimaryCurrency } from "@/common/currency-util";
import { LedgerDrawerHeader } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { AccountTable } from "@/components/account-table";
import { selectTrialBalanceCategories } from "@/components/account-list";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { useTrialBalance } from "@/screens/accounts-screen/hooks/use-trial-balance";

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
      paddingRight: gutter,
      minHeight: rowMinHeight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
  });

const AccountsScreenImpl = (): JSX.Element => {
  const { userId } = useSession();
  const ledgerId = useLedgerGuard();
  const { t } = useTranslations();
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  usePageView("accounts");

  const handlePressAccount = useCallback(
    (account: string) => {
      analytics.track("accounts_open_account", { account });
      router.push({ pathname: "/account-detail", params: { account } });
    },
    [router],
  );

  const {
    data: ledgerMeta,
    currencies,
    refetch: ledgerMetaRefetch,
  } = useLedgerMeta(userId, ledgerId);
  const currency = getPrimaryCurrency(currencies);

  // Commodity holdings are valued, so they count toward Assets rather than being
  // dropped for lack of a cash balance.
  const {
    data: accountData,
    loading: accountsLoading,
    refetch: accountsRefetch,
  } = useTrialBalance(ledgerId);

  const categories = useMemo(
    () =>
      selectTrialBalanceCategories(currency, accountData, ledgerMeta?.accounts),
    [currency, accountData, ledgerMeta?.accounts],
  );

  const handleOpenAccount = useCallback(() => {
    analytics.track("tap_open_account", {});
    router.push("/open-account");
  }, [router]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([ledgerMetaRefetch(), accountsRefetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const accountsPending = accountsLoading && !accountData;

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader
        title={t("accounts")}
        right={
          <TouchableOpacity
            testID="open-account-button"
            onPress={handleOpenAccount}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityLabel={t("openAccount")}
          >
            <Ionicons name="add" size={26} color={theme.black} />
          </TouchableOpacity>
        }
      />
      {accountsPending ? (
        <View>
          {SKELETON_ROWS.map((row, index) => (
            <View
              key={index}
              style={[
                styles.skeletonRow,
                // gutter + one INDENT_STEP (18) per depth, mirroring AccountTable.
                { paddingLeft: gutter + row.indent * 18 },
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
