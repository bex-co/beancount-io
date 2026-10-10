import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { APP_DARK_CHART_THEME, APP_LIGHT_CHART_THEME, init } from "./runtime";
import type { ECharts } from "echarts/core";
import type { EChartsOption, LegendComponentOption } from "echarts";
import { useIsDarkTheme } from "@/common/providers/theme-provider";
import type { EChartsProps, EChartsRef } from "./types";

function legendNames(legend: LegendComponentOption, option: EChartsOption) {
  const series = Array.isArray(option.series)
    ? option.series
    : option.series
      ? [option.series]
      : [];
  const data =
    legend.data ??
    series.flatMap<unknown>((item) =>
      item.type === "pie" && Array.isArray(item.data) && item.data.length
        ? item.data
        : typeof item.name === "string"
          ? [item.name]
          : [],
    );
  return new Set(
    data.flatMap((item) => {
      const name =
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "name" in item
            ? item.name
            : undefined;
      return typeof name === "string" && name ? [name] : [];
    }),
  );
}

const ReactEChartsClientInner = forwardRef<EChartsRef, EChartsProps>(
  (
    {
      option,
      style = { height: "250px" },
      className,
      theme,
      showLoading = false,
      loadingOption,
      notMerge = false,
      lazyUpdate = false,
      silent = false,
    },
    ref,
  ) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<ECharts | null>(null);
    const appliedOptionRef = useRef<EChartsOption | null>(null);
    const legendSelectionRef = useRef<{
      option: EChartsOption | null;
      selected: Array<Record<string, boolean>>;
    } | null>(null);
    const isDark = useIsDarkTheme();
    // Explicit caller theme wins; otherwise follow the resolved app appearance.
    const resolvedTheme =
      theme ?? (isDark ? APP_DARK_CHART_THEME : APP_LIGHT_CHART_THEME);

    useEffect(() => {
      if (!chartRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }

      const chart = init(chartRef.current, resolvedTheme);
      chartInstanceRef.current = chart;

      return () => {
        if (chartInstanceRef.current) {
          const previous =
            chartInstanceRef.current.getOption() as EChartsOption;
          const legends = Array.isArray(previous.legend)
            ? previous.legend
            : previous.legend
              ? [previous.legend]
              : [];
          legendSelectionRef.current = {
            option: appliedOptionRef.current,
            selected: legends.map((legend) => ({ ...legend.selected })),
          };
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    }, [resolvedTheme]);

    useEffect(() => {
      if (!chartInstanceRef.current) return;
      chartInstanceRef.current.setOption(option, {
        notMerge,
        lazyUpdate,
        silent,
      });
      const saved = legendSelectionRef.current;
      legendSelectionRef.current = null;
      // Theme recreation may restore choices only for the same applied report.
      // New options keep their own defaults rather than an old chart's state.
      if (saved?.option === option) {
        const current = chartInstanceRef.current.getOption() as EChartsOption;
        const legends = Array.isArray(current.legend)
          ? current.legend
          : current.legend
            ? [current.legend]
            : [];
        legends.forEach((legend, legendIndex) => {
          if (legend.selectedMode === false) return;
          const names = legendNames(legend, current);
          Object.entries(saved.selected[legendIndex] ?? {}).forEach(
            ([name, selected]) => {
              if (!names.has(name)) return;
              chartInstanceRef.current?.dispatchAction(
                {
                  type: selected ? "legendSelect" : "legendUnSelect",
                  name,
                  legendIndex,
                },
                { silent: true },
              );
            },
          );
        });
      }
      appliedOptionRef.current = option;
    }, [option, notMerge, lazyUpdate, silent, resolvedTheme]);

    useEffect(() => {
      if (!chartInstanceRef.current) return;
      if (showLoading) {
        chartInstanceRef.current.showLoading(loadingOption);
      } else {
        chartInstanceRef.current.hideLoading();
      }
    }, [showLoading, loadingOption, resolvedTheme]);

    useEffect(() => {
      const handleResize = () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      };
      window.addEventListener("resize", handleResize);

      // A window resize is not the only thing that changes the chart's box: a
      // sidebar widening, a sibling collapsing or a grid reflow all resize the
      // container while the window stands still, and the canvas would keep its
      // stale width and spill out of its card. Observe the box itself.
      const container = chartRef.current;
      let observer: ResizeObserver | null = null;
      if (container && typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(handleResize);
        observer.observe(container);
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        observer?.disconnect();
      };
    }, []);

    useImperativeHandle(ref, () => ({
      getEchartsInstance: () => chartInstanceRef.current || undefined,
      getEchartsInstanceAsync: async () => {
        return new Promise((resolve, reject) => {
          if (chartInstanceRef.current) {
            resolve(chartInstanceRef.current);
          } else {
            const maxRetries = 100;
            let retries = 0;
            const checkChart = () => {
              if (chartInstanceRef.current) {
                resolve(chartInstanceRef.current);
              } else if (retries >= maxRetries) {
                reject(new Error("Chart initialization timeout"));
              } else {
                retries++;
                setTimeout(checkChart, 10);
              }
            };
            checkChart();
          }
        });
      },
    }));

    return <div ref={chartRef} className={className} style={style} />;
  },
);

ReactEChartsClientInner.displayName = "ReactEChartsClientInner";

export const ReactEChartsClient = forwardRef<EChartsRef, EChartsProps>(
  (props, ref) => <ReactEChartsClientInner {...props} ref={ref} />,
);

ReactEChartsClient.displayName = "ReactEChartsClient";
