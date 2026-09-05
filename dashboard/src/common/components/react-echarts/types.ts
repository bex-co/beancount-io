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
}

export interface EChartsRef {
  getEchartsInstance: () => ECharts | undefined;
  getEchartsInstanceAsync: () => Promise<ECharts | undefined>;
}
