import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, withAlpha } from "@/common/theme";
import { pickAccountRoot } from "@/common/account-root";
import { getRootIcon, TINT_ALPHA } from "./root-icon";

const SIZE = 40;
const RADIUS = 12;
const GLYPH_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    flexShrink: 0,
  },
});

interface AccountTypeIconProps {
  /** Every account the entry touches; the root type drives the glyph. */
  accounts: string[];
}

/**
 * Leading 40×40 icon for a journal row.
 *
 * Renders a glyph for the entry's root account type — Expenses, Income, Assets,
 * Liabilities or Equity — in a rounded square tinted with that glyph's tone.
 * The account root is structured data that is always present, so the icon is
 * never a guess; entries with no account at all (Price, Commodity, …) get a
 * neutral glyph. Size is fixed so rows never shift.
 */
export const AccountTypeIcon: React.FC<AccountTypeIconProps> = ({
  accounts,
}) => {
  const { colorTheme, name } = useTheme();

  const { glyph, tone } = getRootIcon(pickAccountRoot(accounts));
  const color = tone(colorTheme);
  const alpha = name === "dark" ? TINT_ALPHA.dark : TINT_ALPHA.light;

  return (
    <View
      style={[styles.container, { backgroundColor: withAlpha(color, alpha) }]}
    >
      <Ionicons name={glyph} size={GLYPH_SIZE} color={color} />
    </View>
  );
};
