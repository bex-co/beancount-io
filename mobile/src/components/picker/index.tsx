import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedRef,
} from "react-native-reanimated";
import {
  durations,
  headerActionMaxFontSizeMultiplier,
  headerActionStyle,
  useTheme,
} from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { ColorTheme } from "@/types/theme-props";

const { height: screenHeight } = Dimensions.get("window");
import {
  ITEM_HEIGHT,
  selectedIndexForValue,
  wheelIndexAtOffset,
  wheelOffsetForValue,
  wheelTextMaxFontSizeMultiplier,
} from "./wheel-position";

const VISIBLE_ITEMS = 5;
const WHEEL_ITEM_FONT_SIZE = 18;
const WHEEL_SELECTED_FONT_SIZE = 20;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type PickerItem = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type PickerProps = {
  visible: boolean;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onCancel: () => void;
  selectedValue?: string;
  title?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
};

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.white,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 34, // Safe area for home indicator
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black40,
    },
    // Cancel and Done keep their natural width; the title takes what is left.
    // At the default text size this is pixel-identical to the previous
    // space-between row — equal gaps put the title's center exactly midway
    // between the two actions, which is where centering inside `flex: 1` puts
    // it too — but an enlarged title now shrinks instead of pushing Done out of
    // the sheet.
    headerAction: {
      flexShrink: 0,
    },
    cancelButton: {
      color: theme.black80,
      fontSize: 16,
    },
    doneButton: headerActionStyle(theme),
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: theme.text01,
    },
    wheelContainer: {
      height: WHEEL_HEIGHT,
      position: "relative",
      //   backgroundColor: "blue",
    },
    wheel: {
      height: WHEEL_HEIGHT,
      //   backgroundColor: "red",
    },
    wheelItem: {
      height: ITEM_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    wheelItemText: {
      fontSize: WHEEL_ITEM_FONT_SIZE,
      color: theme.text01,
    },
    selectedItemText: {
      fontSize: WHEEL_SELECTED_FONT_SIZE,
      fontWeight: "600",
      color: theme.primary,
    },
    selectionIndicator: {
      position: "absolute",
      top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      backgroundColor: theme.controlFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      borderRadius: 8,
      zIndex: -1,
    },
    fadeGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      zIndex: 1,
      opacity: 0.5,
      pointerEvents: "none",
    },
    fadeGradientTop: {
      top: 0,
      backgroundColor: theme.white,
    },
    fadeGradientBottom: {
      bottom: 0,
      backgroundColor: theme.white,
    },
    mask: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
  });

