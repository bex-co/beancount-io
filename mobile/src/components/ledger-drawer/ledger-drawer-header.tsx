import { iconActionSize } from "@/common/theme/spacing";
import { type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights, gutter, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { MenuButton, type MenuButtonItem } from "../menu-button";
import { headerTitleLineHeight, headerHeight } from "./header-layout";
import { useLedgerDrawer } from "./ledger-drawer-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      backgroundColor: theme.white,
    },
    navLeft: {
      flexDirection: "row",
      alignItems: "center",
      width: iconActionSize * 2,
      justifyContent: "flex-start",
    },
    navTitle: {
      flex: 1,
      fontSize: fontSizes.xl,
      lineHeight: headerTitleLineHeight,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
    },
    navRight: {
      width: iconActionSize * 2,
      alignItems: "flex-end",
    },
    action: {
      width: iconActionSize,
      height: iconActionSize,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeContainer: {
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: -4,
      end: -6,
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
function LedgerDrawerButton({ color }: { color?: string }): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const { openDrawer } = useLedgerDrawer();
  const styles = useThemeStyle(getStyles);

  const handlePress = () => {
    openDrawer();
  };

  return (
    <TouchableOpacity
      testID="ledger-drawer-button"
      onPress={handlePress}
      style={styles.action}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("openLedgerDrawer")}
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
    router.push("/(app)/notifications");
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("notificationsBell")}
      onPress={handlePress}
      style={styles.action}
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

type HeaderAction = {
  icon: ReactNode;
  accessibilityLabel: string;
  testID?: string;
} & (
  | { onPress: () => void; disabled?: boolean; items?: never }
  | { items: MenuButtonItem[]; onPress?: never; disabled?: never }
);

/**
 * Every tab uses the same row and 44pt actions, including read-only/empty states.
 * Accept action data instead of arbitrary controls so callers cannot change the
 * bar geometry. Dynamic Type grows the row uniformly, independently of its title.
 */
export function LedgerDrawerHeader({
  title,
  action,
}: {
  title: string;
  action?: HeaderAction | false;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);

  const { fontScale } = useWindowDimensions();
  const height = headerHeight(fontScale);

  return (
    <View testID="tab-header" style={[styles.navBar, { height }]}>
      <View style={styles.navLeft}>
        <LedgerDrawerButton />
        <NotificationsBellButton />
      </View>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navRight}>
        {action ? (
          action.items ? (
            <MenuButton {...action} />
          ) : (
            <TouchableOpacity
              testID={action.testID}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityState={{ disabled: Boolean(action.disabled) }}
              disabled={action.disabled}
              onPress={action.onPress}
              activeOpacity={0.7}
              style={styles.action}
            >
              {action.icon}
            </TouchableOpacity>
          )
        ) : null}
      </View>
    </View>
  );
}
