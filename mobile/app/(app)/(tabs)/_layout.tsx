import { Tabs } from "expo-router";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBarIcon } from "@/components/tab-bar-icon";
import { HapticTab } from "@/components/haptic-tab";
import { LedgerDrawerProvider } from "@/components/ledger-drawer";
import { useTheme } from "@/common/theme";
import { i18n } from "@/translations";
import { localeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";

export default function TabLayout() {
  const theme = useTheme().colorTheme;
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
            tabBarStyle: {
              backgroundColor: theme.white,
              borderTopColor: theme.black10,
            },
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
