import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createPendingMenuAction } from "./pending-action";
import { fontSizes } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ColorTheme } from "@/types/theme-props";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";

export type MenuButtonItem = {
  label: string;
  /** Trailing glyph, drawn at the row's right edge. */
  icon?: ReactNode;
  onPress: () => void;
};

type MenuButtonProps = {
  /** The trigger glyph; the button around it is a 44pt hit target. */
  icon: ReactNode;
  accessibilityLabel: string;
  items: MenuButtonItem[];
  testID?: string;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    trigger: {
      alignItems: "center",
      justifyContent: "center",
      // No negative margin: the icon sits at the header's 16px gutter like every
      // other header action (e.g. the Transactions tab's add button), so the glyph
      // stays symmetric with the left-side icons and lines up across tabs.
    },
    triggerPressed: {
      opacity: 0.6,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      minWidth: 240,
      borderRadius: 14,
      backgroundColor: theme.white,
      // Shadows read as nothing on a dark surface, so a hairline border does
      // the edge definition in both themes.
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black20,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      overflow: "hidden",
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemPressed: {
      backgroundColor: theme.controlSelected,
    },
    itemDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    itemLabel: {
      flex: 1,
      fontSize: fontSizes.lg,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

/**
 * An icon button that drops a right-aligned menu beneath itself.
 *
 * Built for the header action slot: the popover is measured off the trigger in
 * window coordinates, so it stays pinned to the button on any screen width.
 */
export const MenuButton = ({
  icon,
  accessibilityLabel,
  items,
  testID,
}: MenuButtonProps): JSX.Element => {
  const styles = useThemeStyle(getStyles);
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  // A tapped row's callback waits here until the menu is actually off screen.
  const pending = useMemo(() => createPendingMenuAction(), []);

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get("window").width;
      setMenuPos({ top: y + height + 4, right: screenWidth - (x + width) });
      setVisible(true);
    });
  };

  /** Dismissal without a choice — the backdrop or the hardware back button. */
  const cancelMenu = () => {
    pending.cancel();
    setVisible(false);
  };

  const selectItem = (item: MenuButtonItem) => {
    pending.select(item.onPress);
    setVisible(false);
    // iOS runs it from `onDismiss`, once the modal's view controller is really
    // gone — presenting a share sheet or a picker from a controller that is
    // still dismissing does nothing at all. Android's Modal never calls
    // `onDismiss`, so there the close and the action stay in one turn.
    if (Platform.OS !== "ios") {
      pending.flush();
    }
  };

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
        onPress={openMenu}
        hitSlop={8}
      >
        {icon}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={cancelMenu}
        onDismiss={pending.flush}
      >
        <Pressable style={styles.backdrop} onPress={cancelMenu}>
          <View
            style={[styles.menu, { top: menuPos.top, right: menuPos.right }]}
          >
            {items.map((item, i) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && styles.itemDivider,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => selectItem(item)}
              >
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.icon}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
