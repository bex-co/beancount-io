import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Image,
  Linking,
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
import { type EdgeSwipeGestureRef } from "@/common/horizontal-swipe-owner";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle, useToast } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ledgerVar } from "@/common/vars";
import { getServerUrl } from "@/common/vars/server-url";
import { buildLedgerUrl } from "@/common/app-links/build-ledger-url";
import {
  copyLedgerUrl,
  shareLedgerUrl,
} from "@/common/app-links/ledger-url-actions";
import {
  isRtlLayout,
  layoutDirectionFactor,
  LEADING_TEXT_ALIGN,
} from "@/common/rtl";
import {
  useGetLedgerQuery,
  useListLedgersQuery,
} from "@/generated-graphql/graphql";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { clampProgress, settleTarget } from "./drawer-motion";
import { LoadingTile } from "@/components/loading-tile";
import { MenuButton } from "@/components/menu-button";
import { SearchBar } from "@/components/search-bar";
import {
  filterLedgers,
  getDrawerLedgers,
  groupLedgersByOwner,
} from "./drawer-ledgers";

const skeletonWidths = [140, 112, 160];

// A collection this size no longer fits the drawer on any phone, so finding a
// book means scrolling for it. Below the threshold the whole list is already
// on screen and a filter field would only take a row away from it.
const FILTER_FROM_LEDGERS = 10;

// Rightward swipes only open the drawer when they start in this strip along the
// content's left edge, so horizontal carousels and chips keep working. Enforced
// as the gesture's hit area: touches outside it never reach the drawer at all.
const EDGE_HIT_WIDTH = 32;
// Both direction-dependent gesture constants are resolved once, at module load,
// rather than per render. Layout direction cannot change without restarting the
// process — that is the whole reason `applyLayoutDirection` asks for a reload —
// so there is nothing to recompute. It also keeps `panGesture`'s `useMemo`
// honest: a fresh hit-slop object literal in its dependency array would rebuild
// the gesture and re-upload its three worklets to the UI runtime on *every*
// render of the drawer, including the render that lands mid-drag.
// Horizontal travel that commits a drag to the drawer, and the vertical travel
// that hands it back to whatever scrolls underneath. Gesture-handler applies
// both natively, before the drag ever reaches this component.
const ACTIVATE_OFFSET_X = 8;
const FAIL_OFFSET_Y = 12;
/** The edge strip an opening drag has to start in, on the leading side. */
const EDGE_HIT_SLOP = isRtlLayout()
  ? { right: 0, width: EDGE_HIT_WIDTH }
  : { left: 0, width: EDGE_HIT_WIDTH };
