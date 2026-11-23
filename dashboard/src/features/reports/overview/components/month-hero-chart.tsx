import { useEffect, useRef, useState } from "react";
import type { ECharts } from "echarts/core";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { Amount } from "@/common/components/amount";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  negateDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import {
  CHART_PALETTE,
  getMoneyFlowColors,
  opacity,
} from "@/common/lib/chart/color";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { ChartDataTable } from "../../components/chart-data-table";
import {
  type DataSeries,
  type IntervalDataSeries,
  isPeriodIncomplete,
  netWorthTickFormatter,
  periodPage,
} from "../lib/overview-utils";
import {
  balanceToAmounts,
  chooseDisplayUnit,
  collectUnits,
  toExactAmount,
} from "../lib/unit-amounts";
import { ChartUnitScope } from "./chart-unit-scope";

/**
 * The page's one picture of the year: net worth as a line over each month's
 * income and spending as columns, on a shared month axis, with the month the
 * page shows banded through both. It stands where three charts used to (a
 * month timeline, the Net Worth card's line, an Income vs Expenses history),
 * so a month is seen once, with its level and its flows together.
 *
 * A click anywhere in a month's column selects it for the whole page. Twelve
 * months at a time: the page holding the selected one. Text reads the
 * ledger's own decimals; only the geometry uses doubles.
 */
