import { useCallback, useEffect, useRef } from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ColorTheme } from "@/types/theme-props";
import { haptics } from "@/common/haptics";
import {
  durations,
  fontSizes,
  fontWeights,
  gutter,
  space,
} from "@/common/theme";
import { easeStandard } from "@/common/theme/motion-easing";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

/**
 * A pill's key. `null` is a legal key so a row can carry an "All" sentinel
 * alongside its real options — the account picker's chips are exactly that,
 * and forking a second pill implementation for one nullable key would have
 * been the wrong trade.
 */
export type PillKey = string | null;

type PillOption<T extends PillKey> = {
  key: T;
  label: string;
};

type TimeRangePillsProps<T extends PillKey> = {
  value: T;
  options: PillOption<T>[];
  onChange: (key: T) => void;
  /**
   * Put the row in a horizontal scroller. Off by default: a time-range row is
   * a fixed set of short labels that should stay centred, while a row built
   * from ledger data (the account picker's roots) has no bound on its width.
   */
  scrollable?: boolean;
  /**
   * Fire a selection tick on change. On by default, because a time-range pill
   * changes a chart *in place* — the tick is the only confirmation the tap
   * registered before the animation starts. The account picker turns it off:
   * its chips filter a list that visibly re-renders underneath, and the picker
   * is a rapid browse surface where a tick per tap becomes noise.
   */
  haptics?: boolean;
};

type PillLayout = { x: number; y: number; width: number; height: number };

/**
 * `null` cannot index a layout record, and no real key can collide with a
 * string containing a NUL.
 */
const NULL_KEY = "\u0000null";
const layoutKey = (key: PillKey): string => key ?? NULL_KEY;

/** Half the gap between neighbouring pills; each carries it on both sides. */
const PILL_MARGIN = 3;
const PILL_PADDING_V = 6;

/**
 * Pill box metrics, exported so a loading skeleton can mirror the row instead
 * of restating its numbers and drifting apart from it. `PILL_HEIGHT` assumes
 * the label's default line box for `fontSizes.sm`.
 */
export const PILL_GAP = PILL_MARGIN * 2;
export const PILL_RADIUS = 14;
export const PILL_HEIGHT = PILL_PADDING_V * 2 + 16;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: space.sm,
    },
    // A scrolling row is left-aligned and gutter-inset instead of centred:
    // centring content wider than the viewport just clips both ends.
    scrollRow: {
      justifyContent: "flex-start",
      paddingHorizontal: gutter,
      paddingBottom: space.sm,
    },
    // A horizontal ScrollView defaults to grow+shrink, so an overflowing
    // column would squeeze this band until it clipped its own pills. The
    // surrounding content owns the free space instead.
    scrollView: {
      flexGrow: 0,
      flexShrink: 0,
    },
    // Pill internals are a self-contained segmented control; these compact
    // metrics are intentional and not part of the shared spacing scale.
    pill: {
      paddingHorizontal: 10,
      paddingVertical: PILL_PADDING_V,
      borderRadius: PILL_RADIUS,
      marginHorizontal: PILL_MARGIN,
    },
    // The selected pill's fill is the sliding indicator below, not a style on
    // the pill itself — otherwise the fill would teleport while the indicator
    // travelled.
    //
    // `left: 0` is load-bearing, and deliberately physical rather than
    // `start: 0`: `onLayout` reports x from the container's left edge and
    // `translateX` is unmirrored, in right-to-left layout as in left-to-right,
    // so the origin has to be the same edge the measurement came from.
    //
    // Without a horizontal inset Yoga falls back to
    // the static position, which in this `justifyContent: "center"` row is the
    // row's centre — the measured `translateX` would then be added to a centred
    // origin and park the fill off the right end of the pills.
    indicator: {
      position: "absolute",
      left: 0,
      borderRadius: PILL_RADIUS,
      backgroundColor: theme.primary,
    },
    label: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    labelActive: {
      color: theme.white,
    },
  });

