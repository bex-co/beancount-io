import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import type { DistributionItem } from "../../lib/overview-utils";
import { useId } from "react";
import { DistributionDataTable } from "./distribution-data-table";

export function DistributionPie({
  title,
  description,
  items,
  unit,
}: {
  title: string;
  description?: string;
  items: DistributionItem[];
  unit?: string | null;
}) {
  const isDark = useIsDarkTheme();
  const titleId = useId();
  const formatNum = useFormatNumber();

  const option = {
    tooltip: {
      trigger: "item" as const,
      formatter: (params: unknown) => {
        const p = params as {
          name?: string;
          percent?: number;
          data: { account?: string; exact: string };
        };
        // Slice labels stay compact so narrow slices do not overflow; the
        // tooltip names the account, because leaf names repeat across parents
        // — two USD balances, three BTC, two ETH on one crypto ledger.
        const name = p.data.account ?? p.name ?? "";
        // The slice's own decimal, not the plotted double (w4/m53).
        const amount = p.data.exact;
        const percent = p.percent ?? 0;
        return `${name}: ${formatNum(amount, undefined, fractionDigitsOf(amount))} (${percent}%)`;
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
        data: items.map((d) => ({
          name: d.label,
          value: d.value,
          account: d.name,
          exact: d.exact,
        })),
      },
    ],
    animation: true,
    animationDuration: 800,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ReactECharts
          option={option}
          isEmpty={items.length === 0}
          style={{ height: "250px", width: "100%" }}
          className="w-full"
        />
        <DistributionDataTable
          data={option.series[0].data}
          unit={unit}
          labelledBy={titleId}
        />
      </CardContent>
    </Card>
  );
}
