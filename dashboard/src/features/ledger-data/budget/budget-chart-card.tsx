import { useCallback, useId, useMemo, useState } from "react";
import { format } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { ReactECharts } from "@/common/components/react-echarts";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import {
  currencyMinorDigits,
  fractionDigitsOf,
} from "@/common/lib/format/format-number";
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
import {
  absDecimalNumber,
  isPositiveDecimalNumber,
  negateDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import {
  budgetGroupDirection,
  budgetHeadlinePeriod,
  calculateBudgetForInterval,
  parseBudgetAmount,
  readSparseBalanceAmount,
  budgetVariance,
} from "./budget-utils";
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
  onDelete: (group: BudgetGroup, opener: HTMLElement | null) => void;
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
  const titleId = useId();
  const currencyId = useId();
  const periodsId = useId();
  const [isAddOpen, setIsAddOpen] = useState(false);
  // Whether the reader opened Period data. Held on the card, not the details
  // element: a new time span re-reads the periods, which unmounts the table
  // while it loads, and the reopened one must keep the reader's choice
  // (w4/1106). Another ledger starts closed.
  const [periodsOpen, setPeriodsOpen] = useState({ ledgerId, open: false });
  const showPeriods = periodsOpen.ledgerId === ledgerId && periodsOpen.open;
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

  const { exact: currentBudgetValue, currency: budgetCurrency } = useMemo(
    () => parseBudgetAmount(group.amount),
    [group.amount],
  );
  const displayCurrency = budgetCurrency || group.currency || primaryCurrency;
  const displayDirection = budgetGroupDirection(group);
  const displayBudgetValue = absDecimalNumber(currentBudgetValue);

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

  const chartData = useMemo(
    () =>
      (data?.getLedgerIntervalTotals ?? []).map((item) => ({
        date: item.date,
        balance: item.balance as Record<string, unknown>,
        accountBalances: item.accountBalances as Record<string, unknown>,
      })),
    [data],
  );

  // A commodity is shown at the finest precision the ledger recorded for this
  // budget's targets and actuals, so 0.0004 BTC is not read as 0 BTC (w4/m45).
  // ISO currencies keep their minor units.
  const quantityDigits = Math.max(
    ...group.budgetHistory.map((entry) =>
      fractionDigitsOf(entry.amount.trim().split(/\s+/)[0]),
    ),
    ...chartData.map((item) =>
      fractionDigitsOf(String(item.balance[displayCurrency])),
    ),
  );
  // Prorated targets round once to the precision amounts are written at —
  // an ISO currency's minor units, else at least the formatter's three
  // commodity digits — or the recorded digits when those are finer (w4/m55).
  const amountDigits = Math.max(
    quantityDigits,
    currencyMinorDigits(displayCurrency) ?? 3,
  );

  /**
   * Every plotted period with its effective target and actual. The chart draws
   * from this and so does the table below it, so the readable values are the
   * ones on the canvas rather than a second calculation.
   */
  const periodRows = useMemo(
    () =>
      chartData.map((item) => {
        const budget = calculateBudgetForInterval(
          item.date,
          group.interval,
          group.budgetHistory,
          amountDigits,
        );
        return {
          date: item.date,
          budget: displayDirection < 0 ? negateDecimalNumber(budget) : budget,
          actual:
            readSparseBalanceAmount(
              item.balance,
              displayCurrency,
              displayDirection,
            ) ?? "0",
        };
      }),
    [
      chartData,
      displayCurrency,
      displayDirection,
      group.budgetHistory,
      group.interval,
      amountDigits,
    ],
  );

  const showAmount = useCallback(
    (value: string) =>
      `${formatNum(value, displayCurrency, quantityDigits)} ${displayCurrency}`,
    [formatNum, displayCurrency, quantityDigits],
  );

  // The headline describes the period containing today, not whichever bucket
  // the selected span happens to end on: "This year" ends in December, and a
  // rolling window clips (and so prorates) the current month.
  const spanEnded = time === "year-1";
  const today = format(new Date(), "yyyy-MM-dd");
  const headline = useMemo(
    () =>
      budgetHeadlinePeriod(
        chartData.map((item) => item.date),
        group.interval,
        today,
        spanEnded,
      ),
    [chartData, group.interval, today, spanEnded],
  );

  const latestActual = useMemo(() => {
    if (chartData.length === 0 || headline === null) return null;
    // A bucket missing for the current period means nothing was posted yet.
    if (headline.bucket === null) return "0";
    return readSparseBalanceAmount(
      chartData[headline.bucket].balance,
      displayCurrency,
      displayDirection,
    );
  }, [chartData, headline, displayCurrency, displayDirection]);

  // Under "Last year" the header claims that period's target, which only the
  // period's own read can supply. While that read is pending or has failed,
  // the latest configured budget is not an answer — it showed 200 USD for a
  // year whose target was 0 — so the value stays unknown instead.
  const comparisonBudgetValue = useMemo((): string | null => {
    if (spanEnded && (loading || error)) return null;
    if (headline === null) return spanEnded ? null : displayBudgetValue;
    return absDecimalNumber(
      calculateBudgetForInterval(
        headline.end,
        group.interval,
        group.budgetHistory,
        amountDigits,
      ),
    );
  }, [
    headline,
    displayBudgetValue,
    group.interval,
    group.budgetHistory,
    amountDigits,
    spanEnded,
    loading,
    error,
  ]);

  const variance = useMemo(() => {
    if (latestActual === null || comparisonBudgetValue === null) return null;
    return budgetVariance(latestActual, comparisonBudgetValue);
  }, [latestActual, comparisonBudgetValue]);

  const varianceStatus = useMemo(() => {
    if (variance === null) return null;
    if (isPositiveDecimalNumber(variance)) return "above";
    if (variance.startsWith("-")) return "below";
    return "on";
  }, [variance]);

  const isFavorable =
    varianceStatus === "on" ||
    (displayDirection > 0
      ? varianceStatus === "below"
      : varianceStatus === "above");

  const progressPercent =
    latestActual !== null &&
    comparisonBudgetValue !== null &&
    isPositiveDecimalNumber(comparisonBudgetValue)
      ? Math.max(
          0,
          (Number(latestActual) / Number(comparisonBudgetValue)) * 100,
        )
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

    const dates = periodRows.map((row) => row.date);
    const colors = getChartColors();
    const actualValues = periodRows.map((row) => Number(row.actual));
    const budgetValues = periodRows.map((row) => Number(row.budget));

    const tooltip: TooltipComponentOption = {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        if (!Array.isArray(params)) return "";
        let result = `<div><strong>${params[0].name}</strong></div>`;
        params.forEach((param) => {
          // The period's own decimal, not the plotted double (w4/m55).
          const row = periodRows[param.dataIndex];
          const formatted = showAmount(
            param.seriesIndex === 0 ? row.budget : row.actual,
          );
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
    periodRows,
    chartData.length,
    chartInterval,
    group.budgetHistory.length,
    t,
    showAmount,
  ]);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="border-b bg-muted/15 pb-5">
        {/* min-w-0: as CardHeader's grid item this may shrink below the
            long account name's intrinsic width, so the title's truncate
            can engage inside the card (w4/1109). */}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle id={titleId} className="truncate font-mono text-base">
              {group.account}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {intervalLabel}
              </Badge>
              <Badge
                id={currencyId}
                variant="outline"
                className="font-mono text-xs"
              >
                {displayCurrency}
              </Badge>
            </CardDescription>
          </div>
          <LedgerWritePermission>
            <AddBudgetDialog
              open={isAddOpen}
              onOpenChange={setIsAddOpen}
              ledgerId={ledgerId}
              lockedAccount={group.account}
              defaultInterval={currentInterval}
              defaultCurrency={displayCurrency}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label={t("page.budget.budgetUpdateForAccount", {
                    account: group.account,
                    currency: displayCurrency,
                  })}
                >
                  <Plus className="size-3.5" />
                  {t("page.budget.budgetAddEntry")}
                </Button>
              }
            />
          </LedgerWritePermission>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {spanEnded
                ? t("page.budget.budget")
                : t("page.budget.budgetCurrentBudget")}
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {comparisonBudgetValue === null
                ? "—"
                : showAmount(comparisonBudgetValue)}
            </p>
          </div>
          {latestActual !== null && variance !== null && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("page.budget.budgetLatestSpending")}
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {showAmount(latestActual)}
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
                  {isPositiveDecimalNumber(variance) ? "+" : ""}
                  {showAmount(variance)}
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

        {/* The canvas has no readable alternative, so the plotted periods are
            also offered as text. Only for a settled, non-empty read: a failed
            one must not look like a table of zeros. A disclosure keeps long
            histories out of the way while staying reachable by keyboard. */}
        {!loading && !error && periodRows.length > 0 && (
          <details
            className="group/periods mt-4 rounded-lg border"
            open={showPeriods}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              if (open !== showPeriods) setPeriodsOpen({ ledgerId, open });
            }}
          >
            <summary
              id={periodsId}
              className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {t("page.budget.budgetPeriodData")}
            </summary>
            <div className="overflow-x-auto border-t">
              <Table aria-labelledby={`${titleId} ${currencyId} ${periodsId}`}>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-28">
                      {t("page.budget.budgetPeriod")}
                    </TableHead>
                    <TableHead className="min-w-28 text-right">
                      {t("page.budget.budget")}
                    </TableHead>
                    <TableHead className="min-w-28 text-right">
                      {t("page.budget.budgetSpending")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodRows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                        {row.date}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-sm tabular-nums">
                        {showAmount(row.budget)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-sm tabular-nums">
                        {showAmount(row.actual)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}

        <div className="mt-4">
          <BudgetHistoryTable
            group={group}
            onDelete={onDelete}
            ariaLabelledBy={`${titleId} ${currencyId}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
