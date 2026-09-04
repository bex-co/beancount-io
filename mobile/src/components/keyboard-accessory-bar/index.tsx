import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { fonts } from "@/common/theme";
import { getFormatDate } from "@/common/format-util";
import { buildKeyboardShortcutButtons } from "./utils";

export const KEYBOARD_ACCESSORY_BAR_HEIGHT = 44;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    bar: {
      height: KEYBOARD_ACCESSORY_BAR_HEIGHT,
      backgroundColor: theme.white,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black40,
      flexDirection: "row",
      alignItems: "center",
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 8,
      alignItems: "center",
      gap: 4,
      flexDirection: "row",
    },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: theme.black40,
      minWidth: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: {
      fontFamily: fonts.mono,
      fontSize: 13,
      color: theme.black,
      letterSpacing: 0,
    },
    dateText: {
      fontFamily: fonts.mono,
      fontSize: 11,
      color: theme.black,
    },
  });

type KeyboardAccessoryBarProps = {
  onInsert: (text: string, cursorOffset?: number) => void;
  operatingCurrencies?: string[];
};

export function KeyboardAccessoryBar({
  onInsert,
  operatingCurrencies = [],
}: KeyboardAccessoryBarProps) {
  const styles = useThemeStyle(getStyles);
  const today = getFormatDate(new Date());
  const buttons = buildKeyboardShortcutButtons(today, operatingCurrencies);

  return (
    <View testID="ledger-editor-quick-buttons" style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={styles.btn}
            onPress={() => onInsert(btn.insert, btn.cursorOffset)}
            activeOpacity={0.6}
          >
            <Text style={btn.isDate ? styles.dateText : styles.btnText}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
