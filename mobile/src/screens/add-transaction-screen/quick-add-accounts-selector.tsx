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
import { i18n } from "@/translations";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { SelectedAssets, SelectedExpenses } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ListItem } from "./list-item";
import { List } from "@/components";

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
        backgroundColor: theme.white,
      },
      center: {
        justifyContent: "center",
        alignItems: "center",
      },
      list: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.black20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.black20,
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

  useEffect(() => {
    const currency = currencies.length > 0 ? currencies[0] : "";
    if (onChange) {
      onChange({ asset: selectedAssets, expense: selectedExpenses, currency });
    }
  });

  const isLoading = loading || refreshing;

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text
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
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
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
      <List>
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
      </List>
    </ScrollView>
  );
};
