import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { AreaChart, Table2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { getChartColors } from "@/common/lib/chart/color";
import { formatDateAxis, formatYAxisNumber } from "@/common/lib/chart/chart";
import type { DataSeries } from "../lib/overview-utils";
import {
  getBalanceAmounts,
  getComparableAmount,
  prioritizeCurrency,
} from "../lib/overview-utils";
import { FormattedAmounts } from "./formatted-amounts";

function formatMonth(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function NetWorthCard({
  data,
  primaryCurrency,
}: {
  data: DataSeries;
  primaryCurrency: string;
}) {
  const { t } = useTranslations();
  const formatNumber = useFormatNumber();
  const [view, setView] = useState<"chart" | "table">("chart");
  const visibleData = useMemo(() => data.slice(-12), [data]);
  const latest = visibleData.at(-1);
  const previous = visibleData.at(-2);
  const latestAmounts = prioritizeCurrency(
    getBalanceAmounts(latest?.balance),
    primaryCurrency,
  );
  const latestComparable = getComparableAmount(latestAmounts, primaryCurrency);
  const previousComparable = previous
    ? getComparableAmount(
        getBalanceAmounts(previous.balance),
        latestComparable?.currency ?? primaryCurrency,
      )
    : null;
  const change =
    latestComparable && previousComparable
      ? latestComparable.value - previousComparable.value
      : null;

  const chartOption = useMemo<EChartsOption>(() => {
    const currencies = Array.from(
      new Set(
        visibleData.flatMap((point) =>
          getBalanceAmounts(point.balance).map((amount) => amount.currency),
        ),
      ),
    );
    const displayedCurrencies = currencies.includes(primaryCurrency)
      ? [primaryCurrency]
      : currencies;

    return {
      animationDuration: 500,
      color: getChartColors(),
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => formatNumber(Number(value)),
      },
      grid: {
        left: 8,
        right: 8,
        top: 18,
        bottom: 28,
        containLabel: true,
      },
      legend:
        displayedCurrencies.length > 1
          ? { data: displayedCurrencies, bottom: 0 }
          : undefined,
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: visibleData.map((point) => point.date),
        axisLabel: {
          formatter: (value: string) => {
            const parsed = new Date(`${value}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) {
              return formatDateAxis(value, "monthly");
            }
            return new Intl.DateTimeFormat(undefined, {
              month: "short",
            }).format(parsed);
          },
        },
      },
      yAxis: {
        type: "value",
        splitLine: defaultSplitLine,
        axisLabel: { formatter: formatYAxisNumber },
        scale: true,
      },
      series: displayedCurrencies.map((currency) => ({
        name: currency,
        type: "line" as const,
        smooth: 0.25,
        symbol: "none",
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.12 },
        data: visibleData.map(
          (point) =>
            getBalanceAmounts(point.balance).find(
              (amount) => amount.currency === currency,
            )?.value ?? null,
        ),
      })),
    };
  }, [formatNumber, primaryCurrency, visibleData]);

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <CardTitle>{t("common.netWorth")}</CardTitle>
        <CardDescription>
          {t("page.overview.netWorthDescription")}
        </CardDescription>
        <CardAction className="flex rounded-lg border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant={view === "chart" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("chart")}
            aria-label={t("page.overview.chartView")}
          >
            <AreaChart className="size-4" />
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("table")}
            aria-label={t("page.overview.tableView")}
          >
            <Table2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormattedAmounts
            amounts={latestAmounts}
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          />
          {change !== null && latestComparable && (
            <div
              className={
                change >= 0
                  ? "flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400"
                  : "flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400"
              }
            >
              {change >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              <span className="tabular-nums">
                {change > 0 ? "+" : ""}
                {formatNumber(change)} {latestComparable.currency}
              </span>
              <span className="text-muted-foreground">
                {t("page.overview.fromPreviousMonth")}
              </span>
            </div>
          )}
        </div>

        {visibleData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {t("common.noDataFound")}
          </div>
        ) : view === "chart" ? (
          <ReactECharts
            option={chartOption}
            style={{ height: "230px", width: "100%" }}
          />
        ) : (
          <div className="mt-5 max-h-[230px] divide-y overflow-y-auto rounded-lg border">
            {[...visibleData].reverse().map((point) => (
              <div
                key={point.date}
                className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {formatMonth(point.date)}
                </span>
                <FormattedAmounts
                  amounts={prioritizeCurrency(
                    getBalanceAmounts(point.balance),
                    primaryCurrency,
                  )}
                  className="text-right font-medium"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
