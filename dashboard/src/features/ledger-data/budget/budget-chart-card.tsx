import { useId, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, ArrowUp, ChevronRight, Pencil } from "lucide-react";
import { BudgetTargetBar } from "./budget-target-bar";
import type {
  EChartsOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
  TooltipComponentOption,
} from "echarts";
import { BudgetInterval } from "@/graphql/definitions";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardHeader } from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { ReactECharts } from "@/common/components/react-echarts";
import { AccountName } from "@/common/components/account-name";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatYAxisNumber } from "@/common/lib/chart/chart";
import {
  getChartColors,
  getShadcnThemeTokens,
  opacity,
} from "@/common/lib/chart/color";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { cn } from "@/common/lib/utils/utils";
import type { ConversionOption } from "@/common/types/chart";
import {
  createCommonAxisConfig,
  createCommonGridConfig,
} from "@/common/lib/chart/cartesian-config";
import {
  absDecimalNumber,
  isPositiveDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import { AddBudgetDialog } from "./add-budget-dialog";
import { BudgetHistoryTable } from "./budget-history-table";
import { budgetPeriodName, parseBudgetAmount } from "./budget-utils";
import { useBudgetSnapshot, varianceTone } from "./budget-snapshot";
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
  /** The day the budget is summarised for (see `budgetSummaryDay`); today by default. */
  asOf?: string;
  /** The card's id, for the summary row that links to it. */
  anchorId?: string;
  /** The summary's id, for the card's way back to it. */
  summaryAnchor?: string;
  onDelete: (group: BudgetGroup, opener: HTMLElement | null) => void;
  /** A saved Update write; the page returns focus across its refresh. */
  onUpdateSuccess?: (submitted: { account: string; currency: string }) => void;
}

const chartStyle = { height: "260px", width: "100%" };

/**
 * One budget in detail: its account as a heading, the summarised period's
 * target, actual and variance, every period on a chart (the target a step
 * from the day it was set, actuals over it in red), the periods as text, and
 * the dated targets behind it.
 */
