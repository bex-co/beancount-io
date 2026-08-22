import { Tabs } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, type ColorValue, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TabBarIcon } from "@/components/tab-bar-icon";
import { HapticTab } from "@/components/haptic-tab";
import { LedgerDrawerProvider } from "@/components/ledger-drawer";
import { fontSizes, fontWeights, useTheme, withAlpha } from "@/common/theme";
import { i18n } from "@/translations";
import { localeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";

const TAB_BAR_CONTENT_HEIGHT = 80;
const TAB_BAR_PILL_INSET = 6;
const TAB_BAR_SIDE_INSET = 12;

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.xs + 2,
    marginTop: 2,
  },
  tabBarBackground: {
    position: "absolute",
    borderRadius: 36,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 18,
    elevation: 10,
  },
});

const renderTabBarLabel = ({
  children,
  color,
}: {
  children: string;
  color: ColorValue;
}) => (
  <Text
    adjustsFontSizeToFit
    minimumFontScale={0.78}
    numberOfLines={1}
    style={[styles.tabBarLabel, { color }]}
  >
    {children}
  </Text>
);

export default function TabLayout() {
  const { colorTheme: theme, name: themeName } = useTheme();
  const insets = useSafeAreaInsets();
  const locale = useReactiveVar(localeVar);
  // `i18n.t` reads whatever locale is current, so the titles only need to be
  // recomputed when `localeVar` changes. State plus an effect did the same job
  // in two renders — and shipped the previous locale's titles in the first one.
  const tabTitles = useMemo(
    () => ({
      home: i18n.t("home"),
      accounts: i18n.t("accounts"),
      reports: i18n.t("reports"),
      files: i18n.t("files"),
      transactions: i18n.t("transactions"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  return (
    <LedgerDrawerProvider>
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: theme.white }}
      >
        <Tabs
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarActiveTintColor: theme.primary,
            // Without an explicit inactive tint, react-navigation falls back to
            // its light-theme gray, which is unreadable on the dark tab bar.
            tabBarInactiveTintColor: theme.black80,
            tabBarShowLabel: true,
            tabBarLabel: renderTabBarLabel,
            tabBarInactiveBackgroundColor: "transparent",
            tabBarItemStyle: {
              minWidth: 0,
              marginHorizontal: 3,
              marginVertical: 7,
            },
            tabBarStyle: {
              position: "absolute",
              backgroundColor: "transparent",
              borderTopWidth: 0,
              borderTopColor: "transparent",
              elevation: 0,
              height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            },
            tabBarBackground: () => (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.tabBarBackground,
                  {
                    top: TAB_BAR_PILL_INSET,
                    right: TAB_BAR_SIDE_INSET,
                    bottom: insets.bottom + TAB_BAR_PILL_INSET,
                    left: TAB_BAR_SIDE_INSET,
                    backgroundColor: withAlpha(
                      theme.white,
                      themeName === "dark" ? 0.94 : 0.9,
                    ),
                    borderColor: withAlpha(theme.black40, 0.6),
                    shadowColor: theme.nav01,
                    shadowOpacity: themeName === "dark" ? 0.4 : 0.16,
                  },
                ]}
              />
            ),
            // Mount a tab the first time it is focused, not at launch. With
            // `false` all five screens mounted on start and fired their
            // queries before the user had visited any of them — four screens'
            // worth of network on the critical path to the first paint, and
            // four page-view events for screens nobody looked at.
            //
            // The tab-switch flicker fix in `83bddba` does not depend on this:
            // it lifted the single `SafeAreaView` to this layout, so the top
            // inset is computed once here and a lazily-mounted screen inherits
            // it already resolved. Every tab renders a themed skeleton while
            // its first query is in flight.
            lazy: true,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: tabTitles.home,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon route="index" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="accounts"
            options={{
              title: tabTitles.accounts,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon route="accounts" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: tabTitles.transactions,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon
                  route="transactions"
                  color={color}
                  focused={focused}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: tabTitles.reports,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon route="reports" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="ledger"
            options={{
              title: tabTitles.files,
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon route="ledger" color={color} focused={focused} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </LedgerDrawerProvider>
  );
}
