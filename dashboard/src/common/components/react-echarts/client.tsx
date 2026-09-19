import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { APP_DARK_CHART_THEME, init } from "./runtime";
import type { ECharts } from "echarts/core";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { useIsDarkTheme } from "@/common/providers/theme-provider";
import type { EChartsProps, EChartsRef } from "./types";

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
    const isDark = useIsDarkTheme();
    // Explicit caller theme wins; otherwise follow the resolved app appearance.
    const resolvedTheme = theme ?? (isDark ? APP_DARK_CHART_THEME : undefined);

    useEffect(() => {
      if (!chartRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }

      const chart = init(chartRef.current, resolvedTheme);
      chartInstanceRef.current = chart;

      return () => {
        if (chartInstanceRef.current) {
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
  (props, ref) => {
    const isMobile = useIsMobile();
    return (
      <ReactEChartsClientInner key={String(isMobile)} {...props} ref={ref} />
    );
  },
);

ReactEChartsClient.displayName = "ReactEChartsClient";
