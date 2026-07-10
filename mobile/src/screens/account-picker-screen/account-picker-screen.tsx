import { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/common/theme";
import {
  OptionTab,
  useLedgerMeta,
} from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { ColorTheme } from "@/types/theme-props";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SelectedAssets,
  SelectedExpenses,
  SelectedLegAccount,
} from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, LedgerGuard, useLedgerGuard } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { analytics } from "@/common/analytics";
import { usePageView } from "@/common/hooks";

const SKELETON_ROW_WIDTHS = [200, 160, 220, 140, 180, 210, 150, 190];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    listItem: {
      backgroundColor: theme.white,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black60,
    },
    listItemText: {
      fontSize: 18,
      lineHeight: 24,
      color: theme.black,
    },
    tabBarSkeleton: {
      flexDirection: "row",
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    tabTile: {
      height: 14,
      width: 64,
      borderRadius: 7,
    },
    // marginVertical fills the same 24px line box as listItemText, keeping
    // skeleton and loaded rows the same height.
    rowTile: {
      height: 14,
      borderRadius: 7,
      marginVertical: 5,
    },
  });

export function AccountPickerScreenComponent(): JSX.Element {
  const router = useRouter();
  const { userId } = useSession();
  usePageView("account_picker");
  const ledgerId = useLedgerGuard();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { assetsOptionTabs, expensesOptionTabs, loading } = useLedgerMeta(
    userId ?? "",
    ledgerId,
  );

  const onSelected =
    type === "assets"
      ? SelectedAssets.getFn()
      : type === "leg"
        ? SelectedLegAccount.getFn()
        : SelectedExpenses.getFn();

  const optionTabs: OptionTab[] =
    type === "assets" || type === "leg" ? assetsOptionTabs : expensesOptionTabs;

  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);

  const renderOptionTab = (opt: OptionTab, index: number) => {
    return (
      <ScrollView
        key={index}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
      >
        {opt.options.map((op, idx) => {
          return (
            <TouchableOpacity
              key={idx}
              style={styles.listItem}
              onPress={async () => {
                await analytics.track("tap_account_picker_confirm", {
                  selectedAccount: op,
                });
                onSelected?.(op);
                router.back();
              }}
            >
              <Text style={styles.listItemText} numberOfLines={1}>
                {op}
              </Text>
              <Ionicons name="chevron-forward" size={24} color={theme.black} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const tabsConfig = optionTabs.map((opt, index) => {
    return {
      title: opt.title,
      key: opt.title,
      component: renderOptionTab(opt, index),
    };
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.tabBarSkeleton}>
          <LoadingTile style={styles.tabTile} />
          <LoadingTile style={styles.tabTile} />
          <LoadingTile style={styles.tabTile} />
        </View>
        {SKELETON_ROW_WIDTHS.map((width, index) => (
          <View key={index} style={styles.listItem}>
            <LoadingTile
              style={StyleSheet.flatten([styles.rowTile, { width }])}
            />
            <Ionicons name="chevron-forward" size={24} color={theme.black40} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs
        tabs={tabsConfig}
        initialIndex={0}
        scrollable={true}
        autoScrollToCenter={true}
      />
    </View>
  );
}

export const AccountPickerScreen = memo(function () {
  return (
    <LedgerGuard>
      <AccountPickerScreenComponent />
    </LedgerGuard>
  );
});

AccountPickerScreen.displayName = "AccountPickerScreen";
