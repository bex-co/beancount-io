import { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { gutter, space, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { useLedgerDrawer } from "./ledger-drawer-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: space.md,
      backgroundColor: theme.white,
    },
    navLeft: {
      flexDirection: "row",
      alignItems: "center",
      width: 80,
      justifyContent: "flex-start",
      gap: space.sm,
    },
    navTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: theme.black90,
      textAlign: "center",
    },
    navRight: {
      width: 80,
      alignItems: "flex-end",
    },
    badgeContainer: {
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.error,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 2,
    },
    badgeText: {
      color: theme.white,
      fontSize: 10,
      fontWeight: "600",
      lineHeight: 14,
    },
  });

/** Top-left hamburger that opens the shared ledger drawer. */
export function LedgerDrawerButton({ color }: { color?: string }): JSX.Element {
  const theme = useTheme().colorTheme;
  const { openDrawer } = useLedgerDrawer();

  const handlePress = () => {
    analytics.track("tap_open_ledger_drawer", {});
    openDrawer();
  };

  return (
    <TouchableOpacity
      testID="ledger-drawer-button"
      onPress={handlePress}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <Ionicons name="menu" size={26} color={color ?? theme.black} />
    </TouchableOpacity>
  );
}

function NotificationsBellButton(): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const { count } = useLedgerErrors();

  const handlePress = () => {
    analytics.track("tap_notifications_bell", { errorCount: count });
    router.push("/(app)/notifications");
  };

  return (
    <TouchableOpacity
      accessibilityLabel={t("notificationsBell")}
      onPress={handlePress}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <View style={styles.badgeContainer}>
        <Ionicons name="notifications-outline" size={24} color={theme.black} />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Slim tab header: equal-width action areas keep the title truly centered. */
export function LedgerDrawerHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.navBar}>
      <View style={styles.navLeft}>
        <LedgerDrawerButton />
        <NotificationsBellButton />
      </View>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}
