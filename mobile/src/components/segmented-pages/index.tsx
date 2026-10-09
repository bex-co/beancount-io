import { ReactNode, useCallback, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import { useHorizontalSwipeOwnerGesture } from "@/common/horizontal-swipe-owner";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import {
  tabStripHasMoreAfter,
  trailingNeedsOwnRow,
} from "./tab-strip-overflow";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

/** Opacity steps of the trailing fade, from the labels out to the edge. */
const FADE_STEPS = [0.2, 0.45, 0.7, 0.95];

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
    // Enlarged or long translated text: the action takes its own row above
    // the tabs rather than squeezing them to a sliver.
    headerRowStacked: {
      flexDirection: "column-reverse",
      alignItems: "stretch",
    },
    // The tab strip scrolls horizontally: at 16px three labels can outrun the
    // screen in longer locales (de: "Net Worth" + "Vermögen" +
    // "Verbindlichkeiten"), and truncating a tab name reads worse than a nudge.
    tabsScroll: {
      flex: 1,
    },
    tabsWrap: {
      flex: 1,
    },
    tabsWrapStacked: {
      flex: 0,
    },
    // A few solid steps rather than a gradient (no gradient dependency): enough
    // to read as "the row continues" at the trailing edge.
    tabsFade: {
      position: "absolute",
      top: 0,
      bottom: 0,
      end: 0,
      width: 28,
      flexDirection: "row",
    },
    tabsFadeStep: {
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
    trailingStacked: {
      alignSelf: "flex-end",
      marginBottom: 8,
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
  /**
   * Rendered between the tab row and the pager, outside both, for the page
   * that is showing. Home's status line lives here because a press on it
   * inside a chart page never fired, while the chart's scrub still did.
   */
  header?: (activeIndex: number) => ReactNode;
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
  header,
}: SegmentedPagesProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const swipeOwner = useHorizontalSwipeOwnerGesture();
  const [strip, setStrip] = useState({
    contentWidth: 0,
    viewportWidth: 0,
    offset: 0,
  });
  // Keys the labels so a live text-size change remeasures them, and with them
  // the widths that decide whether the trailing action needs its own row.
  const { fontScale } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const [trailingWidth, setTrailingWidth] = useState(0);
  const [tabWidths, setTabWidths] = useState<Record<number, number>>({});
  const stacked =
    trailing != null &&
    trailingNeedsOwnRow({
      rowWidth,
      trailingWidth,
      tabsContentWidth: strip.contentWidth,
      widestTabWidth: Math.max(0, ...Object.values(tabWidths)),
    });
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
      <View
        style={[styles.headerRow, stacked && styles.headerRowStacked]}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        <View style={[styles.tabsWrap, stacked && styles.tabsWrapStacked]}>
          <GestureDetector gesture={swipeOwner}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              onLayout={(event) => {
                const viewportWidth = event.nativeEvent.layout.width;
                setStrip((prev) => ({ ...prev, viewportWidth }));
              }}
              onContentSizeChange={(contentWidth) =>
                setStrip((prev) => ({ ...prev, contentWidth }))
              }
              onScroll={(event) => {
                const offset = event.nativeEvent.contentOffset.x;
                setStrip((prev) =>
                  Math.abs(prev.offset - offset) < 1
                    ? prev
                    : { ...prev, offset },
                );
              }}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.tabsContent,
                trailing != null && !stacked && styles.tabsContentWithTrailing,
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
                    onLayout={(event) => {
                      const width = event.nativeEvent.layout.width;
                      setTabWidths((previous) =>
                        previous[index] === width
                          ? previous
                          : { ...previous, [index]: width },
                      );
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      key={fontScale}
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
          {tabStripHasMoreAfter(strip) ? (
            <View style={styles.tabsFade} pointerEvents="none">
              {FADE_STEPS.map((opacity) => (
                <View
                  key={opacity}
                  style={[
                    styles.tabsFadeStep,
                    { opacity, backgroundColor: theme.controlFill },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
        {trailing != null ? (
          <View
            style={[styles.trailing, stacked && styles.trailingStacked]}
            onLayout={(event) =>
              setTrailingWidth(event.nativeEvent.layout.width)
            }
          >
            {trailing}
          </View>
        ) : null}
      </View>
      {header?.(activeIndex)}
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
