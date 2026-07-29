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
import { getChartColors } from "@/common/lib/chart/color";
import { formatDateAxis } from "@/common/lib/chart/chart";
import {
  type BaseChartProps,
  createCommonAxisConfig,
  createCommonGridConfig,
  createEmptyChartOption,
} from "./utils";

/**
 * Stacked Date Balance Chart component
 * Displays data as stacked bar chart by accounts, with one bar cluster per currency.
 * Each currency forms its own stack group (stack: "USD", stack: "VACHR", etc.)
 * so different currencies appear side-by-side while accounts accumulate within each group.
 */
export function StackDateBalanceChart({
  data,
  interval,
  primarySeries = "USD",
  inverted,
}: BaseChartProps) {
  const formatNum = useFormatNumber();
  const chartOption = useMemo((): EChartsOption => {
    if (!data || data.length === 0) {
      return createEmptyChartOption();
    }

    // Extract all unique currencies and accounts from accountBalances
    const currencies = new Set<string>();
    const accounts = new Set<string>();
    data.forEach((item) => {
      if (item.accountBalances) {
        Object.entries(item.accountBalances).forEach(([account, balances]) => {
          accounts.add(account);
          if (balances && typeof balances === "object") {
            Object.keys(balances as Record<string, unknown>).forEach((c) =>
              currencies.add(c),
            );
          }
        });
      }
    });

    // Sort currencies with primarySeries first, then alphabetically
    const currencyList = Array.from(currencies).sort((a, b) =>
      a === primarySeries ? -1 : b === primarySeries ? 1 : a.localeCompare(b),
    );
    const accountList = Array.from(accounts).sort();

    // Create one series per (currency, account) pair.
    // Series name = currency so the legend shows currencies and toggling a currency
    // hides/shows all its account segments at once.
    // The stack key is the currency name, grouping bars by currency.
    const chartColors = getChartColors();
    const seriesData: BarSeriesOption[] = [];
    currencyList.forEach((currency) => {
      accountList.forEach((account, accountIndex) => {
        const values = data.map((item) => {
          if (!item.accountBalances?.[account]) {
            return 0;
          }
          const accountBalance = item.accountBalances[account] as Record<
            string,
            unknown
          >;
          const balance = accountBalance[currency];
          if (balance === null || balance === undefined) {
            return 0;
          }
          const numericValue =
            typeof balance === "string" ? parseFloat(balance) : Number(balance);
          return isNaN(numericValue)
            ? 0
            : inverted
              ? -numericValue
              : numericValue;
        });

        seriesData.push({
          name: currency,
          type: "bar",
          data: values,
          stack: currency,
          itemStyle: {
            color: chartColors[accountIndex % chartColors.length],
          },
          emphasis: {
            focus: "series",
          },
        });
      });
    });

    // Prepare x-axis data (dates)
    const dates = data.map((item) => item.date);

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

        // Skip if value is invalid
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

        // seriesName is the currency; derive the account from the series index
        const account =
          accountList.length > 0 && param.seriesIndex
            ? (accountList[param.seriesIndex % accountList.length] ?? "")
            : "";

        return `<div>
          <div><strong>${formatDateAxis(param.name, interval ?? "monthly")}</strong></div>
          <div>${account}</div>
          <div>${formattedValue} ${param.seriesName}</div>
        </div>`;
      }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
    };

    const { xAxis, yAxis } = createCommonAxisConfig(dates, interval);

    return {
      tooltip,
      legend: {
        data: currencyList,
        bottom: 0,
        type: "scroll",
        pageButtonItemGap: 5,
        selected: Object.fromEntries(
          currencyList.map((c) => [c, c === primarySeries]),
        ),
      },
      grid: createCommonGridConfig(),
      xAxis,
      yAxis,
      series: seriesData,
      color: getChartColors(),
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [data, interval, primarySeries, inverted, formatNum]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height: "250px", width: "100%" }}
        className="w-full"
      />
    </div>
  );
}
