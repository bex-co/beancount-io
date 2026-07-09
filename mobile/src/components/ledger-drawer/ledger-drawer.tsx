import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useReactiveVar } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ledgerVar } from "@/common/vars";
import { useListLedgersQuery } from "@/generated-graphql/graphql";

const OPEN_DURATION_MS = 240;
const CLOSE_DURATION_MS = 200;
const SNAP_BACK_DURATION_MS = 150;
// Rightward swipes only open the drawer when they start in this strip along
// the content's left edge, so horizontal carousels and chips keep working.
const EDGE_HIT_WIDTH = 32;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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
      backgroundColor: theme.black10,
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
  children: React.ReactNode;
};

/** Monarch-style reveal drawer: the ledger menu is a stationary layer at the
 * bottom of everything and the app content slides right (full scale, shadowed
 * edge) to uncover it. No Modal — nothing ever overlays the app when closed.
 * Opens via a rightward swipe from the content's left edge (the content
 * follows the finger); closes via tap on the visible content sliver, leftward
 * swipe, or Android back. */
export function LedgerDrawer({
  open,
  onOpen,
  onClose,
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

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Gates the menu layer and the tap-to-close catcher; stays true through the
  // close animation so the reveal doesn't pop.
  const [visible, setVisible] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;
  // Each show/hide bumps the generation so a superseded hide's completion
  // callback can't unmount the wrong state.
  const generationRef = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;

  const hide = useCallback(() => {
    const generation = ++generationRef.current;
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      // Deliberately ignore `finished`: even an interrupted close must end
      // hidden so the tap catcher stops eating touches.
      if (generationRef.current === generation && !openRef.current) {
        setVisible(false);
      }
    });
  }, [progress]);

  const show = useCallback(() => {
    generationRef.current += 1;
    setVisible(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (open) {
      show();
    } else {
      hide();
    }
  }, [open, show, hide]);

  // Escape hatch: if the parent already flipped to closed but the catcher is
  // still up (a missed close), a repeat dismiss force-hides instead of
  // no-opping on unchanged parent state.
  const requestClose = useCallback(() => {
    if (openRef.current) {
      onClose();
    } else {
      hide();
    }
  }, [onClose, hide]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open, requestClose]);

  // Bidirectional content drag, Monarch-style. Closed: rightward drags that
  // start in the left-edge strip pull the drawer open. Open: leftward drags
  // anywhere push it shut. Either way the content tracks the finger; taps and
  // vertical scrolls never claim the responder.
  const dragStartRef = useRef(1);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => {
          const isHorizontal =
            Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
          if (!isHorizontal) {
            return false;
          }
          if (openRef.current) {
            return gesture.dx < -8;
          }
          return gesture.x0 <= EDGE_HIT_WIDTH && gesture.dx > 8;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          if (!openRef.current) {
            // Mount the menu layer so it's visible under the dragged content.
            generationRef.current += 1;
            setVisible(true);
          }
          progress.stopAnimation((value) => {
            dragStartRef.current = value;
          });
        },
        onPanResponderMove: (_evt, gesture) => {
          progress.setValue(
            clamp(dragStartRef.current + gesture.dx / drawerWidth, 0, 1),
          );
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (openRef.current) {
            const shouldClose =
              gesture.vx < -0.3 || gesture.dx < -drawerWidth / 3;
            if (shouldClose) {
              requestClose();
            } else {
              Animated.timing(progress, {
                toValue: 1,
                duration: SNAP_BACK_DURATION_MS,
                useNativeDriver: true,
              }).start();
            }
            return;
          }
          const shouldOpen = gesture.vx > 0.3 || gesture.dx > drawerWidth / 3;
          if (shouldOpen) {
            analytics.track("swipe_open_ledger_drawer", {});
            onOpen();
          } else {
            hide();
          }
        },
        onPanResponderTerminate: () => {
          if (openRef.current) {
            Animated.timing(progress, {
              toValue: 1,
              duration: SNAP_BACK_DURATION_MS,
              useNativeDriver: true,
            }).start();
          } else {
            hide();
          }
        },
      }),
    [progress, drawerWidth, requestClose, onOpen, hide],
  );

  // Memoized so re-renders mid-animation (query refreshes after a ledger
  // switch) don't swap the animated node out from under the native driver.
  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, drawerWidth],
      }),
    [progress, drawerWidth],
  );

  const handleSelect = (id: string) => {
    analytics.track("drawer_select_ledger", { ledgerId: id });
    if (id !== ledgerId) {
      ledgerVar(id);
    }
    requestClose();
  };

  const handleSettingsPress = () => {
    analytics.track("drawer_tap_settings", {});
    requestClose();
    router.push("/(app)/settings");
  };

return (
    <View style={styles.root}>
      {visible && (
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
              source={require("@/assets/images/icon96.png")}
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
            ) : ledgers.length === 0 ? (
              <View style={styles.stateContainer}>
                <Text style={styles.stateText}>{t("noEntries")}</Text>
              </View>
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={ledgers}
                keyExtractor={(item) => item.id}
                onRefresh={handleRefresh}
                refreshing={refreshing}
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
                          {item.fullName}
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
              <Ionicons
                name="settings-outline"
                size={22}
                color={theme.black60}
              />
              <Text style={styles.menuItemText}>{t("settings")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View
        style={[
          styles.content,
          visible && styles.contentOpen,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
        {visible && (
          <Pressable
            testID="ledger-drawer-backdrop"
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
          />
        )}
      </Animated.View>
    </View>
  );
}
