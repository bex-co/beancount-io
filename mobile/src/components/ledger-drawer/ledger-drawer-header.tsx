import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useReactiveVar } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { ledgerVar } from "@/common/vars";
import { useListLedgersQuery } from "@/generated-graphql/graphql";
import { useLedgerDrawer } from "./ledger-drawer-context";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
      backgroundColor: theme.white,
    },
    headerTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "700",
      color: theme.text01,
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

/** Slim tab header: hamburger + the active ledger's name. */
export function LedgerDrawerHeader(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const ledgerId = useReactiveVar(ledgerVar);
  const { data } = useListLedgersQuery();
  const currentLedgerName =
    data?.listLedgers?.find((l) => l.id === ledgerId)?.fullName ?? "";

  return (
    <View style={styles.header}>
      <LedgerDrawerButton />
      {currentLedgerName ? (
        <Text style={styles.headerTitle} numberOfLines={1}>
          {currentLedgerName}
        </Text>
      ) : null}
    </View>
  );
}
