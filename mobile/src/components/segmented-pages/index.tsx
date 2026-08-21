import { ReactNode, useCallback, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { fontSizes, fontWeights } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

interface PageSelectedEvent {
  position: number;
}

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    // Tabs + optional trailing (e.g. "See all") share one row so the door sits
    // with the labels instead of on an empty header above them.
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    // The tab strip scrolls horizontally: at 16px three labels can outrun the
    // screen in longer locales (de: "Net Worth" + "Vermögen" +
    // "Verbindlichkeiten"), and truncating a tab name reads worse than a nudge.
    tabsScroll: {
      flex: 1,
    },
    tabsContent: {
      alignItems: "center",
      paddingStart: 16,
      // Trailing owns the end inset when present; keep 16 when it is not.
      paddingEnd: 16,
    },
    tabsContentWithTrailing: {
      paddingEnd: 8,
    },
    trailing: {
      flexShrink: 0,
      justifyContent: "center",
      paddingEnd: 16,
      paddingStart: 4,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginEnd: 4,
    },
    tabActive: {
      backgroundColor: theme.black20,
    },
    label: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.regular,
      color: theme.black80,
    },
    labelActive: {
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    pager: {
      width: "100%",
    },
  });

type SegmentedPagesProps = {
  /** Tab labels, one per page (same length and order as `pages`). */
  tabs: string[];
  /** The pages to render, one per tab. */
  pages: ReactNode[];
  /** Fixed height for the pager (PagerView needs a bounded height). */
  height: number;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
  /**
   * Optional control pinned to the trailing edge of the tab row (Home's
   * account-charts "See all"). Stays visible while the tabs scroll.
   */
  trailing?: ReactNode;
};

/**
 * Pages switched by a segmented tab strip at the top — tap only, no swiping.
 * Horizontal gestures are left entirely to the page content (the net-worth
 * chart's scrub), which is why the dashboard card uses this over a swipeable
 * carousel.
 */
export function SegmentedPages({
  tabs,
  pages,
  height,
  initialIndex = 0,
  onPageChange,
  trailing,
}: SegmentedPagesProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const swipeOwner = useHorizontalSwipeOwnerGesture();
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handlePageSelected = useCallback(
    (event: NativeSyntheticEvent<PageSelectedEvent>) => {
      const index = event.nativeEvent.position;
      setActiveIndex(index);
      onPageChange?.(index);
    },
    [onPageChange],
  );

  // Highlight moves on touch (setPage's onPageSelected lands a frame later),
  // but onPageChange fires only from onPageSelected so a switch reports once.
  const handleTabPress = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setActiveIndex(index);
      pagerRef.current?.setPage(index);
    },
    [activeIndex],
  );

  return (
    <View>
      {/* Owner marker: a horizontal drag across the tab strip scrolls it,
          never opens the ledger drawer's edge swipe. */}
      <View style={styles.headerRow}>
        <GestureDetector gesture={swipeOwner}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={[
              styles.tabsContent,
              trailing != null && styles.tabsContentWithTrailing,
            ]}
            accessibilityRole="tablist"
          >
            {tabs.map((tab, index) => {
              const active = index === activeIndex;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => handleTabPress(index)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GestureDetector>
        {trailing != null ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
      </View>
      <PagerView
        ref={pagerRef}
        style={[styles.pager, { height }]}
        initialPage={initialIndex}
        onPageSelected={handlePageSelected}
        scrollEnabled={false}
      >
        {pages.map((page, index) => (
          <View key={index} style={{ flex: 1 }}>
            {page}
          </View>
        ))}
      </PagerView>
    </View>
  );
}
