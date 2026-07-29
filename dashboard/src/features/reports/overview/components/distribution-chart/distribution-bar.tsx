import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useMemo } from "react";
import { getChartColors, getLossColor } from "@/common/lib/chart/color";
import type { DistributionItem } from "./utils";

export function DistributionBar({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: DistributionItem[];
}) {
  const formatNum = useFormatNumber();
  // Negative bars use the loss red, so it must not also appear as a series
  // color — the palette's own red (--chart-8) is the same value.
  const negativeColor = getLossColor();
  const palette = getChartColors().filter((c) => c !== negativeColor);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    [items],
  );

  const chartHeight = `${Math.min(Math.max(sortedItems.length * 32 + 40, 180), 420)}px`;

  const option = {
    tooltip: {
      trigger: "item" as const,
      formatter: (params: unknown) => {
        const p = params as { name?: string; value?: unknown };
        const name = p.name ?? "";
        const value = Number(p.value);
        return `${name}: ${formatNum(value)}`;
      },
    },
    grid: {
      left: "3%",
      right: "8%",
      top: "3%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value" as const,
      splitLine: defaultSplitLine,
      axisLabel: {
        formatter: (v: number) => formatNum(v),
      },
    },
    yAxis: {
      type: "category" as const,
      data: sortedItems.map((d) => d.label),
      inverse: true,
      axisLabel: {
        width: 120,
        overflow: "truncate" as const,
      },
    },
    series: [
      {
        type: "bar" as const,
        data: sortedItems.map((d, i) => ({
          value: d.value,
          name: d.name,
          itemStyle: {
            color: d.value < 0 ? negativeColor : palette[i % palette.length],
          },
        })),
      },
    ],
    ...(sortedItems.length > 12
      ? {
          dataZoom: [
            {
              type: "inside" as const,
              orient: "vertical" as const,
              startValue: 0,
              endValue: 11,
            },
          ],
        }
      : {}),
    animation: true,
    animationDuration: 600,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ReactECharts
          option={option}
          isEmpty={sortedItems.length === 0}
          style={{ height: chartHeight, width: "100%" }}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
