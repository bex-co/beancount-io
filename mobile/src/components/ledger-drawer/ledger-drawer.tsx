import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  runOnUI,
  SnappySpringConfig,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useReactiveVar } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { type EdgeSwipeGestureRef } from "@/common/horizontal-swipe-owner";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ledgerVar } from "@/common/vars";
import { useListLedgersQuery } from "@/generated-graphql/graphql";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { clampProgress, settleTarget } from "./drawer-motion";
import { groupLedgersByOwner } from "./group-ledgers-by-owner";

// Rightward swipes only open the drawer when they start in this strip along the
// content's left edge, so horizontal carousels and chips keep working. Enforced
// as the gesture's hit area: touches outside it never reach the drawer at all.
const EDGE_HIT_WIDTH = 32;
// Horizontal travel that commits a drag to the drawer, and the vertical travel
// that hands it back to whatever scrolls underneath. Gesture-handler applies
// both natively, before the drag ever reaches this component.
const ACTIVATE_OFFSET_X = 8;
const FAIL_OFFSET_Y = 12;
// Reanimated's snappy preset: fast, and already overshoot-clamped, which a
// drawer needs — bouncing past fully open would expose the root view beyond the
// menu's right edge. The release velocity is layered on at the call site so a
// flick keeps the speed the finger gave it.
const SETTLE_SPRING = SnappySpringConfig;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // Stationary menu layer beneath the app content (Monarch-style reveal).
    drawerLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      backgroundColor: theme.white,
    },
    content: {
      flex: 1,
      backgroundColor: theme.white,
    },
    contentOpen: {
      shadowColor: "#000",
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    brandLogo: {
      width: 32,
      height: 32,
      borderRadius: 8,
    },
    brandText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text01,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.black60,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    listItemSelected: {
      backgroundColor: theme.controlSelected,
    },
    listItemContent: {
      flex: 1,
    },
    listItemName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.black,
    },
    listItemDescription: {
      marginTop: 2,
      fontSize: 13,
      color: theme.black60,
    },
    ownerHeader: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
      fontSize: 13,
      fontWeight: "600",
      color: theme.black60,
      backgroundColor: theme.white,
    },
    stateContainer: {
      alignItems: "center",
      paddingVertical: 40,
    },
    stateText: {
      fontSize: 14,
      color: theme.black60,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    ledgerListArea: {
      flex: 1,
    },
    // Fills the frame when the ledger list is empty, so the "no entries" state
    // sits inside the scrollable list and stays pull-to-refreshable.
    ledgerListContent: {
      flexGrow: 1,
    },
    menuSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      paddingTop: 4,
      paddingBottom: 4,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    menuItemText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text01,
    },
  });

type LedgerDrawerProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Filled with the edge-swipe gesture so swipe owners can block it. */
  edgeSwipeRef: EdgeSwipeGestureRef;
  children: React.ReactNode;
};

/** Monarch-style reveal drawer: the ledger menu is a stationary layer at the
 * bottom of everything and the app content slides right (full scale, shadowed
 * edge) to uncover it. No Modal — nothing ever overlays the app when closed.
 * Opens via a rightward swipe from the content's left edge (the content
 * follows the finger); closes via tap on the visible content sliver, leftward
 * swipe, or Android back.
 *
 * Position lives in a shared value driven on the UI thread, so a drag stays
 * smooth no matter what the JS thread is doing and the gesture can read where
 * the drawer is the instant a finger lands. */
