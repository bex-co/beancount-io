import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import { type DataSeries, pickNumericAmount } from "../lib/overview-utils";

export function IncomeExpensesChart({
  income,
  expenses,
}: {
  income: DataSeries;
  expenses: DataSeries;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const dates: string[] =
    (income?.length ? income : expenses)?.map((d) => d.date) ?? [];
  const incomeValues = income?.map((d) => pickNumericAmount(d.balance)) ?? [];
  const expensesValues =
    expenses?.map((d) => pickNumericAmount(d.balance)) ?? [];

  const isEmpty =
    !incomeValues.some((v) => v !== 0) && !expensesValues.some((v) => v !== 0);

  const option = {
    tooltip: {
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
        data: incomeValues.map((v) => -v),
        emphasis: { focus: "series" as const },
      },
      {
        name: t("common.expenses"),
        type: "bar" as const,
        data: expensesValues,
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
    </div>
  );
}
