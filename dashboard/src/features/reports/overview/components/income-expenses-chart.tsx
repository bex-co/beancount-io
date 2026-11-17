import { useEffect, useRef, useState } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import type { ECharts } from "echarts/core";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  negateDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { getMoneyFlowColors, opacity } from "@/common/lib/chart/color";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { formatDateAxis } from "@/common/lib/chart/chart";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import {
  type DataSeries,
  isPeriodIncomplete,
  toLocalISODate,
} from "../lib/overview-utils";
import {
  type UnitAmounts,
  balanceToAmounts,
  chooseDisplayUnit,
  collectUnits,
} from "../lib/unit-amounts";
import { ChartUnitScope } from "./chart-unit-scope";
import { ChartDataTable } from "../../components/chart-data-table";
import { Amount } from "@/common/components/amount";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";

export function IncomeExpensesChart({
  income,
  expenses,
  primaryCurrency,
  dataThrough = toLocalISODate(new Date()),
  selectedDate,
  onSelectDate,
}: {
  income: DataSeries;
  expenses: DataSeries;
  /** The ledger's operating currency, preferred as the chart's unit. */
  primaryCurrency?: string | null;
  /**
   * The ledger's last day with data (`YYYY-MM-DD`): a period ending after it
   * is still in progress, or the data stops part-way through it.
   */
  dataThrough?: string;
  /** The period the page is showing; a band sits behind its column. */
  selectedDate?: string;
  /** A click on a period's column selects it for the cards above. */
  onSelectDate?: (date: string) => void;
}) {
  const { t, i18n } = useTranslations();
  const language = i18n.language;
  const formatNum = useFormatNumber();
  const isDark = useIsDarkTheme();
  // The axis's own width, not the window's, decides how many labels fit.
  const container = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < 560),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const flowColors = getMoneyFlowColors(isDark);
  const dates: string[] =
    (income?.length ? income : expenses)?.map((d) => d.date) ?? [];
  // Bars are compared against each other down a single axis, so this chart is
  // in the same position as the others: one unit, and say what it leaves out.
  const incomeAmounts = income?.map((d) => balanceToAmounts(d.balance)) ?? [];
  const expenseAmounts =
    expenses?.map((d) => balanceToAmounts(d.balance)) ?? [];
  const allAmounts = [...incomeAmounts, ...expenseAmounts];
  const unit = chooseDisplayUnit(allAmounts, primaryCurrency);
  const units = collectUnits(allAmounts);
  const inUnit = (amounts: UnitAmounts) =>
    (unit ? amounts.get(unit) : undefined) ?? "0";
  // Text reads these decimals and geometry their doubles, which would turn
  // 9007199254740993 into …992 and 4.00995 into 4.01 (w4/m53). Income is
  // recorded negative and drawn positive.
  const incomeExact = incomeAmounts.map((amounts) =>
    negateDecimalNumber(inUnit(amounts)),
  );
  const expensesExact = expenseAmounts.map(inUnit);
  const incomeValues = incomeAmounts.map((amounts) => -Number(inUnit(amounts)));
  const expensesValues = expensesExact.map(Number);
  // An ISO currency keeps its minor units (142,014.50 USD, not 142,014.5);
  // any other unit keeps the digits its decimal carried.
  const formatExact = (amount: string) =>
    formatNum(amount, unit ?? undefined, fractionDigitsOf(amount));
  // A period the data has not finished — the running month, or the one a
  // ledger stops part-way through — is drawn lighter and its tooltip says so,
  // so a half-month of spending does not read as a drop.
  const inProgress = dates.map((date) => isPeriodIncomplete(date, dataThrough));
  const monthLabel = (date: string) =>
    formatLedgerDate(date, language, { month: "short", year: "numeric" }) ??
    formatDateAxis(date, "monthly");
  // The axis names the year where it starts and where it turns, and the
  // month alone between: "Oct 2016, Nov, Dec, Jan 2017".
  const axisMonthLabel = (date: string) =>
    dates.indexOf(date) <= 0 || date.slice(5, 7) === "01"
      ? monthLabel(date)
      : (formatLedgerDate(date, language, { month: "short" }) ??
        formatDateAxis(date, "monthly"));
  const bars = (values: number[], color: string) =>
    values.map((value, index) =>
      inProgress[index]
        ? { value, itemStyle: { color: opacity(color, 0.45) } }
        : value,
    );
  // The selected period is marked by a band behind its column, not by fading
  // the others: every bar keeps its color. Split areas run one per category,
  // so a color per category paints just that one.
  const band = isDark ? "rgba(255,255,255,0.09)" : "rgba(22,26,18,0.05)";
  const selectedIndex =
    selectedDate === undefined ? -1 : dates.indexOf(selectedDate);
  // Every month's label on a wide axis; every other one on a narrow one,
  // counted from the selected month so its label is always one of them.
  const labelInterval =
    narrow && dates.length > 6
      ? (index: number) => (index - Math.max(selectedIndex, 0)) % 2 === 0
      : 0;
  // Anywhere in a period's column selects it: an expense bar a few pixels tall
  // is too small a target on its own.
  const selectAt = onSelectDate
    ? (chart: ECharts, point: [number, number]) => {
        if (!chart.containPixel({ gridIndex: 0 }, point)) return;
        const [index] = chart.convertFromPixel({ gridIndex: 0 }, point) as [
          number,
          number,
        ];
        const date = dates[Math.round(index)];
        if (date) onSelectDate(date);
      }
    : undefined;
  const inProgressLabel = t("page.overview.periodInProgress");
  const exactTooltip = (amounts: string[]) => ({
    valueFormatter: (_value: unknown, dataIndex: number) =>
      formatExact(amounts[dataIndex]),
  });

  const isEmpty =
    !incomeValues.some((v) => v !== 0) && !expensesValues.some((v) => v !== 0);

  const option = {
    color: [flowColors.income, flowColors.expenses],
    tooltip: {
      ...CONFINED_TOOLTIP,
      trigger: "axis" as const,
      axisPointer: {
        type: "shadow" as const,
        // The tooltip's heading: the month in the reader's language, and
        // whether it is still running.
        label: {
          formatter: ({ value }: { value: unknown }) => {
            const date = String(value);
            return inProgress[dates.indexOf(date)]
              ? `${monthLabel(date)} · ${inProgressLabel}`
              : monthLabel(date);
          },
        },
      },
    },
    // The key sits above the bars it names, not under the axis.
    legend: {
      data: [t("common.income"), t("common.expenses")],
      top: 0,
      right: 0,
      type: "scroll" as const,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
    },
    grid: {
      left: "0%",
      // Room for the last month's label, centred on the last bar.
      right: 20,
      bottom: 0,
      top: 36,
      containLabel: true,
    },
    xAxis: {
      type: "category" as const,
      data: dates,
      axisLabel: {
        interval: labelInterval,
        formatter: (date: string) =>
          date === selectedDate
            ? `{selected|${axisMonthLabel(date)}}`
            : axisMonthLabel(date),
        // The selected month's label wears the band's color as a pill, so
        // the band reads as a selection rather than a gap in the data.
        rich: {
          selected: {
            fontWeight: 600 as const,
            color: isDark ? "#f4f5f0" : "#161a12",
            backgroundColor: isDark
              ? "rgba(255,255,255,0.14)"
              : "rgba(22,26,18,0.08)",
            borderRadius: 4,
            padding: [3, 6],
          },
        },
      },
      splitArea:
        selectedIndex < 0
          ? undefined
          : {
              show: true,
              interval: 0,
              areaStyle: {
                color: dates.map((_, index) =>
                  index === selectedIndex ? band : "rgba(0,0,0,0)",
                ),
              },
            },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        formatter: (v: number) => (typeof v === "number" ? formatNum(v) : v),
      },
      splitLine: defaultSplitLine,
    },
    series: [
      {
        name: t("common.income"),
        type: "bar" as const,
        data: bars(incomeValues, flowColors.income),
        tooltip: exactTooltip(incomeExact),
        barMaxWidth: 14,
        emphasis: { focus: "series" as const },
      },
      {
        name: t("common.expenses"),
        type: "bar" as const,
        data: bars(expensesValues, flowColors.expenses),
        tooltip: exactTooltip(expensesExact),
        barMaxWidth: 14,
        emphasis: { focus: "series" as const },
      },
    ],
    animation: true,
    animationDuration: 800,
  };

  return (
    <div ref={container} className="w-full">
      <ReactECharts
        option={option}
        isEmpty={isEmpty}
        onSurfaceClick={selectAt}
        style={{ height: "250px", width: "100%" }}
        className={onSelectDate ? "w-full cursor-pointer" : "w-full"}
      />
      <ChartUnitScope unit={unit} units={units} />
      {unit && dates.length > 0 && (
        <ChartDataTable
          label={t("page.reports.incomeVsExpenses")}
          summary={t("page.accountReport.periodData")}
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {t("page.accountReport.period")}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {t("common.income")}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {t("common.expenses")}
              </TableHead>
              <TableHead scope="col" className="text-end">
                {t("common.netProfit")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {option.xAxis.data.map((date, index) => {
              const income = incomeExact[index];
              const expenses = expensesExact[index];
              const net =
                income === undefined || expenses === undefined
                  ? undefined
                  : sumDecimalNumbers([income, negateDecimalNumber(expenses)]);
              return (
                <TableRow key={date}>
                  <TableHead
                    scope="row"
                    className="whitespace-nowrap text-xs tabular-nums"
                  >
                    {date}
                  </TableHead>
                  {[income, expenses, net].map((value, column) => (
                    <TableCell
                      key={column}
                      className="text-end text-sm tabular-nums"
                    >
                      {value === undefined ? (
                        "—"
                      ) : (
                        <Amount>
                          {formatNum(value, unit, fractionDigitsOf(value))}{" "}
                          {unit}
                        </Amount>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </ChartDataTable>
      )}
    </div>
  );
}