export function BudgetChartCard({
  group,
  ledgerId,
  conversion,
  primaryCurrency,
  time,
  asOf,
  anchorId,
  summaryAnchor = "budget-summary",
  onDelete,
  onUpdateSuccess,
}: BudgetChartCardProps) {
  const titleId = useId();
  const currencyId = useId();
  const periodsId = useId();
  const targetsId = useId();
  const [isAddOpen, setIsAddOpen] = useState(false);
  // Whether the reader opened Period data. Held on the card, not the details
  // element: a new time span re-reads the periods, which unmounts the table
  // while it loads, and the reopened one must keep the reader's choice
  // (w4/1106). Another ledger starts closed.
  const [periodsOpen, setPeriodsOpen] = useState({ ledgerId, open: false });
  const showPeriods = periodsOpen.ledgerId === ledgerId && periodsOpen.open;
  const { t, i18n } = useTranslations();
  const currentInterval = toIntervalEnum(group.interval);
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

  const {
    loading,
    error,
    chartInterval,
    chartData,
    periodRows,
    displayCurrency,
    displayDirection,
    showAmount,
    spanEnded,
    headlineStart,
    latestActual,
    comparisonBudgetValue,
    variance,
    varianceStatus,
    isFavorable,
    progressPercent,
    asOf: summaryDay,
  } = useBudgetSnapshot({
    group,
    ledgerId,
    conversion,
    primaryCurrency,
    time,
    asOf,
  });

  // The period the figures describe, by name: they are never left to mean
  // "now" when the ledger's data stops earlier.
  const periodName =
    headlineStart === null
      ? null
      : budgetPeriodName(
          headlineStart,
          group.interval,
          i18n.language,
          (quarter, year) =>
            t("page.budget.budgetQuarterName", { quarter, year }),
          (day) => t("page.budget.budgetWeekOf", { date: day }),
        );
  const summarisingNow =
    !spanEnded &&
    (asOf ?? format(new Date(), "yyyy-MM-dd")) ===
      format(new Date(), "yyyy-MM-dd");

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
    const overColor = getShadcnThemeTokens().destructive || "#dc2626";
    // A period's bar is red when its actual is on the wrong side of its
    // target: over it for spending, short of it for income.
    const unfavorable = (row: (typeof periodRows)[number]) =>
      row.budget !== null &&
      (displayDirection > 0
        ? Number(row.actual) > Number(row.budget)
        : Number(row.actual) < Number(row.budget));
    const actualValues = periodRows.map((row) => Number(row.actual));
    const offTarget = periodRows.map(unfavorable);
    const budgetValues = periodRows.map((row) =>
      row.budget === null ? null : Number(row.budget),
    );

    const tooltip: TooltipComponentOption = {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: ((params: TooltipComponentFormatterCallbackParams) => {
        if (!Array.isArray(params)) return "";
        let result = `<div><strong>${params[0].name}</strong></div>`;
        params.forEach((param) => {
          // The period's own decimal, not the plotted double (w4/m55).
          const row = periodRows[param.dataIndex];
          // The colour keys carry no values.
          if ((param.seriesIndex ?? 0) > 1 || !row) return;
          const value = param.seriesIndex === 0 ? row.budget : row.actual;
          const formatted = value === null ? "—" : showAmount(value);
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
        data: [
          // The target's key is a dash, as its line is.
          {
            name: t("page.budget.budget"),
            icon: "path://M0,4 h5 v2 h-5 z M7,4 h5 v2 h-5 z",
          },
          { name: t("page.budget.budgetSpending"), icon: "roundRect" },
          // Every bar colour has a key: red is a missed target; pale is a
          // period with no target yet or still running, so not judged.
          { name: t("page.budget.budgetLegendMissed"), icon: "roundRect" },
          { name: t("page.budget.budgetLegendNotJudged"), icon: "roundRect" },
        ],
        // A key here explains a colour; it is not a switch.
        selectedMode: false,
        bottom: 0,
        type: "plain",
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 12 },
      },
      grid: {
        ...createCommonGridConfig(),
        // Room for the last period's label, which centres on its bar.
        right: "24px",
        // Two rows of keys on a phone.
        bottom: "56px",
      },
      xAxis: {
        ...(xAxis as object),
        axisLabel: {
          ...((xAxis as { axisLabel?: object }).axisLabel ?? {}),
          hideOverlap: true,
        },
      },
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
          // A target holds from the day it is set until the next one: a
          // step, never a ramp, and nothing before the first.
          name: t("page.budget.budget"),
          type: "line",
          data: budgetValues,
          // A lone period has no line to draw: its target is a short dash.
          symbol:
            budgetValues.filter((value) => value !== null).length > 1
              ? "none"
              : "rect",
          symbolSize: [28, 2],
          lineStyle: { type: "dashed", width: 2, color: colors[4] },
          itemStyle: { color: colors[4] },
          step: "middle",
          connectNulls: false,
        },
        {
          name: t("page.budget.budgetSpending"),
          type: "bar",
          data: actualValues,
          emphasis: { focus: "series" },
          // The bars' own colour, so the legend's key matches them; red where
          // a period is on the wrong side of its target; muted before any
          // target existed and while a period is still running.
          color: colors[1],
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: { dataIndex: number }) =>
              periodRows[params.dataIndex]?.budget === null ||
              (periodRows[params.dataIndex]?.date ?? "") > summaryDay
                ? opacity(colors[1], 0.35)
                : offTarget[params.dataIndex]
                  ? overColor
                  : colors[1],
          },
          barMaxWidth: 48,
        },
        // Keys only: no data, so they draw nothing and take no bar's room.
        {
          name: t("page.budget.budgetLegendMissed"),
          type: "line",
          data: [],
          color: overColor,
        },
        {
          name: t("page.budget.budgetLegendNotJudged"),
          type: "line",
          data: [],
          color: opacity(colors[1], 0.35),
        },
      ],
      animation: false,
    };
  }, [
    periodRows,
    summaryDay,
    chartData.length,
    chartInterval,
    displayDirection,
    t,
    showAmount,
  ]);

  const stat = "text-base font-semibold tabular-nums sm:text-lg";

  return (
    <Card id={anchorId} className="scroll-mt-4 gap-0 overflow-hidden">
      <CardHeader className="border-b pb-5">
        {/* min-w-0: as CardHeader's grid item this may shrink below the
            long account name's intrinsic width, so the name can give way
            from its path (w4/1109). */}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2 id={titleId} className="min-w-0 font-semibold">
              <AccountName
                account={group.account}
                title={group.account}
                className="text-base"
              />
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {intervalLabel}
              </Badge>
              <Badge id={currencyId} variant="outline" className="text-xs">
                {displayCurrency}
              </Badge>
            </div>
          </div>
          <LedgerWritePermission>
            <AddBudgetDialog
              open={isAddOpen}
              onOpenChange={setIsAddOpen}
              onSuccess={onUpdateSuccess}
              ledgerId={ledgerId}
              lockedAccount={group.account}
              lockedCurrency={group.currency}
              defaultInterval={currentInterval}
              defaultAmount={absDecimalNumber(
                parseBudgetAmount(group.amount).exact,
              )}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start pointer-coarse:h-11"
                  data-budget-update={`${group.account}::${group.currency}`}
                  aria-label={t("page.budget.budgetUpdateForAccount", {
                    account: group.account,
                    currency: displayCurrency,
                  })}
                >
                  <Pencil className="size-3.5" />
                  {t("page.budget.budgetAddEntry")}
                </Button>
              }
            />
          </LedgerWritePermission>
        </div>

        <div className="mt-5">
          {/* The period these figures are for; its line is held while the
              read settles, so nothing below it moves. */}
          <p className="h-4 text-xs font-medium text-muted-foreground">
            {periodName}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="flex h-5 items-center text-xs font-medium text-muted-foreground">
                {summarisingNow
                  ? t("page.budget.budgetCurrentBudget")
                  : t("page.budget.budget")}
              </p>
              <p className={stat}>
                {comparisonBudgetValue === null
                  ? "—"
                  : showAmount(comparisonBudgetValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex h-5 items-center text-xs font-medium text-muted-foreground">
                {t("page.budget.budgetLatestSpending")}
              </p>
              <p className={stat}>
                {latestActual === null || variance === null
                  ? "—"
                  : showAmount(latestActual)}
              </p>
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <div className="flex h-5 flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("page.budget.budgetVariance")}
                </p>
                {latestActual !== null && variance !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      varianceTone(varianceStatus, isFavorable),
                    )}
                  >
                    {varianceStatus === "above" &&
                      t("page.budget.budgetOverBudget")}
                    {varianceStatus === "below" &&
                      t("page.budget.budgetUnderBudget")}
                    {varianceStatus === "on" && t("page.budget.budgetOnBudget")}
                    {varianceStatus === "progress" &&
                      t("page.budget.budgetInProgress")}
                  </Badge>
                )}
              </div>
              <p
                className={cn(
                  stat,
                  varianceStatus !== "on" &&
                    isFavorable &&
                    "text-emerald-800 dark:text-emerald-300",
                  varianceStatus !== "on" && !isFavorable && "text-destructive",
                )}
              >
                {latestActual === null || variance === null
                  ? "—"
                  : `${isPositiveDecimalNumber(variance) ? "+" : ""}${showAmount(variance)}`}
              </p>
            </div>
          </div>
          <BudgetTargetBar
            percent={progressPercent}
            status={varianceStatus}
            favorable={isFavorable}
            className="mt-4"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {loading && <Skeleton className="h-[260px] w-full" />}
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

        {/* The dated targets the dashed line is drawn from: what a reader
            comes to change, named as such. */}
        <section aria-labelledby={targetsId} className="mt-5">
          <h3 id={targetsId} className="text-sm font-semibold">
            {t("page.budget.budgetTargetsHeading")}
          </h3>
          <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
            {t("page.budget.budgetTargetsHelp")}
          </p>
          <BudgetHistoryTable
            group={group}
            onDelete={onDelete}
            ariaLabelledBy={`${titleId} ${currencyId}`}
          />
        </section>

        {/* The canvas has no readable alternative, so the plotted periods are
            also offered as text. Only for a settled, non-empty read: a failed
            one must not look like a table of zeros. A disclosure keeps long
            histories out of the way while staying reachable by keyboard. */}
        {!loading && !error && periodRows.length > 0 && (
          <details
            className="group/periods mt-5 rounded-lg border"
            open={showPeriods}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              if (open !== showPeriods) setPeriodsOpen({ ledgerId, open });
            }}
          >
            <summary
              id={periodsId}
              className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden"
            >
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open/periods:rotate-90 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-open/periods:rotate-90"
              />
              {t("page.budget.budgetPeriodData")}
            </summary>
            <div className="overflow-x-auto border-t">
              <Table aria-labelledby={`${titleId} ${currencyId} ${periodsId}`}>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-24">
                      {t("page.budget.budgetPeriod")}
                    </TableHead>
                    <TableHead className="text-end">
                      {t("page.budget.budget")}
                    </TableHead>
                    <TableHead className="text-end">
                      {t("page.budget.budgetSpending")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodRows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="whitespace-nowrap text-base tabular-nums sm:text-sm">
                        {row.date}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-end text-base tabular-nums sm:text-sm">
                        {row.budget === null ? "—" : showAmount(row.budget)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-end text-base tabular-nums sm:text-sm">
                        {showAmount(row.actual)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        )}

        <div className="mt-4 flex justify-end">
          <a
            href={`#${summaryAnchor}`}
            onClick={(event) => {
              const summary = document.getElementById(summaryAnchor);
              if (!summary) return;
              event.preventDefault();
              summary.scrollIntoView({ block: "start" });
              summary.focus({ preventScroll: true });
            }}
            className="inline-flex min-h-6 items-center gap-1 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:min-h-11"
          >
            <ArrowUp aria-hidden="true" className="size-3.5" />
            {t("page.budget.budgetBackToSummary")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