export function MonthHeroChart({
  dates,
  selectedDate,
  onSelectDate,
  dataThrough,
  income,
  expenses,
  netWorth,
  primaryCurrency,
}: {
  /** Every month the flows cover, oldest first. */
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** The ledger's last day with data; a month past it is incomplete. */
  dataThrough: string;
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  /** Net worth at market value, one point per month. */
  netWorth: DataSeries;
  primaryCurrency: string;
}) {
  const { t, i18n } = useTranslations();
  const language = i18n.language;
  const formatNumber = useFormatNumber();
  const isDark = useIsDarkTheme();
  const flowColors = getMoneyFlowColors(isDark);
  const lineColor = CHART_PALETTE[isDark ? "dark" : "light"][0];

  // The axis's own width decides how many month labels fit.
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

  const amounts = [...netWorth, ...income, ...expenses].map(({ balance }) =>
    balanceToAmounts(balance),
  );
  const unit = chooseDisplayUnit(amounts, primaryCurrency) ?? primaryCurrency;
  const page = periodPage(dates, selectedDate);
  const selectedIndex = page.indexOf(selectedDate);
  const exactAt = (series: DataSeries, month: string) => {
    const point = series.find((entry) => entry.date.slice(0, 7) === month);
    return point ? toExactAmount(point.balance?.[unit]) : null;
  };
  // Income is recorded negative and drawn positive.
  const incomeExact = page.map((date) => {
    const amount = exactAt(income, date.slice(0, 7));
    return amount === null ? "0" : negateDecimalNumber(amount);
  });
  const expensesExact = page.map(
    (date) => exactAt(expenses, date.slice(0, 7)) ?? "0",
  );
  const worthExact = page.map((date) => exactAt(netWorth, date.slice(0, 7)));
  const incomplete = page.map((date) => isPeriodIncomplete(date, dataThrough));

  const money = (exact: string) =>
    formatNumber(exact, unit, fractionDigitsOf(exact));
  const compact = new Intl.NumberFormat(language, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const monthLabel = (date: string) =>
    formatLedgerDate(date, language, { month: "short", year: "numeric" }) ??
    date;
  // The year where the axis starts and where it turns; the month between.
  const axisLabel = (date: string) =>
    page.indexOf(date) <= 0 || date.slice(5, 7) === "01"
      ? monthLabel(date)
      : (formatLedgerDate(date, language, { month: "short" }) ?? date);

  const band = isDark ? "rgba(255,255,255,0.08)" : "rgba(22,26,18,0.05)";
  const bandArea = {
    show: selectedIndex >= 0,
    interval: 0,
    areaStyle: {
      color: page.map((_, index) =>
        index === selectedIndex ? band : "rgba(0,0,0,0)",
      ),
    },
  };
  // The selected month's columns carry their amounts, in short form.
  const selectedLabel = {
    show: true,
    position: "top" as const,
    fontSize: 11,
    fontWeight: 600 as const,
    color: isDark ? "#f4f5f0" : "#161a12",
    formatter: (params: { value: unknown }) =>
      compact.format(Number(params.value)),
  };
  // Nudged apart, so the pair's two labels never touch.
  const bars = (exact: string[], color: string, nudge: number) =>
    exact.map((amount, index) =>
      index === selectedIndex || incomplete[index]
        ? {
            value: Number(amount),
            ...(incomplete[index] && {
              itemStyle: { color: opacity(color, 0.45) },
            }),
            ...(index === selectedIndex && {
              label: { ...selectedLabel, offset: [nudge, 0] },
            }),
          }
        : Number(amount),
    );
  const exactTooltip = (amounts: Array<string | null>) => ({
    valueFormatter: (_value: unknown, dataIndex: number) => {
      const amount = amounts[dataIndex];
      return amount === null ? "—" : `${money(amount)} ${unit}`;
    },
  });
  const worthLabel = t("common.netWorth");
  const incomeLabel = t("common.income");
  const expensesLabel = t("common.expenses");
  const worthValues = worthExact.map((amount) =>
    amount === null ? null : Number(amount),
  );
  const marked = selectedIndex >= 0 ? worthValues[selectedIndex] : null;
  // The net worth scale in three or four round steps (60K, 80K, 100K…):
  // ECharts' own choice ruled the line's band with six, too dense for a
  // band 130px tall on a phone and busy on any screen.
  const worthScale = (() => {
    const finite = worthValues.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
    if (finite.length === 0) return {};
    const low = Math.min(...finite);
    const high = Math.max(...finite);
    if (high === low) return {};
    const rough = (high - low) / 3;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const fraction = rough / magnitude;
    const step =
      (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) *
      magnitude;
    return {
      min: Math.floor(low / step) * step,
      max: Math.ceil(high / step) * step,
      interval: step,
    };
  })();

  const selectAt = (chart: ECharts, point: [number, number]) => {
    for (const gridIndex of [0, 1]) {
      if (!chart.containPixel({ gridIndex }, point)) continue;
      const [index] = chart.convertFromPixel({ gridIndex }, point) as [
        number,
        number,
      ];
      const date = page[Math.round(index)];
      if (date) onSelectDate(date);
      return;
    }
  };

  const option = {
    color: [lineColor, flowColors.income, flowColors.expenses],
    tooltip: {
      ...CONFINED_TOOLTIP,
      trigger: "axis" as const,
      axisPointer: {
        type: "shadow" as const,
        label: {
          formatter: ({ value }: { value: unknown }) =>
            monthLabel(String(value)),
        },
      },
    },
    axisPointer: { link: [{ xAxisIndex: "all" as const }] },
    legend: {
      data: [worthLabel, incomeLabel, expensesLabel],
      top: 0,
      left: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 18,
      textStyle: { fontSize: 13 },
    },
    // Net worth above, the month's flows below: two scales, one month axis.
    grid: [
      { left: 0, right: 12, top: 52, height: "44%", containLabel: true },
      { left: 0, right: 12, bottom: 0, height: "30%", containLabel: true },
    ],
    xAxis: [
      {
        type: "category" as const,
        gridIndex: 0,
        data: page,
        boundaryGap: true,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitArea: bandArea,
      },
      {
        type: "category" as const,
        gridIndex: 1,
        data: page,
        axisTick: { show: false },
        axisLabel: {
          // Every month on a wide axis; every other one on a narrow one,
          // counted from the selected month so its label always shows.
          interval: narrow
            ? (index: number) => (index - Math.max(selectedIndex, 0)) % 2 === 0
            : 0,
          formatter: (date: string) =>
            date === selectedDate
              ? `{selected|${axisLabel(date)}}`
              : axisLabel(date),
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
        splitArea: bandArea,
      },
    ],
    yAxis: [
      {
        type: "value" as const,
        gridIndex: 0,
        scale: true,
        ...worthScale,
        splitLine: defaultSplitLine,
        axisLabel: { formatter: netWorthTickFormatter(language) },
      },
      {
        type: "value" as const,
        gridIndex: 1,
        splitNumber: 2,
        splitLine: defaultSplitLine,
        axisLabel: { formatter: (value: number) => compact.format(value) },
      },
    ],
    series: [
      {
        name: worthLabel,
        type: "line" as const,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: 0.25,
        symbol: "none" as const,
        connectNulls: true,
        lineStyle: { width: 3 },
        // A wash under the line, fading out well above the axis: it gives
        // the line weight without claiming an area down to a baseline the
        // scaled axis does not show.
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: opacity(lineColor, isDark ? 0.22 : 0.16) },
              { offset: 0.75, color: opacity(lineColor, 0) },
            ],
          },
        },
        data: worthValues,
        tooltip: exactTooltip(worthExact),
        markPoint:
          marked === null
            ? undefined
            : {
                silent: true,
                symbol: "circle",
                symbolSize: 11,
                // The selected month's net worth, read off the line.
                label: {
                  show: true,
                  position: "top" as const,
                  distance: 8,
                  fontSize: 13,
                  fontWeight: 600 as const,
                  color: isDark ? "#f4f5f0" : "#161a12",
                  formatter: () => compact.format(marked),
                },
                itemStyle: {
                  borderColor: isDark ? "#131713" : "#ffffff",
                  borderWidth: 2,
                },
                data: [{ name: "selected", coord: [selectedIndex, marked] }],
              },
      },
      {
        name: incomeLabel,
        type: "bar" as const,
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 18,
        data: bars(incomeExact, flowColors.income, -12),
        tooltip: exactTooltip(incomeExact),
      },
      {
        name: expensesLabel,
        type: "bar" as const,
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 18,
        data: bars(expensesExact, flowColors.expenses, 12),
        tooltip: exactTooltip(expensesExact),
      },
    ],
    animationDuration: 500,
  };

  const isEmpty =
    worthValues.every((value) => value === null) &&
    incomeExact.every((amount) => Number(amount) === 0) &&
    expensesExact.every((amount) => Number(amount) === 0);

  return (
    <div ref={container} className="w-full">
      <ReactECharts
        option={option}
        isEmpty={isEmpty}
        onSurfaceClick={selectAt}
        // Shorter on a phone, where the page around it is a column and a
        // 360px chart filled the whole screen.
        style={{ height: narrow ? "290px" : "360px", width: "100%" }}
        className="w-full cursor-pointer"
      />
      <ChartDataTable
        label={worthLabel}
        summary={t("page.accountReport.periodData")}
      >
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t("page.accountReport.period")}</TableHead>
            {[
              worthLabel,
              incomeLabel,
              expensesLabel,
              t("common.netProfit"),
            ].map((heading) => (
              <TableHead key={heading} scope="col" className="text-end">
                {heading}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.map((date, index) => (
            <TableRow key={date}>
              <TableHead
                scope="row"
                className="text-xs whitespace-nowrap tabular-nums"
              >
                {date}
              </TableHead>
              {[
                worthExact[index],
                incomeExact[index],
                expensesExact[index],
                sumDecimalNumbers([
                  incomeExact[index],
                  negateDecimalNumber(expensesExact[index]),
                ]),
              ].map((amount, column) => (
                <TableCell
                  key={column}
                  className="text-end text-sm tabular-nums"
                >
                  {amount === null ? (
                    "—"
                  ) : (
                    <Amount>
                      {money(amount)} {unit}
                    </Amount>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </ChartDataTable>
      <ChartUnitScope unit={unit} units={collectUnits(amounts)} />
    </div>
  );
}
