import Animated, {
  SharedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import { Rect } from "react-native-svg";
import { staggeredProgress } from "@/common/theme";
import { barRectAt } from "./bar-geometry";

// Module scope: building this per render would hand React a new component type
// each time and remount every bar.
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type AnimatedBarProps = {
  x: number;
  /** Final `y` of the bar — its top edge, in SVG coordinates. */
  y: number;
  width: number;
  /** Final height. Always positive; direction comes from `y` vs `baselineY`. */
  height: number;
  /** `y` of the value-zero gridline: the edge every bar grows out of. */
  baselineY: number;
  fill: string;
  rx?: number;
  /** Shared 0 → 1 sweep for the whole chart, from `useEntranceProgress`. */
  progress: SharedValue<number>;
  index: number;
  count: number;
};

/**
 * One bar of a bar chart, growing out of the zero baseline.
 *
 * Bars carry signed values, so "grow in" cannot mean "grow up from the bottom
 * of the plot" — a negative bar has to grow *downwards* from the zero line, or
 * the animation would tell the opposite of the story the chart tells. Direction
 * is taken from where the bar's final top edge sits relative to `baselineY`,
 * and is fixed for the whole animation, so a bar can never cross zero or flip
 * mid-flight. A bar clamped to the minimum visible height simply grows to that
 * height in its own direction.
 *
 * All bars in a chart share one `progress` value and derive their own offset
 * from it (see `staggeredProgress`), rather than each starting its own delayed
 * animation. That keeps the whole cascade inside one duration token regardless
 * of bar count, and means one cancellation stops all of them.
 */
export function AnimatedBar({
  x,
  y,
  width,
  height,
  baselineY,
  fill,
  rx,
  progress,
  index,
  count,
}: AnimatedBarProps) {
  const animatedProps = useAnimatedProps(() =>
    barRectAt(
      y,
      height,
      baselineY,
      staggeredProgress(progress.value, index, count),
    ),
  );

  return (
    <AnimatedRect
      x={x}
      width={width}
      fill={fill}
      rx={rx}
      // Numeric from the first frame so there is never an undefined→number
      // transition for the native side to drop. Both directions start flat on
      // the baseline; only the grown edge differs.
      y={baselineY}
      height={0}
      animatedProps={animatedProps}
    />
  );
}
