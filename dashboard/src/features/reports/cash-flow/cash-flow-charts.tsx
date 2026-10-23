import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import type {
  EChartsOption,
  BarSeriesOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentOption,
} from "echarts";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import { getChartColors } from "@/common/lib/chart/color";
import { formatDateAxis } from "@/common/lib/chart/chart";
import {
  createCommonAxisConfig,
  createCommonGridConfig,
  createEmptyChartOption,
} from "../income-statement/date-balance-chart/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ChartInterval } from "@/common/types/chart";
import {
  ChartPeriodTable,
  type ChartPeriodSeries,
} from "../components/chart-period-table";
import { legendSelectionFor } from "../lib/legend-selection";
import { CASH_FLOW_ACTIVITIES, type CashFlowIntervalPoint } from "./lib/model";

interface CashFlowChartProps {
  data: CashFlowIntervalPoint[];
  interval?: ChartInterval;
  primarySeries?: string;
  /** The chart's heading; names its keyboard- and reader-readable period data. */
  labelledBy?: string;
}

/**
 * Exact decimal strings stay exact inside the statement model; charts plot
 * floats, so convert only at the chart boundary like the sibling charts do.
 */
function toChartNumber(value: string | undefined): number {
  if (value === undefined) return 0;
  const numericValue = parseFloat(value);
  return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * Net Cash Flow chart component
 * Displays the per-interval net change in cash & equivalents as a bar chart
 * with one series per currency.
 */
export function NetCashFlowChart({
  data,
  interval,
  primarySeries = "USD",
  labelledBy,
}: CashFlowChartProps) {
  const formatNum = useFormatNumber();
  const { chartOption, periodSeries } = useMemo((): {
    chartOption: EChartsOption;
    periodSeries: ChartPeriodSeries[];
  } => {
    if (!data || data.length === 0) {
      return { chartOption: createEmptyChartOption(), periodSeries: [] };
    }

    const currencies = new Set<string>();
    data.forEach((point) => {
      Object.keys(point.net).forEach((currency) => currencies.add(currency));
    });
    const currencyList = sortUsdFirst(Array.from(currencies), primarySeries);

    const seriesData: BarSeriesOption[] = currencyList.map((currency) => ({
      name: currency,
      type: "bar",
      data: data.map((point) => toChartNumber(point.net[currency])),
      emphasis: {
        focus: "series",
      },
    }));

    const dates = data.map((point) => point.date);

    const tooltip: TooltipComponentOption = {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        if (Array.isArray(params)) {
          let result = `<div><strong>${formatDateAxis(params[0].name, interval ?? "monthly")}</strong></div>`;
          params.forEach((param) => {
            const value = param.value;
            const formattedValue =
              typeof value === "number"
                ? value >= 0
                  ? `+${formatNum(value)}`
                  : formatNum(value)
                : "0";
            result += `<div style="color: ${param.color}">
              <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
              ${param.seriesName}: <span style="color: ${param.color}; font-weight: bold;">${formattedValue}</span>
            </div>`;
          });
          return result;
        }
        return "";
      }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
    };

    const legendSelected = legendSelectionFor(currencyList, primarySeries);

    const { xAxis, yAxis } = createCommonAxisConfig(dates, interval);

    return {
      // The model's exact decimals, with the chart's plotted zero (w4/996).
      periodSeries: currencyList.map((currency) => ({
        unit: currency,
        values: data.map((point) => point.net[currency] ?? "0"),
      })),
      chartOption: {
        tooltip,
        legend: {
          data: currencyList,
          bottom: 0,
          type: "scroll",
          pageButtonItemGap: 5,
          selected: legendSelected,
        },
        grid: createCommonGridConfig(),
        xAxis,
        yAxis,
        series: seriesData,
        color: getChartColors(),
        animation: true,
        animationDuration: 1000,
        animationEasing: "cubicOut",
      },
    };
  }, [data, interval, primarySeries, formatNum]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height: "250px", width: "100%" }}
        className="w-full"
      />
      {labelledBy && (
        <ChartPeriodTable
          data={data}
          series={periodSeries}
          labelledBy={labelledBy}
        />
      )}
    </div>
  );
}

/**
 * Activity Breakdown chart component
 * Stacked bars per interval: one segment per activity (operating/investing/
 * financing), one stack group per currency so currencies appear side-by-side.
 */