/** Inward is rightward in English and leftward in Persian. */
const ACTIVATE_OFFSET_SIGNED = ACTIVATE_OFFSET_X * layoutDirectionFactor();
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
    // Pinned to the leading edge, so it sits on the right in Persian.
    drawerLayer: {
      position: "absolute",
      top: 0,
      start: 0,
      bottom: 0,
      backgroundColor: theme.white,
    },
    content: {
      flex: 1,
      backgroundColor: theme.white,
    },
    contentOpen: {
      shadowColor: "#000",
      // Falls back toward the drawer the content slid away from, so the sign
      // follows the layout direction — `shadowOffset` is physical.
      shadowOffset: { width: -4 * layoutDirectionFactor(), height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      paddingHorizontal: gutter,
      paddingTop: space.sm,
      paddingBottom: space.sm,
    },
    brandLogo: { width: 28, height: 28, borderRadius: space.sm },
    brandText: {
      flex: 1,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm,
      paddingStart: gutter + space.md,
      paddingEnd: gutter,
      marginTop: space.sm,
      marginBottom: space.xs,
    },
    sectionLabel: {
      flexShrink: 1,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    newButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space.xs,
      minHeight: 44,
      paddingHorizontal: space.md,
      flexShrink: 1,
    },
    newButtonText: {
      flexShrink: 1,
      fontSize: fontSizes.md,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      color: theme.primary,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: space.md,
      // Carried by every row, transparent until selected, so marking one
      // doesn't nudge its title a pixel sideways.
      borderWidth: 1,
      borderColor: "transparent",
      marginBottom: space.xs,
      paddingEnd: space.xs,
    },
    // The active book is marked by the pill itself — tint plus an accent
    // outline — and a medium-weight title. No leading checkmark: it forced a
    // blank 28pt column onto every other row, which read as a checklist
    // waiting to be filled in rather than as a list with one thing selected.
    // The outline keeps the mark off the text, so the title stays at full
    // contrast instead of the 4.38:1 that accent-on-tint would have given it.
    listItemSelected: {
      backgroundColor: theme.controlSelected,
      borderColor: theme.primary,
    },
    selectButton: {
      flex: 1,
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    // The account a group of ledgers belongs to. Sticky, and opaque so rows
    // scroll under it rather than through it — which is also why the spacing
    // under the rule is padding and not a margin.
    ownerHeader: {
      backgroundColor: theme.white,
      paddingHorizontal: space.md,
      paddingTop: space.md,
      paddingBottom: space.xs,
    },
    // Typography from the app's other section headers (merchants, journal):
    // smaller, uppercase, letterspaced, muted. A header styled like this can
    // never be mistaken for one of the ledger titles under it, which are
    // full-size regular text — and the distinction costs the rows no shift.
    ownerHeaderText: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      textAlign: LEADING_TEXT_ALIGN,
    },
    ownerHeaderRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black20,
      marginTop: space.xs,
    },
    listItemName: {
      fontSize: fontSizes.lg,
      lineHeight: 24,
      fontWeight: fontWeights.regular,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
    },
    selectedName: { fontWeight: fontWeights.medium },
    skeletonRow: {
      minHeight: 48,
      justifyContent: "center",
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      marginBottom: space.xs,
    },
    stateContainer: {
      alignItems: "center",
      paddingVertical: space.xl,
      paddingHorizontal: space.sm,
      gap: space.md,
    },
    stateTitle: {
      fontSize: fontSizes.lg,
      lineHeight: 24,
      fontWeight: fontWeights.medium,
      color: theme.black,
      textAlign: "center",
    },
    stateText: {
      fontSize: fontSizes.md,
      lineHeight: 22,
      color: theme.black80,
      textAlign: "center",
    },
    emptyAction: {
      minHeight: 44,
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderRadius: space.md,
    },
    emptyActionText: {
      color: theme.white,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
    },
    filterField: { marginHorizontal: gutter, marginBottom: space.sm },
    ledgerList: { flex: 1 },
    ledgerListContent: { paddingHorizontal: gutter, paddingBottom: space.sm },
    // Everything that isn't a ledger lives here, pinned to the bottom of the
    // drawer. However many books the list holds, these stay one tap away.
    navSection: {
      marginHorizontal: gutter,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      paddingVertical: space.sm,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.md,
    },
    menuItemText: {
      flex: 1,
      fontSize: fontSizes.lg,
      lineHeight: 24,
      fontWeight: fontWeights.regular,
      color: theme.text01,
    },
  });

