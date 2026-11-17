import type { EChartsOption } from "echarts";
import type { ECharts } from "echarts/core";
import type React from "react";

export interface EChartsProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
  showLoading?: boolean;
  loadingOption?: object;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  silent?: boolean;
  /** Override the automatic empty-series detection. */
  isEmpty?: boolean;
  /**
   * The reader toggled a legend item; receives every item's visibility, as
   * ECharts reports it. A caller that rebuilds its option can feed the choice
   * back through `legend.selected` instead of resetting it.
   */
  onLegendSelectChanged?: (selected: Record<string, boolean>) => void;
  /**
   * A click anywhere on the drawing surface, not only on a mark: a thin bar is
   * a hard target, so a caller can map the point to its category itself
   * (`chart.convertFromPixel`). Wired again whenever the chart is recreated.
   */
  onSurfaceClick?: (chart: ECharts, point: [number, number]) => void;
}

export interface EChartsRef {
  getEchartsInstance: () => ECharts | undefined;
  getEchartsInstanceAsync: () => Promise<ECharts | undefined>;
}
