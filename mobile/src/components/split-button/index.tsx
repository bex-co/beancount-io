import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ColorTheme } from "@/types/theme-props";

export type SplitButtonMenuItem = {
  label: string;
  onPress: () => void;
};

type SplitButtonProps = {
  label: string;
  onPress: () => void;
  menuItems: SplitButtonMenuItem[];
  onMenuOpen?: () => void;
  style?: StyleProp<ViewStyle>;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.primary,
      flexDirection: "row",
      overflow: "hidden",
    },
    primary: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryPressed: {
      backgroundColor: theme.primaryDark,
    },
    primaryLabel: {
      color: theme.white,
      fontSize: fontSizes.lg,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255,255,255,0.4)",
      marginVertical: 10,
    },
    chevron: {
      width: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    chevronPressed: {
      backgroundColor: theme.primaryDark,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      borderRadius: 8,
      backgroundColor: theme.white,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      overflow: "hidden",
    },
    menuItem: {
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    menuItemPressed: {
      backgroundColor: theme.black10,
    },
    menuItemDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black40,
    },
    menuItemText: {
      fontSize: fontSizes.lg,
      color: theme.black,
    },
  });

export const SplitButton = ({
  label,
  onPress,
  menuItems,
  onMenuOpen,
  style,
}: SplitButtonProps) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const openMenu = () => {
    onMenuOpen?.();
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, left: x, width });
      setVisible(true);
    });
  };

  return (
    <View ref={anchorRef} style={[styles.row, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.primaryPressed,
        ]}
        onPress={onPress}
      >
        <Text style={styles.primaryLabel}>{label}</Text>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        style={({ pressed }) => [
          styles.chevron,
          pressed && styles.chevronPressed,
        ]}
        onPress={openMenu}
        hitSlop={4}
      >
        <Ionicons name="chevron-down" size={18} color={theme.white} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.menu,
              {
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              },
            ]}
          >
            {menuItems.map((item, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.menuItem,
                  i > 0 && styles.menuItemDivider,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => {
                  setVisible(false);
                  item.onPress();
                }}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