export const Picker: React.FC<PickerProps> = ({
  visible,
  items,
  onSelect,
  onCancel,
  selectedValue,
  title,
  confirmButtonText = "Done",
  cancelButtonText = "Cancel",
}) => {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);

  const translateY = useSharedValue(screenHeight);
  const overlayOpacity = useSharedValue(0);
  const scrollViewRef = useAnimatedRef<ScrollView>();

  const committedIndex = useMemo(
    () => selectedIndexForValue(items, selectedValue),
    [items, selectedValue],
  );
  const initialScrollY = useMemo(
    () => wheelOffsetForValue(items, selectedValue),
    [items, selectedValue],
  );

  // Which row reads as chosen. Driven by the *pending* wheel position — the one
  // `handleDone` will save — not by the committed prop: comparing each row to
  // `selectedValue` left the emphasis on the old option all the way through a
  // scroll, so the highlighted row and the row Confirm would save disagreed.
  const [pendingIndex, setPendingIndex] = useState(committedIndex);
  // The same number on the UI thread, so the scroll handler only crosses back to
  // JS when the centered row actually changes (a few times per drag, not 60/s).
  const reportedIndex = useSharedValue(committedIndex);

  // Seeded from the current selection, not 0. `handleDone` derives the
  // confirmed item from `scrollY`, but the wheel is positioned through the
  // ScrollView's `contentOffset`, which does not reliably emit an initial
  // scroll event — so an untouched picker used to confirm items[0] instead of
  // the option it was visibly showing.
  const scrollY = useSharedValue(initialScrollY);

  useEffect(() => {
    // Re-seed when the picker opens or its selection/item set changes, so a
    // reused picker never carries a stale offset into new choices. This does
    // not run while the user scrolls, so it cannot fight an in-progress drag.
    if (visible) {
      scrollY.value = initialScrollY;
      reportedIndex.value = committedIndex;
      setPendingIndex(committedIndex);
    }
  }, [visible, initialScrollY, scrollY, committedIndex, reportedIndex]);

  const showModal = useCallback(() => {
    overlayOpacity.value = withTiming(1, {
      duration: durations.base,
      easing: easeStandard,
    });
    translateY.value = withTiming(0, {
      duration: durations.base,
      easing: easeStandard,
    });
  }, [translateY, overlayOpacity]);

  const hideModal = useCallback(() => {
    overlayOpacity.value = withTiming(0, {
      duration: durations.base,
      easing: easeStandard,
    });
    translateY.value = withTiming(
      screenHeight,
      { duration: durations.base, easing: easeStandard },
      () => {
        runOnJS(onCancel)();
      },
    );
  }, [translateY, overlayOpacity, onCancel]);

  useEffect(() => {
    if (visible) {
      showModal();
    } else {
      hideModal();
    }
  }, [visible, showModal, hideModal]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const index = wheelIndexAtOffset(event.contentOffset.y, items.length);
      if (index !== reportedIndex.value) {
        reportedIndex.value = index;
        runOnJS(setPendingIndex)(index);
      }
    },
  });

  const handleDone = useCallback(() => {
    onSelect(items[wheelIndexAtOffset(scrollY.value, items.length)]);
    hideModal();
  }, [scrollY, items, onSelect, hideModal]);

  const handleCancel = useCallback(() => {
    hideModal();
  }, [hideModal]);

  const renderItem = useCallback(
    (item: PickerItem, index: number) => {
      const isSelected = index === pendingIndex;
      return (
        <View
          key={item.value}
          testID={`picker-item-${item.value || "empty"}`}
          style={styles.wheelItem}
        >
          {item.icon}
          <Text
            style={[
              styles.wheelItemText,
              isSelected && styles.selectedItemText,
            ]}
            // Row height is the single constant ITEM_HEIGHT (spacers, selection
            // indicator and snapToInterval all read it), so the label is capped
            // to what that row can hold rather than the row made variable.
            maxFontSizeMultiplier={wheelTextMaxFontSizeMultiplier(
              isSelected ? WHEEL_SELECTED_FONT_SIZE : WHEEL_ITEM_FONT_SIZE,
            )}
          >
            {item.label}
          </Text>
        </View>
      );
    },
    [
      styles.wheelItemText,
      styles.selectedItemText,
      styles.wheelItem,
      pendingIndex,
    ],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <Pressable style={styles.mask} onPress={handleCancel}></Pressable>
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.header}>
            <TouchableOpacity
              testID="picker-cancel"
              onPress={handleCancel}
              style={styles.headerAction}
            >
              <Text
                style={styles.cancelButton}
                numberOfLines={1}
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
              >
                {cancelButtonText}
              </Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              testID="picker-confirm"
              onPress={handleDone}
              style={styles.headerAction}
            >
              <Text
                style={styles.doneButton}
                numberOfLines={1}
                maxFontSizeMultiplier={headerActionMaxFontSizeMultiplier}
              >
                {confirmButtonText}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wheelContainer}>
            <View style={styles.selectionIndicator} />

            <AnimatedScrollView
              ref={scrollViewRef}
              style={styles.wheel}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              contentOffset={{ x: 0, y: initialScrollY }}
            >
              {/* Add padding items to center the first and last items */}
              <View style={{ height: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2 }} />
              {items.map(renderItem)}
              <View style={{ height: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2 }} />
            </AnimatedScrollView>

            {/* Fade gradients for better UX */}
            <View style={[styles.fadeGradient, styles.fadeGradientTop]} />
            <View style={[styles.fadeGradient, styles.fadeGradientBottom]} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
