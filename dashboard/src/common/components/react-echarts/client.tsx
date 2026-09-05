import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { init } from "./runtime";
import type { ECharts } from "echarts/core";
import { useIsMobile } from "@/common/hooks/use-mobile";
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

    useEffect(() => {
      if (!chartRef.current) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }

      const chart = init(chartRef.current, theme);
      chartInstanceRef.current = chart;

      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    }, [theme]);

    useEffect(() => {
      if (!chartInstanceRef.current) return;
      chartInstanceRef.current.setOption(option, {
        notMerge,
        lazyUpdate,
        silent,
      });
    }, [option, notMerge, lazyUpdate, silent, theme]);

    useEffect(() => {
      if (!chartInstanceRef.current) return;
      if (showLoading) {
        chartInstanceRef.current.showLoading(loadingOption);
      } else {
        chartInstanceRef.current.hideLoading();
      }
    }, [showLoading, loadingOption, theme]);

    useEffect(() => {
      const handleResize = () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
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
