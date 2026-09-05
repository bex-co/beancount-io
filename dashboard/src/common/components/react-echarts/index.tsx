import { forwardRef, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/common/components/error-boundary";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { ClientOnly } from "@tanstack/react-router";
import type { EChartsOption } from "echarts";

import { ChartEmpty } from "./chart-empty";
import { ReactEChartsServer } from "./server";
import type { EChartsProps, EChartsRef } from "./types";

const loadClient = () => import("./client");
const LazyChart = lazy(() =>
  loadClient().then((module) => ({ default: module.ReactEChartsClient })),
);
// Start with the chart-using route's module, not after its first effect. This
// keeps an explicit split without adding a post-hydration download waterfall.
if (!import.meta.env.SSR) void loadClient().catch(() => {});

function ChartLoadError({
  style = { height: "250px" },
  className,
}: EChartsProps) {
  const { t } = useTranslations();
  return (
    <div style={style} className={className} role="alert">
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p>{t("common.errorOccurred")}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("common.tryAgain")}
        </Button>
      </div>
    </div>
  );
}

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
export const ReactECharts = forwardRef<EChartsRef, EChartsProps>(
  (props, ref) => {
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
        <ErrorBoundary fallback={<ChartLoadError {...props} />}>
          <Suspense fallback={<ReactEChartsServer {...props} />}>
            <LazyChart {...props} ref={ref} />
          </Suspense>
        </ErrorBoundary>
      </ClientOnly>
    );
  },
);

ReactECharts.displayName = "ReactECharts";
