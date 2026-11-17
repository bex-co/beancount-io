import { registerTheme, use as registerCharts } from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
  TreemapChart,
} from "echarts/charts";
import {
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { CHART_PALETTE, toCategoricalOrder } from "@/common/lib/chart/color";
import { TOOLTIP_SURFACE_CSS } from "@/common/lib/chart/tooltip";

// Shared by reports, BQL, budget, and commodity charts. Legend includes plain
// and scroll legends; Tooltip installs the axis-pointer support used by grids.
// MarkPoint draws a series' own marked point (the Overview's selected month
// on the net worth line); without it ECharts drops `markPoint` silently.
registerCharts([
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
  TreemapChart,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
  LabelLayout,
  CanvasRenderer,
]);

/**
 * One chart language for the whole app, in both appearances: the --chart-N
 * series in categorical order (so a category keeps its hue when the theme
 * flips), the app's sans-serif, quiet axes, and the popover surface for
 * tooltips. Charts that color by meaning (gain/loss, money in/out, Sankey
 * roles) still pass their own colors; everything else inherits these.
 */
// The app's own face (style.css --font-sans), then the same fallbacks.
const FONT_FAMILY =
  '"Geist Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

type ChartChrome = {
  text: string;
  strongText: string;
  legendText: string;
  axisLine: string;
  splitLine: string;
  tooltipBackground: string;
  tooltipBorder: string;
  inactiveLegend: string;
};

function appChartTheme(palette: readonly string[], chrome: ChartChrome) {
  const axis = {
    axisLine: { lineStyle: { color: chrome.axisLine } },
    axisTick: { show: false },
    axisLabel: { color: chrome.text, fontSize: 11 },
    splitLine: { lineStyle: { color: chrome.splitLine } },
  };
  return {
    color: toCategoricalOrder(palette),
    backgroundColor: "transparent",
    textStyle: { color: chrome.text, fontFamily: FONT_FAMILY },
    title: {
      textStyle: { color: chrome.strongText },
      subtextStyle: { color: chrome.text },
    },
    legend: {
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: chrome.legendText, fontSize: 12 },
      // Clearly lighter than a selected entry, yet readable: these legends
      // are operable, and an unselected unit is one click from returning.
      inactiveColor: chrome.inactiveLegend,
    },
    tooltip: {
      backgroundColor: chrome.tooltipBackground,
      borderColor: chrome.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: chrome.strongText, fontSize: 12 },
      extraCssText: TOOLTIP_SURFACE_CSS,
    },
    categoryAxis: axis,
    valueAxis: { ...axis, axisLine: { show: false } },
    bar: { itemStyle: { borderRadius: [3, 3, 0, 0] } },
  };
}

registerTheme(
  "app-dark",
  Object.assign(
    { darkMode: true },
    appChartTheme(CHART_PALETTE.dark, {
      text: "#a1a398",
      strongText: "#ebebe7",
      legendText: "#c9cbc1",
      axisLine: "#333732",
      splitLine: "#262a26",
      tooltipBackground: "#131713",
      tooltipBorder: "#333732",
      inactiveLegend: "#7d8076",
    }),
  ),
);

registerTheme(
  "app-light",
  appChartTheme(CHART_PALETTE.light, {
    text: "#646973",
    strongText: "#161a12",
    legendText: "#3f433b",
    axisLine: "#e0e0dd",
    splitLine: "#efefec",
    tooltipBackground: "#ffffff",
    tooltipBorder: "#e0e0dd",
    // 5.51:1 on white, and clearly lighter than a selected entry (#3f433b).
    inactiveLegend: "#646973",
  }),
);

export { init } from "echarts/core";

/** Theme name passed to `init` when the app appearance is dark. */
export const APP_DARK_CHART_THEME = "app-dark";

/** Theme name passed to `init` when the app appearance is light. */
export const APP_LIGHT_CHART_THEME = "app-light";
