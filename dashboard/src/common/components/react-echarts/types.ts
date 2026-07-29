import type { EChartsOption, ECharts } from "echarts";
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
