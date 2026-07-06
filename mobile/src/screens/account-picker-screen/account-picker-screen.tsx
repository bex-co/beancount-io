import { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/common/theme";
import {
  OptionTab,
  useLedgerMeta,
} from "@/screens/add-transaction-screen/hooks/use-ledger-meta";
import { ColorTheme } from "@/types/theme-props";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SelectedAssets, SelectedExpenses } from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, FlexCenter, LedgerGuard, useLedgerGuard } from "@/components";
import { analytics } from "@/common/analytics";
import { usePageView } from "@/common/hooks";

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
    type === "assets" ? SelectedAssets.getFn() : SelectedExpenses.getFn();

  const optionTabs: OptionTab[] =
    type === "assets" ? assetsOptionTabs : expensesOptionTabs;

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
              <Text
                style={{
                  fontSize: 18,
                  color: theme.black,
                }}
              >
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
      <FlexCenter style={{ backgroundColor: theme.white }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </FlexCenter>
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
