import { ReactNode, useCallback, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

interface PageSelectedEvent {
  position: number;
}

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    pager: {
      width: "100%",
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 12,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    activeDot: {
      backgroundColor: theme.primary,
    },
    inactiveDot: {
      backgroundColor: theme.black40,
    },
  });

type PagedCarouselProps = {
  /** The pages to render, one per horizontal swipe. */
  pages: ReactNode[];
  /** Fixed height for the pager (PagerView needs a bounded height). */
  height: number;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
  /**
   * Enable horizontal swiping. Set false to temporarily lock the pager — e.g.
   * while a page is capturing a horizontal drag (chart scrubbing).
   */
  scrollEnabled?: boolean;
};

/**
 * Horizontally swipeable carousel with a tappable dot page indicator.
 * Generic and self-contained — reused by the account-charts dashboard card.
 */
export function PagedCarousel({
  pages,
  height,
  initialIndex = 0,
  onPageChange,
  scrollEnabled = true,
}: PagedCarouselProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
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

  // setPage triggers onPageSelected, which updates the active index and fires
  // onPageChange — so we don't do it here (that would double-fire onPageChange).
  const goToPage = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
  }, []);

  return (
    <View>
      <PagerView
        ref={pagerRef}
        style={[styles.pager, { height }]}
        initialPage={initialIndex}
        onPageSelected={handlePageSelected}
        scrollEnabled={scrollEnabled}
      >
        {pages.map((page, index) => (
          <View key={index} style={{ flex: 1 }}>
            {page}
          </View>
        ))}
      </PagerView>
      {pages.length > 1 && (
        <View style={styles.dotsRow}>
          {pages.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToPage(index)}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View
                style={[
                  styles.dot,
                  index === activeIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
