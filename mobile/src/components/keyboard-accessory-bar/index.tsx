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

const BAR_HEIGHT = 44;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    bar: {
      height: BAR_HEIGHT,
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

type Button = {
  label: string;
  insert: string;
  cursorOffset?: number;
  isDate?: boolean;
};

function getTodayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const STATIC_BUTTONS: Button[] = [
  { label: ":", insert: ":" },
  { label: '"', insert: '""', cursorOffset: 1 },
  { label: "#", insert: "#" },
  { label: "^", insert: "^" },
  { label: "⇥", insert: "  " },
];

type KeyboardAccessoryBarProps = {
  onInsert: (text: string, cursorOffset?: number) => void;
};

export function KeyboardAccessoryBar({ onInsert }: KeyboardAccessoryBarProps) {
  const styles = useThemeStyle(getStyles);
  const today = getTodayString();
  const buttons: Button[] = [
    { label: today, insert: today + " ", isDate: true },
    ...STATIC_BUTTONS,
  ];

  return (
    <View style={styles.bar}>
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