/** One row of the drawer's pinned bottom menu. */
function DrawerMenuRow({
  testID,
  icon,
  label,
  onPress,
}: {
  testID: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  return (
    <TouchableOpacity
      testID={testID}
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={theme.black80} />
      <Text style={styles.menuItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  const toast = useToast();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(340, windowWidth * 0.85);
  // The drawer's travel as a *signed* distance. `progress` stays 0→1 in both
  // directions — `drawer-motion.ts` is deliberately direction-free — and every
  // conversion between progress and physical pixels goes through this instead.
  // Gesture translations, velocities and `translateX` are all unmirrored screen
  // coordinates, so the sign has to live somewhere, and one constant is a much
  // smaller surface than five sprinkled `isRTL` checks.
  const signedDrawerWidth = drawerWidth * layoutDirectionFactor();
  const insets = useSafeAreaInsets();

  const ledgerId = useReactiveVar(ledgerVar);
  const { data, loading, error, refetch } = useListLedgersQuery();
  const ledgers = useMemo(() => data?.listLedgers ?? [], [data?.listLedgers]);
  const listedCurrent = ledgers.find(
    (ledger) => ledger.id === ledgerId || ledger.fullName === ledgerId,
  );
  const { data: selectedData } = useGetLedgerQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !open || !ledgerId || !!listedCurrent,
  });
  const drawerLedgers = useMemo(
    () => getDrawerLedgers(ledgers, ledgerId, selectedData?.getLedger),
    [ledgers, ledgerId, selectedData?.getLedger],
  );
  const currentLedger = drawerLedgers.find(
    (ledger) => ledger.id === ledgerId || ledger.fullName === ledgerId,
  );
  const [query, setQuery] = useState("");
  // Filtering is offered on the unfiltered count, so narrowing to one match
  // can't pull the field out from under the query that produced it.
  const showFilter = drawerLedgers.length >= FILTER_FROM_LEDGERS;
  const drawerSections = useMemo(
    () =>
      groupLedgersByOwner(
        showFilter ? filterLedgers(drawerLedgers, query) : drawerLedgers,
      ),
    [drawerLedgers, showFilter, query],
  );
  const filteredEmpty = drawerSections.length === 0 && query.trim() !== "";

  // A query belongs to the visit that typed it: reopening the drawer starts
  // from the whole collection rather than yesterday's search.
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      toast.showToast({ message: t("discoveryLoadError"), type: "error" });
    } finally {
      setRefreshing(false);
    }
  }, [refetch, t, toast]);

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
      onOpen();
    },
    [onOpen, onClose],
  );

  // Bidirectional content drag, Monarch-style. Closed: drags inward from the
  // leading-edge strip pull the drawer open. Open: drags back toward that edge
  // push it shut. Either way the content tracks the finger on the UI thread,
  // and gesture-handler keeps taps and vertical scrolls from ever reaching the
  // drawer. "Inward" is rightward in English and leftward in Persian, which is
  // what `signedDrawerWidth` and `activateOffsetX` carry.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .withRef(edgeSwipeRef)
        .hitSlop(open ? undefined : EDGE_HIT_SLOP)
        .activeOffsetX(open ? -ACTIVATE_OFFSET_SIGNED : ACTIVATE_OFFSET_SIGNED)
        .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
        .onStart((event) => {
          cancelAnimation(progress);
          dragOrigin.value =
            progress.value - event.translationX / signedDrawerWidth;
        })
        .onUpdate((event) => {
          progress.value = clampProgress(
            dragOrigin.value + event.translationX / signedDrawerWidth,
          );
        })
        .onEnd((event, success) => {
          // Interrupted drags settle to the nearer end with no fling.
          const velocity = success ? event.velocityX / signedDrawerWidth : 0;
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
      signedDrawerWidth,
      progress,
      dragOrigin,
      settledTarget,
      commitSettle,
    ],
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * signedDrawerWidth }],
  }));

  const handleSelect = (id: string) => {
    if (id !== ledgerId) {
      ledgerVar(id);
    }
    onClose();
  };

  const handleMerchantsPress = () => {
    onClose();
    router.push("/(app)/merchants");
  };

  const currentLedgerUrl = currentLedger
    ? buildLedgerUrl(
        { kind: "home", ledgerFullName: currentLedger.fullName },
        getServerUrl(),
      )
    : null;
  const linkDescription =
    currentLedger?.private === undefined
      ? undefined
      : `${t(currentLedger.private ? "discoveryPrivate" : "discoveryPublic")} · ${t(currentLedger.private ? "drawerPrivateLinkHint" : "drawerPublicLinkHint")}`;

  const handleShareLinkPress = () => {
    if (!currentLedgerUrl) return;
    onClose();
    shareLedgerUrl(currentLedgerUrl);
  };

  const handleCopyLinkPress = () => {
    if (!currentLedgerUrl) return;
    onClose();
    copyLedgerUrl(currentLedgerUrl, () => {
      toast.showToast({ message: t("copied"), type: "text" });
    });
  };

  const handleWebsitePress = () => {
    if (!currentLedgerUrl) return;
    onClose();
    void Linking.openURL(currentLedgerUrl);
  };

  const handleCreatePress = () => {
    onClose();
    router.push("/(app)/create-ledger");
  };

  const handleBrowsePress = () => {
    onClose();
    router.push("/(app)/ledger-selection");
  };

  const handleSettingsPress = () => {
    onClose();
    router.push("/(app)/settings");
  };

  return (
    <View style={styles.root}>
      {/* Always mounted: mounting the ledger list at the first frame of an
          opening drag is the one piece of work heavy enough to be felt. */}
      <View
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "yes" : "no-hide-descendants"}
        accessibilityViewIsModal={open}
        onAccessibilityEscape={onClose}
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
            accessible={false}
          />
          <Text
            style={styles.brandText}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            Beancount.io
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>
            {t("ledgers")}
          </Text>
          <TouchableOpacity
            testID="drawer-create-ledger-row"
            style={styles.newButton}
            onPress={handleCreatePress}
            accessibilityRole="button"
            accessibilityLabel={t("createLedgerDrawerRow")}
          >
            <Ionicons name="add" size={20} color={theme.primary} />
            <Text style={styles.newButtonText}>{t("drawerNew")}</Text>
          </TouchableOpacity>
        </View>

        {showFilter ? (
          <SearchBar
            testID="drawer-ledger-filter"
            style={styles.filterField}
            value={query}
            onChangeText={setQuery}
            placeholder={t("discoverySearch")}
          />
        ) : null}

        <SectionList
          style={styles.ledgerList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.ledgerListContent}
          alwaysBounceVertical
          stickySectionHeadersEnabled
          sections={drawerSections}
          extraData={ledgerId}
          keyExtractor={(item) => item.fullName}
          renderSectionHeader={({ section }) => (
            <View style={styles.ownerHeader}>
              <Text
                accessibilityRole="header"
                style={styles.ownerHeaderText}
                numberOfLines={1}
              >
                {section.owner}
              </Text>
              <View style={styles.ownerHeaderRule} />
            </View>
          )}
          refreshControl={
            <ThemedRefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            filteredEmpty ? (
              <View style={styles.stateContainer}>
                <Text style={styles.stateText}>{t("discoveryNoMatches")}</Text>
              </View>
            ) : loading ? (
              <View
                accessibilityLabel={t("discoveryLoading")}
                accessible
                accessibilityState={{ busy: true }}
              >
                {skeletonWidths.map((width) => (
                  <View key={width} style={styles.skeletonRow}>
                    <LoadingTile width={width} height={24} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.stateContainer}>
                <Text style={styles.stateTitle}>
                  {t(error ? "discoveryLoadError" : "createLedgerEmptyTitle")}
                </Text>
                {!error ? (
                  <Text style={styles.stateText}>
                    {t("createLedgerEmptyBody")}
                  </Text>
                ) : null}
                <TouchableOpacity
                  testID={error ? "drawer-retry" : "drawer-empty-create"}
                  style={styles.emptyAction}
                  onPress={error ? handleRefresh : handleCreatePress}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    error ? "discoveryRetry" : "createLedgerEmptyCreate",
                  )}
                >
                  <Text style={styles.emptyActionText}>
                    {t(error ? "discoveryRetry" : "createLedgerEmptyCreate")}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
          renderItem={({ item }) => {
            const isSelected =
              item.id === ledgerId || item.fullName === ledgerId;
            return (
              <View
                style={[styles.listItem, isSelected && styles.listItemSelected]}
              >
                <TouchableOpacity
                  testID={`ledger-drawer-item-${item.fullName}`}
                  style={styles.selectButton}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={item.fullName}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.listItemName,
                      isSelected && styles.selectedName,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
                {isSelected ? (
                  <MenuButton
                    testID="drawer-ledger-actions"
                    accessibilityLabel={t("drawerLedgerActions", {
                      name: item.name,
                    })}
                    title={item.fullName}
                    description={linkDescription}
                    icon={
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={22}
                        color={theme.primary}
                      />
                    }
                    items={[
                      {
                        testID: "drawer-share-link-row",
                        label: t("shareLink"),
                        icon: (
                          <Ionicons
                            name="share-outline"
                            size={20}
                            color={theme.black80}
                          />
                        ),
                        onPress: handleShareLinkPress,
                      },
                      {
                        testID: "drawer-copy-link-row",
                        label: t("copyLink"),
                        icon: (
                          <Ionicons
                            name="link-outline"
                            size={20}
                            color={theme.black80}
                          />
                        ),
                        onPress: handleCopyLinkPress,
                      },
                      {
                        testID: "drawer-website-row",
                        label: t("openInBrowser"),
                        icon: (
                          <Ionicons
                            name="open-outline"
                            size={20}
                            color={theme.black80}
                          />
                        ),
                        onPress: handleWebsitePress,
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          }}
        />

        {/* Pinned: a collection of any size scrolls above this, never over it. */}
        <View style={styles.navSection}>
          <DrawerMenuRow
            testID="drawer-discovery-row"
            icon="compass-outline"
            label={t("discoveryTitle")}
            onPress={handleBrowsePress}
          />
          {ledgerId ? (
            <DrawerMenuRow
              testID="drawer-merchants-row"
              icon="storefront-outline"
              label={t("merchants")}
              onPress={handleMerchantsPress}
            />
          ) : null}
          <DrawerMenuRow
            testID="drawer-settings-row"
            icon="settings-outline"
            label={t("settings")}
            onPress={handleSettingsPress}
          />
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          accessibilityElementsHidden={open}
          importantForAccessibility={open ? "no-hide-descendants" : "auto"}
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
