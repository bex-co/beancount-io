import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  type ColorValue,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { nativeTabIcons, TabBarIcon } from "@/components/tab-bar-icon";
import { HapticTab } from "@/components/haptic-tab";
import { LedgerDrawerProvider } from "@/components/ledger-drawer";
import { fontSizes, fontWeights, useTheme, withAlpha } from "@/common/theme";
import type { ColorTheme } from "@/types/theme-props";
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

type TabTitles = {
  home: string;
  accounts: string;
  transactions: string;
  reports: string;
  files: string;
};

type TabNavigatorProps = {
  theme: ColorTheme;
  titles: TabTitles;
};

/**
 * UIKit owns the iOS bar. On iOS 26 this is the system Liquid Glass tab bar;
 * older iOS releases receive their native translucent tab bar automatically.
 * Deliberately leave background, blur, shadow, sizing, and typography unset so
 * custom appearance values cannot cover or fight the system material.
 */
function NativeTabNavigator({ theme, titles }: TabNavigatorProps): JSX.Element {
  const contentStyle = { backgroundColor: theme.white } as const;

  return (
    <NativeTabs tintColor={theme.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>{titles.home}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.index} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="accounts" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>{titles.accounts}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.accounts} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transactions" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>
          {titles.transactions}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.transactions} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>{titles.reports}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.reports} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ledger" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>{titles.files}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={nativeTabIcons.ledger} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

type JavaScriptTabNavigatorProps = TabNavigatorProps & {
  bottomInset: number;
  themeName: string;
};

/** Android keeps the existing custom tab treatment and native haptic wrapper. */
function JavaScriptTabNavigator({
  bottomInset,
  theme,
  themeName,
  titles,
}: JavaScriptTabNavigatorProps): JSX.Element {
  return (
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
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
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
                bottom: bottomInset + TAB_BAR_PILL_INSET,
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
        // Native iOS tabs render eagerly, so the route components carry their
        // own focus-once guard. The JS navigator can retain its built-in lazy
        // mounting on Android.
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: titles.home,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon route="index" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: titles.accounts,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon route="accounts" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: titles.transactions,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon route="transactions" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: titles.reports,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon route="reports" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: titles.files,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon route="ledger" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

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
        {Platform.OS === "ios" ? (
          <NativeTabNavigator theme={theme} titles={tabTitles} />
        ) : (
          <JavaScriptTabNavigator
            bottomInset={insets.bottom}
            theme={theme}
            themeName={themeName}
            titles={tabTitles}
          />
        )}
      </SafeAreaView>
    </LedgerDrawerProvider>
  );
}