export function ActivityBreakdownChart({
  data,
  interval,
  primarySeries = "USD",
  labelledBy,
}: CashFlowChartProps) {
  const formatNum = useFormatNumber();
  const { t } = useTranslations();
  const { chartOption, periodSeries } = useMemo((): {
    chartOption: EChartsOption;
    periodSeries: ChartPeriodSeries[];
  } => {
    if (!data || data.length === 0) {
      return { chartOption: createEmptyChartOption(), periodSeries: [] };
    }

    const activityLabels = [
      t("page.cashFlow.operating"),
      t("page.cashFlow.investing"),
      t("page.cashFlow.financing"),
    ];

    const currencies = new Set<string>();
    data.forEach((point) => {
      CASH_FLOW_ACTIVITIES.forEach((activity) => {
        Object.keys(point.activities[activity]).forEach((currency) =>
          currencies.add(currency),
        );
      });
    });
    const currencyList = sortUsdFirst(Array.from(currencies), primarySeries);

    // Series name = currency so the legend toggles whole currencies; the
    // stack key is the currency so activities accumulate within each group.
    const chartColors = getChartColors();
    const seriesData: BarSeriesOption[] = [];
    currencyList.forEach((currency) => {
      CASH_FLOW_ACTIVITIES.forEach((activity, activityIndex) => {
        seriesData.push({
          name: currency,
          type: "bar",
          data: data.map((point) =>
            toChartNumber(point.activities[activity][currency]),
          ),
          stack: currency,
          itemStyle: {
            color: chartColors[activityIndex % chartColors.length],
          },
          emphasis: {
            focus: "series",
          },
        });
      });
    });

    const dates = data.map((point) => point.date);

    const tooltip: TooltipComponentOption = {
      trigger: "item",
      borderColor: "transparent",
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        // When trigger is 'item', params is a single object, not an array
        if (Array.isArray(params)) {
          return "";
        }

        const param = params;
        const value = param.value;
        if (
          value === null ||
          value === undefined ||
          (typeof value !== "number" && typeof value !== "string")
        ) {
          return "";
        }

        const numericValue =
          typeof value === "string" ? parseFloat(value) : Number(value);
        if (isNaN(numericValue)) {
          return "";
        }

        const formattedValue =
          numericValue >= 0
            ? `+${formatNum(numericValue)}`
            : formatNum(numericValue);

        // seriesName is the currency; derive the activity from the series index
        const activity =
          param.seriesIndex != null
            ? (activityLabels[
                param.seriesIndex % CASH_FLOW_ACTIVITIES.length
              ] ?? "")
            : "";

        return `<div>
          <div><strong>${formatDateAxis(param.name, interval ?? "monthly")}</strong></div>
          <div>${activity}</div>
          <div>${formattedValue} ${param.seriesName}</div>
        </div>`;
      }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
    };

    const { xAxis, yAxis } = createCommonAxisConfig(dates, interval);

    return {
      // One labelled segment per activity in each currency's column, with
      // the model's exact decimals and the chart's plotted zero (w4/996).
      periodSeries: currencyList.flatMap((currency) =>
        CASH_FLOW_ACTIVITIES.map((activity, activityIndex) => ({
          unit: currency,
          account: activityLabels[activityIndex],
          values: data.map(
            (point) => point.activities[activity][currency] ?? "0",
          ),
        })),
      ),
      chartOption: {
        tooltip,
        legend: {
          data: currencyList,
          bottom: 0,
          type: "scroll",
          pageButtonItemGap: 5,
          // The operating unit, else the first unit the chart has: a scope
          // without the operating unit must not start all hidden (w4/997).
          selected: legendSelectionFor(currencyList, primarySeries),
        },
        grid: createCommonGridConfig(),
        xAxis,
        yAxis,
        series: seriesData,
        color: getChartColors(),
        animation: true,
        animationDuration: 1000,
        animationEasing: "cubicOut",
      },
    };
  }, [data, interval, primarySeries, formatNum, t]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height: "250px", width: "100%" }}
        className="w-full"
      />
      {labelledBy && (
        <ChartPeriodTable
          data={data}
          series={periodSeries}
          labelledBy={labelledBy}
        />
      )}
    </div>
  );
}
