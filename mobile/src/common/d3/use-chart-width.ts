import { useState } from "react";
import { LayoutChangeEvent, useWindowDimensions } from "react-native";

/**
 * The width a chart really has (w21/1004).
 *
 * The old `ScreenWidth` export was read once when its module loaded, so after
 * an iPad rotation or Split View resize every chart kept its launch width.
 * This measures the chart's own container through `onLayout` instead, and
 * falls back to the live window width less `fallbackPadding` on the first
 * frame — `useWindowDimensions` re-renders on rotation, so even the fallback
 * follows the window. Attach `onLayout` to the chart's root view and size the
 * SVG from `width`.
 */
export function useChartWidth(fallbackPadding: number): {
  width: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const windowWidth = useWindowDimensions().width;
  const [measured, setMeasured] = useState<number | null>(null);
  return {
    width: measured ?? windowWidth - fallbackPadding,
    onLayout: (event: LayoutChangeEvent) =>
      setMeasured(event.nativeEvent.layout.width),
  };
}
