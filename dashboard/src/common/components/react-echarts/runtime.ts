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
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

// Shared by reports, BQL, budget, and commodity charts. Legend includes plain
// and scroll legends; Tooltip installs the axis-pointer support used by grids.
registerCharts([
  BarChart,
  LineChart,
  PieChart,
  SankeyChart,
  TreemapChart,
  DataZoomInsideComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  LabelLayout,
  CanvasRenderer,
]);

/**
 * App dark appearance for canvas charts. Derived from ECharts' built-in dark
 * palette so axis/legend text stays readable, but keeps a transparent chart
 * background so cards/pages show through.
 */
const contrastColor = "#B9B8CE";
registerTheme("app-dark", {
  darkMode: true,
  color: [
    "#4992ff",
    "#7cffb2",
    "#fddd60",
    "#ff6e76",
    "#58d9f9",
    "#05c091",
    "#ff8a45",
    "#8d48e3",
    "#dd79ff",
  ],
  backgroundColor: "transparent",
  textStyle: { color: contrastColor },
  title: {
    textStyle: { color: "#EEF1FA" },
    subtextStyle: { color: contrastColor },
  },
  legend: {
    textStyle: { color: contrastColor },
  },
  tooltip: {
    backgroundColor: "rgba(20, 20, 24, 0.92)",
    borderColor: "#484753",
    textStyle: { color: "#EEF1FA" },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: contrastColor } },
    axisLabel: { color: contrastColor },
    splitLine: { lineStyle: { color: "#484753" } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: contrastColor } },
    axisLabel: { color: contrastColor },
    splitLine: { lineStyle: { color: "#484753" } },
  },
});

/**
 * App light appearance. ECharts' default `inactiveColor` for an unselected
 * legend entry is a near-white grey — 1.52:1 against a white card — but these
 * legends are operable: clicking an unselected currency enables its series.
 * Only that colour is overridden, so every other default (palette, axis and
 * selected label colours, transparent background) is untouched.
 */
registerTheme("app-light", {
  legend: {
    // 5.51:1 on white, and still clearly lighter than the selected #54555a.
    inactiveColor: "#646973",
  },
});

export { init } from "echarts/core";

/** Theme name passed to `init` when the app appearance is dark. */
export const APP_DARK_CHART_THEME = "app-dark";

/** Theme name passed to `init` when the app appearance is light. */
export const APP_LIGHT_CHART_THEME = "app-light";
