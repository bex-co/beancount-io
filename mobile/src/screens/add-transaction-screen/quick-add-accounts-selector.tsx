import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLedgerMeta } from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { analytics } from "@/common/analytics";
import { fontSizes } from "@/common/theme";
import { i18n } from "@/translations";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { SelectedAssets, SelectedExpenses } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ListItem, ListItemSkeleton } from "./list-item";

type QuickAddAccountsSelectorProps = {
  onChange: ({
    asset,
    expense,
    currency,
  }: {
    asset: string;
    expense: string;
    currency: string;
  }) => void;
};

export const QuickAddAccountsSelector = (
  props: QuickAddAccountsSelectorProps,
) => {
  const router = useRouter();
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        minHeight: 80,
        flexGrow: 0,
        backgroundColor: theme.white,
      },
      center: {
        justifyContent: "center",
        alignItems: "center",
      },
      errorText: {
        fontSize: fontSizes.md,
        color: theme.black60,
        textAlign: "center",
        padding: 16,
      },
      card: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.black10,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: theme.white,
      },
    }),
  );
  const { userId } = useSession();
  const { onChange } = props;
  const [refreshing, setRefreshing] = useState(false);
  const {
    assetsOptionTabs,
    expensesOptionTabs,
    currencies,
    error,
    loading,
    refetch,
  } = useLedgerMeta(userId);
  const [selectedAssets, setSelectedAssets] = useState<string>(
    assetsOptionTabs.length > 0 ? assetsOptionTabs[0].options[0] : "",
  );
  const [selectedExpenses, setSelectedExpenses] = useState<string>(
    expensesOptionTabs.length > 0 ? expensesOptionTabs[0].options[0] : "",
  );

  // Backfill defaults once ledger meta arrives — the useState initializers
  // run before the query resolves on a cold mount.
  useEffect(() => {
    if (!selectedAssets && assetsOptionTabs.length > 0) {
      setSelectedAssets(assetsOptionTabs[0].options[0]);
    }
    if (!selectedExpenses && expensesOptionTabs.length > 0) {
      setSelectedExpenses(expensesOptionTabs[0].options[0]);
    }
  }, [assetsOptionTabs, expensesOptionTabs, selectedAssets, selectedExpenses]);

  useEffect(() => {
    const currency = currencies.length > 0 ? currencies[0] : "";
    if (onChange) {
      onChange({ asset: selectedAssets, expense: selectedExpenses, currency });
    }
  });

  // Skeleton only on first load — during pull-to-refresh the current
  // selections stay visible under the RefreshControl spinner.
  const showSkeleton = loading && !selectedAssets && !selectedExpenses;

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text
          style={styles.errorText}
          onPress={async () => {
            await refetch();
          }}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            try {
              setRefreshing(true);
              await refetch();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={styles.card}>
        {showSkeleton ? (
          <>
            <ListItemSkeleton />
            <ListItemSkeleton showDivider />
          </>
        ) : (
          <>
            <ListItem
              title={i18n.t("from").toUpperCase()}
              content={selectedAssets}
              onPress={async () => {
                analytics.track("tap_assets_picker", {
                  originalOption: selectedAssets,
                });
                SelectedAssets.setFn((value: string) => {
                  setSelectedAssets(value);
                });
                router.push({
                  pathname: "/(app)/account-picker",
                  params: {
                    type: "assets",
                    selectedItem: selectedAssets,
                  },
                });
              }}
            />
            <ListItem
              title={i18n.t("to").toUpperCase()}
              content={selectedExpenses}
              showDivider
              onPress={async () => {
                analytics.track("tap_expenses_picker", {
                  originalOption: selectedExpenses,
                });
                SelectedExpenses.setFn((value: string) => {
                  setSelectedExpenses(value);
                });
                router.push({
                  pathname: "/(app)/account-picker",
                  params: {
                    type: "expenses",
                    selectedItem: selectedExpenses,
                  },
                });
              }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};
