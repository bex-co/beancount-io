import { ClientOnly } from "@tanstack/react-router";
import type { EChartsOption } from "echarts";

import { ChartEmpty } from "./chart-empty";
import { ReactEChartsClient } from "./client";
import { ReactEChartsServer } from "./server";
import { EChartsProps } from "./types";

/**
 * Returns true when option.series has no meaningful data to render.
 *
 * Rules per series type:
 *   - sankey  → empty when `links` is absent or []
 *   - all others (bar, line, scatter, pie, treemap, …) → empty when `data` is absent or []
 *   - missing/empty `series` array → empty
 */
function isSeriesEmpty(option: EChartsOption): boolean {
  const { series } = option;
  if (!series) return true;
  const arr = Array.isArray(series) ? series : [series];
  if (arr.length === 0) return true;
  return arr.every((s) => {
    if (!s || typeof s !== "object") return true;
    const item = s as Record<string, unknown>;
    if (item.type === "sankey") {
      const links = item.links;
      return !links || (Array.isArray(links) && links.length === 0);
    }
    const data = item.data;
    return !data || (Array.isArray(data) && data.length === 0);
  });
}

/**
 * Auto-selects the SSR placeholder on the server and the full ECharts
 * implementation on the client. Import the named exports directly when you
 * need explicit control.
 *
 * Automatically renders <ChartEmpty> when all series have no data, or when
 * the `isEmpty` prop is explicitly set to true.
 */
export const ReactECharts = (props: EChartsProps) => {
  const empty = props.isEmpty ?? isSeriesEmpty(props.option);
  if (empty) {
    const styleHeight = props.style?.height;
    const height =
      typeof styleHeight === "number"
        ? `${styleHeight}px`
        : (styleHeight ?? "250px");
    return <ChartEmpty height={height} />;
  }
  return (
    <ClientOnly fallback={<ReactEChartsServer {...props} />}>
      <ReactEChartsClient {...props} />
    </ClientOnly>
  );
};
