import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerDrawer } from "./ledger-drawer-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    navLeft: {
      flexDirection: "row",
      alignItems: "center",
      width: 64,
      justifyContent: "flex-start",
    },
    navTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: theme.black90,
      textAlign: "center",
    },
    navRight: {
      width: 64,
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

/** Slim tab header: hamburger left, title centered, right placeholder keeps title truly centered. */
export function LedgerDrawerHeader({ title }: { title: string }): JSX.Element {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.navBar}>
      <View style={styles.navLeft}>
        <LedgerDrawerButton />
      </View>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.navRight} />
    </View>
  );
}
