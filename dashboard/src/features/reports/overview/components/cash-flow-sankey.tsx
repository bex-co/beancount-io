import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { transformToSankeyData } from "../lib/sankey-data-transformer";
import { getSankeyNodeColor } from "../lib/sankey-colors";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";

interface CashFlowSankeyProps {
  incomeHierarchyData?: SerializableTreeNode;
  expensesHierarchyData?: SerializableTreeNode;
  assetsHierarchyData?: SerializableTreeNode;
  liabilitiesHierarchyData?: SerializableTreeNode;
  depth?: 1 | 2 | 3;
  /** Open-directive metadata per account (cash-flow-role declarations). */
  accountMeta?: AccountMetaMap;
}

export default function CashFlowSankey({
  incomeHierarchyData,
  expensesHierarchyData,
  assetsHierarchyData,
  liabilitiesHierarchyData,
  depth = 2,
  accountMeta,
}: CashFlowSankeyProps) {
  const isDark = useIsDarkTheme();
  const formatNum = useFormatNumber();

  const sankeyData = useMemo(() => {
    return transformToSankeyData({
      incomeHierarchyData,
      expensesHierarchyData,
      assetsHierarchyData,
      liabilitiesHierarchyData,
      depth,
      accountMeta,
    });
  }, [
    incomeHierarchyData,
    expensesHierarchyData,
    assetsHierarchyData,
    liabilitiesHierarchyData,
    depth,
    accountMeta,
  ]);

  // Apply colors to nodes
  const nodesWithColors = useMemo(() => {
    return sankeyData.nodes.map((node) => ({
      ...node,
      itemStyle: {
        color: getSankeyNodeColor(
          node.name,
          isDark,
          accountMeta?.get(node.name),
        ),
      },
    }));
  }, [sankeyData.nodes, isDark, accountMeta]);

  const option = {
    tooltip: {
      trigger: "item" as const,
      triggerOn: "mousemove" as const,
      formatter: (params: unknown) => {
        const p = params as {
          dataType?: string;
          data?: { source?: string; target?: string; value?: number };
          name?: string;
          value?: number;
        };

        if (p.dataType === "edge" && p.data) {
          const { source, target, value } = p.data;
          return `
            <strong>${source} → ${target}</strong><br/>
            ${formatNum(Number(value))} USD
          `;
        }

        if (p.dataType === "node") {
          return `<strong>${p.name}</strong>`;
        }

        return "";
      },
    },
    series: [
      {
        type: "sankey" as const,
        layout: "none" as const,
        emphasis: {
          focus: "adjacency" as const,
        },
        nodeAlign: "justify" as const,
        nodeGap: 12,
        nodeWidth: 20,
        layoutIterations: 0,
        lineStyle: {
          color: "gradient" as const,
          curveness: 0.5,
          opacity: 0.3,
        },
        label: {
          color: isDark ? "#ffffff" : "#000000",
          fontSize: 12,
        },
        data: nodesWithColors,
        links: sankeyData.links,
      },
    ],
    animation: true,
    animationDuration: 800,
  };

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height: "400px", width: "100%" }}
        className="w-full"
      />
    </div>
  );
}
