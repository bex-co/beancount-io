import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createPendingMenuAction } from "./pending-action";
import { fontSizes, fontWeights } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { ColorTheme } from "@/types/theme-props";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";

export type MenuButtonItem = {
  label: string;
  testID?: string;
  /** Trailing glyph, drawn at the row's right edge. */
  icon?: ReactNode;
  onPress: () => void;
};

type MenuButtonProps = {
  /** The trigger glyph; the button around it is a 44pt hit target. */
  icon: ReactNode;
  accessibilityLabel: string;
  items: MenuButtonItem[];
  title?: string;
  description?: string;
  testID?: string;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    trigger: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 44,
      minHeight: 44,
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
    header: {
      padding: 16,
      gap: 8,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
    },
    description: {
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
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
  title,
  description,
  testID,
}: MenuButtonProps): JSX.Element => {
  const styles = useThemeStyle(getStyles);
  const anchorRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({
    top: 0,
    right: 0,
    width: 240,
    maxHeight: 400,
  });
  // A tapped row's callback waits here until the menu is actually off screen.
  const pending = useMemo(() => createPendingMenuAction(), []);

  const openMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get("window");
      const menuWidth = Math.min(title ? 300 : 260, screen.width - 32);
      const top = Math.min(y + height + 4, screen.height / 2);
      setMenuPos({
        top,
        right: Math.max(
          16,
          Math.min(screen.width - (x + width), screen.width - menuWidth - 16),
        ),
        width: menuWidth,
        maxHeight: screen.height - top - 48,
      });
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
        accessibilityState={{ expanded: visible }}
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
        <View style={styles.backdrop} accessibilityViewIsModal>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessible={false}
            importantForAccessibility="no"
            onPress={cancelMenu}
          />
          <View
            style={[styles.menu, menuPos]}
            onAccessibilityEscape={cancelMenu}
          >
            <ScrollView bounces={false}>
              {title ? (
                <View style={styles.header}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {title}
                  </Text>
                  {description ? (
                    <Text style={styles.description}>{description}</Text>
                  ) : null}
                </View>
              ) : null}
              {items.map((item, i) => (
                <Pressable
                  key={item.label}
                  testID={item.testID}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.item,
                    (i > 0 || !!title) && styles.itemDivider,
                    pressed && styles.itemPressed,
                  ]}
                  onPress={() => selectItem(item)}
                >
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {item.icon}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
