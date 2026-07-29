import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import type { DistributionItem } from "./utils";

export function DistributionPie({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: DistributionItem[];
}) {
  const isDark = useIsDarkTheme();
  const formatNum = useFormatNumber();

  const option = {
    tooltip: {
      trigger: "item" as const,
      formatter: (params: unknown) => {
        const p = params as {
          name?: string;
          value?: unknown;
          percent?: number;
        };
        const name = p.name ?? "";
        const value = Number(p.value);
        const percent = p.percent ?? 0;
        return `${name}: ${formatNum(value)} (${percent}%)`;
      },
    },
    legend: { bottom: 0, type: "scroll" as const, show: false },
    series: [
      {
        type: "pie" as const,
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 1 },
        label: {
          show: true,
          formatter: "{b}: {d}%",
          overflow: "truncate" as const,
          color: isDark ? "#ffffff" : undefined,
        },
        data: items.map((d) => ({ name: d.label, value: d.value })),
      },
    ],
    animation: true,
    animationDuration: 800,
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
          isEmpty={items.length === 0}
          style={{ height: "250px", width: "100%" }}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