/**
 * Robinhood-style row of pills (a small segmented control). Generic over the
 * option key so it can drive any chart's range selection — and, with
 * `scrollable`, any data-driven filter row.
 *
 * The selected pill is marked by a single indicator that slides between
 * positions rather than a background that switches pills instantly. Positions
 * are measured with `onLayout` instead of assumed: the labels are localized and
 * "YTD"/"ALL" are different widths in different locales, so an even-split
 * calculation would drift off the pills in most of the app's 13 languages.
 */
export function TimeRangePills<T extends PillKey>({
  value,
  options,
  onChange,
  scrollable = false,
  haptics: hapticsEnabled = true,
}: TimeRangePillsProps<T>): JSX.Element {
  const styles = useThemeStyle(getStyles);

  const layouts = useRef<Record<string, PillLayout>>({});
  // False until the indicator has been placed at least once, so the first
  // placement snaps into position instead of sliding in from the left edge.
  const placedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef(0);
  const revealedRef = useRef(false);

  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const y = useSharedValue(0);
  const height = useSharedValue(0);
  // Hidden until measured — otherwise a zero-width pill flashes at the origin
  // on first mount.
  const opacity = useSharedValue(0);

  const moveTo = useCallback(
    (key: T, animate: boolean) => {
      const layout = layouts.current[layoutKey(key)];
      if (!layout) {
        return;
      }
      // Vertical metrics never differ between pills, so they are set outright.
      y.value = layout.y;
      height.value = layout.height;
      opacity.value = 1;

      if (!animate) {
        x.value = layout.x;
        width.value = layout.width;
        placedRef.current = true;
        return;
      }
      const config = { duration: durations.fast, easing: easeStandard };
      x.value = withTiming(layout.x, config);
      width.value = withTiming(layout.width, config);
    },
    [x, y, width, height, opacity],
  );

  // Covers a selection driven from outside (a parent resetting the range), and
  // the first placement once the active pill has been measured.
  useEffect(() => {
    moveTo(value, placedRef.current);
  }, [value, moveTo]);

  /**
   * In a scrolling row the selection can start past the right edge — the
   * indicator lands correctly on content nobody can see. Bring it into view
   * once, on first paint.
   *
   * Called from both `onLayout` handlers because their order is not
   * guaranteed; it no-ops until it has the pill's box *and* the viewport
   * width, so whichever arrives second does the work. Scrolling an
   * already-visible pill to the left edge would be a visible jolt on open, so
   * the overflow check is what gates it, not the mere fact of being scrollable.
   */
  const revealSelected = useCallback(() => {
    const layout = layouts.current[layoutKey(value)];
    const viewport = viewportRef.current;
    if (revealedRef.current || !layout || viewport <= 0) {
      return;
    }
    revealedRef.current = true;
    if (layout.x + layout.width <= viewport) {
      return;
    }
    scrollRef.current?.scrollTo({
      x: Math.max(0, layout.x - gutter),
      animated: false,
    });
  }, [value]);

  const handleLayout = (key: T) => (event: LayoutChangeEvent) => {
    layouts.current[layoutKey(key)] = event.nativeEvent.layout;
    if (key === value) {
      moveTo(key, placedRef.current);
      revealSelected();
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    top: y.value,
    transform: [{ translateX: x.value }],
  }));

  const content = (
    <>
      {/* First child so it paints behind the labels. */}
      <Animated.View
        style={[styles.indicator, indicatorStyle]}
        pointerEvents="none"
      />
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={layoutKey(option.key)}
            style={styles.pill}
            onLayout={handleLayout(option.key)}
            onPress={() => {
              if (!active) {
                if (hapticsEnabled) {
                  haptics.selection();
                }
                // Move on press rather than waiting for `value` to come back
                // down: the indicator should already be travelling by the time
                // the parent re-renders.
                moveTo(option.key, true);
              }
              onChange(option.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  if (!scrollable) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scrollView}
      onLayout={(event) => {
        viewportRef.current = event.nativeEvent.layout.width;
        revealSelected();
      }}
      // The indicator is `position: absolute` against this content view, so
      // the `onLayout` x it reads and the origin it paints from are the same
      // box — the invariant the non-scrolling row relies on too.
      contentContainerStyle={[styles.row, styles.scrollRow]}
    >
      {content}
    </ScrollView>
  );
}
