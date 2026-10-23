import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  negateDecimalNumber,
  sumDecimalNumbers,
} from "@/common/lib/beancount/decimal-number";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { type DataSeries } from "../lib/overview-utils";
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
}: {
  income: DataSeries;
  expenses: DataSeries;
  /** The ledger's operating currency, preferred as the chart's unit. */
  primaryCurrency?: string | null;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
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
  const exactTooltip = (amounts: string[]) => ({
    valueFormatter: (_value: unknown, dataIndex: number) =>
      formatNum(
        amounts[dataIndex],
        undefined,
        fractionDigitsOf(amounts[dataIndex]),
      ),
  });

  const isEmpty =
    !incomeValues.some((v) => v !== 0) && !expensesValues.some((v) => v !== 0);

  const option = {
    tooltip: {
      ...CONFINED_TOOLTIP,
      trigger: "axis" as const,
      axisPointer: { type: "shadow" as const },
    },
    legend: {
      data: [t("common.income"), t("common.expenses")],
      bottom: 0,
      type: "scroll" as const,
    },
    grid: {
      left: "0%",
      right: "0%",
      bottom: "25px",
      top: "10px",
      containLabel: true,
    },
    xAxis: { type: "category" as const, data: dates },
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
        data: incomeValues,
        tooltip: exactTooltip(incomeExact),
        emphasis: { focus: "series" as const },
      },
      {
        name: t("common.expenses"),
        type: "bar" as const,
        data: expensesValues,
        tooltip: exactTooltip(expensesExact),
        emphasis: { focus: "series" as const },
      },
    ],
    animation: true,
    animationDuration: 800,
  };

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        isEmpty={isEmpty}
        style={{ height: "250px", width: "100%" }}
        className="w-full"
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
                    className="whitespace-nowrap font-mono text-xs tabular-nums"
                  >
                    {date}
                  </TableHead>
                  {[income, expenses, net].map((value, column) => (
                    <TableCell
                      key={column}
                      className="text-end font-mono text-sm tabular-nums"
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