export function LedgerDrawer({
  open,
  onOpen,
  onClose,
  edgeSwipeRef,
  children,
}: LedgerDrawerProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(340, windowWidth * 0.85);
  const insets = useSafeAreaInsets();

  const ledgerId = useReactiveVar(ledgerVar);
  const { data, loading, refetch } = useListLedgersQuery();
  const ledgers = useMemo(() => data?.listLedgers ?? [], [data?.listLedgers]);
  const ledgerSections = useMemo(() => groupLedgersByOwner(ledgers), [ledgers]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // The one source of truth for where the drawer is: 0 = closed, 1 = open.
  const progress = useSharedValue(open ? 1 : 0);
  // Where `progress` is currently headed. The gesture settles the drawer itself
  // and tells React afterwards, so the `open` effect below uses this to skip
  // re-animating towards a destination the UI thread already picked.
  const settledTarget = useSharedValue(open ? 1 : 0);
  // Progress the drag started from, back-dated by the travel that activating the
  // gesture already consumed so the content doesn't jump on the first frame.
  const dragOrigin = useSharedValue(0);

  // Gates the tap-to-close catcher and the content's edge shadow. Derived from
  // the animation rather than from `open`, so it can't drift out of sync with
  // what's on screen — a drift the previous implementation had to paper over
  // with a generation counter and a force-hide escape hatch.
  const [revealed, setRevealed] = useState(open);
  useAnimatedReaction(
    () => progress.value > 0,
    (isRevealed, wasRevealed) => {
      if (isRevealed !== wasRevealed) {
        runOnJS(setRevealed)(isRevealed);
      }
    },
  );

  useEffect(() => {
    const target: 0 | 1 = open ? 1 : 0;
    runOnUI(() => {
      if (settledTarget.value === target) {
        // The gesture already committed to this and is animating there with the
        // user's release velocity; restarting would flatten that.
        return;
      }
      settledTarget.value = target;
      progress.value = withSpring(target, SETTLE_SPRING);
    })();
  }, [open, progress, settledTarget]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open, onClose]);

  // Called from the gesture once the UI thread has picked where the drawer
  // settles: React state follows the animation instead of gating it.
  const commitSettle = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onClose();
        return;
      }
      if (!open) {
        analytics.track("swipe_open_ledger_drawer", {});
      }
      onOpen();
    },
    [open, onOpen, onClose],
  );

  // Bidirectional content drag, Monarch-style. Closed: rightward drags that
  // start in the left-edge strip pull the drawer open. Open: leftward drags
  // anywhere on the content push it shut. Either way the content tracks the
  // finger on the UI thread, and gesture-handler keeps taps and vertical
  // scrolls from ever reaching the drawer.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .withRef(edgeSwipeRef)
        .hitSlop(open ? undefined : { left: 0, width: EDGE_HIT_WIDTH })
        .activeOffsetX(open ? -ACTIVATE_OFFSET_X : ACTIVATE_OFFSET_X)
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onStart((event) => {
          cancelAnimation(progress);
          dragOrigin.value = progress.value - event.translationX / drawerWidth;
        })
        .onUpdate((event) => {
          progress.value = clampProgress(
            dragOrigin.value + event.translationX / drawerWidth,
          );
        })
        .onEnd((event, success) => {
          // Interrupted drags settle to the nearer end with no fling.
          const velocity = success ? event.velocityX / drawerWidth : 0;
          const target = settleTarget(progress.value, velocity);
          settledTarget.value = target;
          progress.value = withSpring(target, {
            ...SETTLE_SPRING,
            velocity,
          });
          runOnJS(commitSettle)(target === 1);
        }),
    [
      edgeSwipeRef,
      open,
      drawerWidth,
      progress,
      dragOrigin,
      settledTarget,
      commitSettle,
    ],
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * drawerWidth }],
  }));

  const handleSelect = (id: string) => {
    analytics.track("drawer_select_ledger", { ledgerId: id });
    if (id !== ledgerId) {
      ledgerVar(id);
    }
    onClose();
  };

  const handleSettingsPress = () => {
    analytics.track("drawer_tap_settings", {});
    onClose();
    router.push("/(app)/settings");
  };

  return (
    <View style={styles.root}>
      {/* Always mounted: mounting the ledger list at the first frame of an
          opening drag is the one piece of work heavy enough to be felt. */}
      <View
        style={[
          styles.drawerLayer,
          {
            width: drawerWidth,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.brandLogo}
          />
          <Text style={styles.brandText}>Beancount.io</Text>
        </View>
        <Text style={styles.sectionLabel}>{t("ledgers")}</Text>

        <View style={styles.ledgerListArea}>
          {loading && ledgers.length === 0 ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            // Always render the list past first load — even with no ledgers — so
            // the empty state lives inside a pull-to-refreshable SectionList rather
            // than a static View that can't be refreshed.
            <SectionList
              style={{ flex: 1 }}
              contentContainerStyle={styles.ledgerListContent}
              alwaysBounceVertical
              sections={ledgerSections}
              keyExtractor={(item) => item.id}
              refreshControl={
                <ThemedRefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                <View style={styles.stateContainer}>
                  <Text style={styles.stateText}>{t("noEntries")}</Text>
                </View>
              }
              renderSectionHeader={({ section }) => (
                <Text style={styles.ownerHeader} numberOfLines={1}>
                  {section.owner}
                </Text>
              )}
              renderItem={({ item }) => {
                const isSelected = item.id === ledgerId;
                return (
                  <TouchableOpacity
                    testID={`ledger-drawer-item-${item.fullName}`}
                    style={[
                      styles.listItem,
                      isSelected && styles.listItemSelected,
                    ]}
                    onPress={() => handleSelect(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text
                          style={styles.listItemDescription}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            testID="drawer-settings-row"
            style={styles.menuItem}
            onPress={handleSettingsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color={theme.black60} />
            <Text style={styles.menuItemText}>{t("settings")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.content, revealed && styles.contentOpen, contentStyle]}
        >
          {children}
          {revealed && (
            <Pressable
              testID="ledger-drawer-backdrop"
              style={StyleSheet.absoluteFill}
              onPress={onClose}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
