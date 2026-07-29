import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import type {
  EChartsOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentOption,
} from "echarts";
import {
  BudgetInterval,
  GetLedgerIntervalTotalsDocument,
} from "@/graphql/definitions";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatYAxisNumber } from "@/common/lib/chart/chart";
import { getChartColors } from "@/common/lib/chart/color";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { cn } from "@/common/lib/utils/utils";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import {
  createCommonAxisConfig,
  createCommonGridConfig,
} from "@/features/reports/income-statement/date-balance-chart/utils";
import { AddBudgetDialog } from "./add-budget-dialog";
import { BudgetHistoryTable } from "./budget-history-table";
import { calculateBudgetForInterval, parseBudgetAmount } from "./budget-utils";
import type { BudgetGroup } from "./types";

function toIntervalEnum(interval: string): BudgetInterval | undefined {
  const upper = interval.toUpperCase();
  return Object.values(BudgetInterval).find((value) => value === upper);
}

interface BudgetChartCardProps {
  group: BudgetGroup;
  ledgerId: string;
  conversion: ConversionOption;
  primaryCurrency: string;
  time?: string;
  onDelete: (group: BudgetGroup) => void;
}

const chartStyle = { height: "260px", width: "100%" };

export function BudgetChartCard({
  group,
  ledgerId,
  conversion,
  primaryCurrency,
  time,
  onDelete,
}: BudgetChartCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const currentInterval = toIntervalEnum(group.interval);
  const chartInterval = group.interval.toLowerCase() as ChartInterval;
  const intervalLabels = useMemo(
    () => ({
      [BudgetInterval.Daily]: t("page.budget.budgetIntervalDaily"),
      [BudgetInterval.Weekly]: t("page.budget.budgetIntervalWeekly"),
      [BudgetInterval.Monthly]: t("page.budget.budgetIntervalMonthly"),
      [BudgetInterval.Quarterly]: t("page.budget.budgetIntervalQuarterly"),
      [BudgetInterval.Yearly]: t("page.budget.budgetIntervalYearly"),
    }),
    [t],
  );
  const intervalLabel = currentInterval
    ? intervalLabels[currentInterval]
    : group.interval;

  const { value: currentBudgetValue, currency: budgetCurrency } = useMemo(
    () => parseBudgetAmount(group.amount),
    [group.amount],
  );
  const displayCurrency = budgetCurrency || group.currency || primaryCurrency;
  const displayDirection = currentBudgetValue < 0 ? -1 : 1;
  const displayBudgetValue = Math.abs(currentBudgetValue);

  const { data, loading, error } = useQuery(GetLedgerIntervalTotalsDocument, {
    variables: {
      ledgerId,
      accountName: group.account,
      interval: chartInterval,
      conversion,
      time,
    },
    skip: !ledgerId || !group.account,
    fetchPolicy: "cache-first",
  });

  const chartData = (data?.getLedgerIntervalTotals ?? []).map((item) => ({
    date: item.date,
    balance: item.balance as Record<string, unknown>,
    accountBalances: item.accountBalances as Record<string, unknown>,
  }));

  const latestActual = useMemo(() => {
    if (chartData.length === 0) return null;
    const last = chartData[chartData.length - 1];
    const value = last.balance[displayCurrency];
    if (value === null || value === undefined) return null;
    const number =
      typeof value === "string" ? parseFloat(value) : Number(value);
    return Number.isNaN(number) ? null : number * displayDirection;
  }, [chartData, displayCurrency, displayDirection]);

  const comparisonBudgetValue = useMemo(() => {
    if (chartData.length === 0) return displayBudgetValue;
    const last = chartData[chartData.length - 1];
    return Math.abs(
      calculateBudgetForInterval(
        last.date,
        group.interval,
        group.budgetHistory,
      ),
    );
  }, [chartData, displayBudgetValue, group.interval, group.budgetHistory]);

  const variance = useMemo(() => {
    if (latestActual === null) return null;
    return latestActual - comparisonBudgetValue;
  }, [latestActual, comparisonBudgetValue]);

  const varianceStatus = useMemo(() => {
    if (variance === null) return null;
    if (variance > 0) return "above";
    if (variance < 0) return "below";
    return "on";
  }, [variance]);

  const isFavorable =
    varianceStatus === "on" ||
    (displayDirection > 0
      ? varianceStatus === "below"
      : varianceStatus === "above");

  const progressPercent =
    latestActual !== null && comparisonBudgetValue > 0
      ? Math.max(0, (latestActual / comparisonBudgetValue) * 100)
      : null;

  const chartOption = useMemo((): EChartsOption => {
    if (chartData.length === 0) {
      return {
        title: {
          text: t("page.budget.budgetNoDataAvailable"),
          left: "center",
          top: "center",
          textStyle: { color: "#999", fontSize: 14 },
        },
      };
    }

    const dates = chartData.map((item) => item.date);
    const colors = getChartColors();
    const actualValues = chartData.map((item) => {
      const balance = item.balance[displayCurrency];
      if (balance === null || balance === undefined) return 0;
      const number =
        typeof balance === "string" ? parseFloat(balance) : Number(balance);
      return Number.isNaN(number) ? 0 : number * displayDirection;
    });
    const budgetValues = dates.map(
      (date) =>
        calculateBudgetForInterval(date, group.interval, group.budgetHistory) *
        displayDirection,
    );

    const tooltip: TooltipComponentOption = {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        if (!Array.isArray(params)) return "";
        let result = `<div><strong>${params[0].name}</strong></div>`;
        params.forEach((param) => {
          const value = param.value as number;
          const formatted =
            typeof value === "number"
              ? `${formatNum(value)} ${displayCurrency}`
              : "0";
          result += `<div style="color:${param.color}">
            <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
            ${param.seriesName}: <strong>${formatted}</strong>
          </div>`;
        });
        return result;
      }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
    };

    const { xAxis, yAxis } = createCommonAxisConfig(dates, chartInterval);

    return {
      tooltip,
      legend: {
        show: true,
        data: [t("page.budget.budget"), t("page.budget.budgetSpending")],
        bottom: 0,
        type: "plain",
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 12 },
      },
      grid: {
        ...createCommonGridConfig(),
        bottom: "40px",
      },
      xAxis,
      yAxis: {
        ...(yAxis as object),
        axisLabel: {
          formatter: (value: number) => formatYAxisNumber(value),
          fontSize: 12,
        },
      },
      color: colors,
      series: [
        {
          name: t("page.budget.budget"),
          type: "line",
          data: budgetValues,
          symbol: group.budgetHistory.length > 1 ? "circle" : "none",
          symbolSize: 5,
          lineStyle: { type: "dashed", width: 2, color: colors[4] },
          itemStyle: { color: colors[4] },
          step: group.budgetHistory.length > 1 ? "end" : false,
        },
        {
          name: t("page.budget.budgetSpending"),
          type: "bar",
          data: actualValues,
          emphasis: { focus: "series" },
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [
    chartData,
    displayCurrency,
    displayDirection,
    chartInterval,
    group.interval,
    group.budgetHistory,
    t,
    formatNum,
  ]);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="border-b bg-muted/15 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="truncate font-mono text-base">
              {group.account}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {intervalLabel}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {displayCurrency}
              </Badge>
            </CardDescription>
          </div>
          <LedgerWritePermission>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="size-3.5" />
              {t("page.budget.budgetAddEntry")}
            </Button>
          </LedgerWritePermission>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {time === "year-1"
                ? t("page.budget.budget")
                : t("page.budget.budgetCurrentBudget")}
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {formatNum(comparisonBudgetValue)} {displayCurrency}
            </p>
          </div>
          {latestActual !== null && variance !== null && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("page.budget.budgetLatestSpending")}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatNum(latestActual)} {displayCurrency}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("page.budget.budgetVariance")}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      varianceStatus === "on" &&
                        "border-muted-foreground/25 bg-muted text-muted-foreground",
                      varianceStatus !== "on" &&
                        isFavorable &&
                        "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      varianceStatus !== "on" &&
                        !isFavorable &&
                        "border-destructive/25 bg-destructive/10 text-destructive",
                    )}
                  >
                    {varianceStatus === "above" &&
                      t("page.budget.budgetOverBudget")}
                    {varianceStatus === "below" &&
                      t("page.budget.budgetUnderBudget")}
                    {varianceStatus === "on" && t("page.budget.budgetOnBudget")}
                  </Badge>
                </div>
                <p
                  className={cn(
                    "font-mono text-lg font-semibold tabular-nums",
                    varianceStatus !== "on" &&
                      isFavorable &&
                      "text-emerald-700 dark:text-emerald-400",
                    varianceStatus !== "on" &&
                      !isFavorable &&
                      "text-destructive",
                  )}
                >
                  {variance > 0 ? "+" : ""}
                  {formatNum(variance)} {displayCurrency}
                </p>
              </div>
            </>
          )}
        </div>

        {progressPercent !== null && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                isFavorable ? "bg-emerald-500" : "bg-destructive",
              )}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-5">
        {loading && (
          <div className="flex h-[260px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex h-[260px] items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-2 size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {t(getErrorMessageKey(error))}
              </p>
            </div>
          </div>
        )}
        {!loading && !error && (
          <ReactECharts
            option={chartOption}
            style={chartStyle}
            className="w-full"
          />
        )}

        <div className="mt-4">
          <BudgetHistoryTable group={group} onDelete={onDelete} />
        </div>
      </CardContent>

      <AddBudgetDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        ledgerId={ledgerId}
        lockedAccount={group.account}
        defaultInterval={currentInterval}
        defaultCurrency={displayCurrency}
      />
    </Card>
  );
}
