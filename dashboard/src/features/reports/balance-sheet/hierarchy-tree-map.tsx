import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import type {
  EChartsOption,
  TooltipComponentFormatterCallback,
  TooltipComponentFormatterCallbackParams,
} from "echarts";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { getTreeMapColors } from "@/common/lib/chart/color";
import { useFormatNumber } from "@/common/hooks/use-format-number";

interface HierarchyTreeMapProps {
  data: SerializableTreeNode;
  title: string;
  className?: string;
  inverse?: boolean;
  currency?: string;
}

interface TreeMapData {
  name: string;
  value: number;
  children?: TreeMapData[];
  itemStyle?: {
    color?: string;
  };
}

const styles = { height: "250px", width: "100%" };

const slimSerializableTreeNode = (
  data: SerializableTreeNode,
  currency: string,
): SerializableTreeNode => {
  const balance = {
    [currency]: data.balance[currency],
  };
  const balanceChildren = {
    [currency]: data.balanceChildren[currency],
  };
  return {
    ...data,
    balance,
    balanceChildren,
    children:
      data.children && Array.isArray(data.children)
        ? data.children.map((child) =>
            slimSerializableTreeNode(child as SerializableTreeNode, currency),
          )
        : undefined,
  } as SerializableTreeNode;
};

/**
 * Hierarchy Tree Map Component
 * Displays hierarchical data as a tree map visualization
 */
export function HierarchyTreeMap({
  data: initialData,
  title,
  className,
  inverse,
  currency = "USD",
}: HierarchyTreeMapProps) {
  const formatNum = useFormatNumber();
  const chartOption = useMemo((): EChartsOption => {
    if (!initialData) {
      return {
        series: [],
      };
    }

    const data = slimSerializableTreeNode(initialData, currency);

    // Get color palette (HCL colors for perceptual uniformity)
    const treeMapColors = getTreeMapColors();

    // Track account-to-color assignments (like D3's scaleOrdinal)
    const accountColorMap = new Map<string, string>();
    let colorIndex = 0;

    // Helper to get or assign a color for an account (like D3 scaleOrdinal)
    const getOrAssignColor = (accountName: string): string => {
      if (!accountColorMap.has(accountName)) {
        accountColorMap.set(
          accountName,
          treeMapColors[colorIndex % treeMapColors.length],
        );
        colorIndex++;
      }
      return accountColorMap.get(accountName)!;
    };

    // Fava's color assignment strategy:
    // - Depth 1 nodes: use their own account name for color lookup
    // - Deeper nodes: use parent's account name (inherit parent color)
    const getAccountColor = (
      accountName: string,
      depth: number,
      parentAccount?: string,
    ): string => {
      if (depth === 1 || !parentAccount) {
        // Depth 1: assign unique color based on own account name
        return getOrAssignColor(accountName);
      }
      // Deeper levels: use parent's account name (inherit parent color)
      return getOrAssignColor(parentAccount);
    };

    // Convert tree data to tree map format with color assignment
    const convertToTreeMapData = (
      node: SerializableTreeNode,
      depth = 0,
      parentAccount?: string,
    ): TreeMapData => {
      // Use balance_children for the total value (includes all children)
      const totalValue = Object.values(node.balanceChildren || {}).reduce(
        (sum: number, val: unknown) => {
          return sum + parseFloat(String(val || "0"));
        },
        0,
      );

      const children =
        node.children && Array.isArray(node.children)
          ? node.children.map((child) =>
              convertToTreeMapData(
                child as SerializableTreeNode,
                depth + 1,
                node.account,
              ),
            )
          : [];

      const color = getAccountColor(node.account, depth, parentAccount);

      return {
        name: node.account,
        value: inverse ? -totalValue : totalValue,
        children: children.length > 0 ? children : undefined,
        itemStyle: {
          color,
        },
      };
    };

    const treeMapData = convertToTreeMapData(data);

    if (treeMapData.value === 0) {
      return {
        series: [],
      };
    }

    // Calculate total value for percentage calculations
    const totalValue = treeMapData.value;

    return {
      backgroundColor: "transparent",
      title: {
        text: title,
        left: "center",
        top: "2%",
        textStyle: {
          fontSize: 18,
          fontWeight: "bold",
          color: "var(--foreground)",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: ((params: TooltipComponentFormatterCallbackParams) => {
          if (Array.isArray(params)) {
            return "";
          }
          const { name, value } = params;
          const numValue = typeof value === "number" ? value : 0;
          const percentage =
            totalValue !== 0
              ? ((Math.abs(numValue) / Math.abs(totalValue)) * 100).toFixed(1)
              : "0.0";

          const formattedValue = formatNum(Math.round(numValue * 100) / 100);

          // Fava-style tooltip: "{value} USD ({percentage}%) <em>{account}</em>"
          return `<div style="padding: 6px 8px; font-size: 13px;">
            ${formattedValue} ${currency} (${percentage}%)
            <br/><em style="color: var(--muted-foreground); font-style: italic;">${name}</em>
          </div>`;
        }) as TooltipComponentFormatterCallback<TooltipComponentFormatterCallbackParams>,
      },
      grid: {
        top: "10%",
        left: "2%",
        right: "2%",
        bottom: "5%",
        containLabel: true,
      },
      series: [
        {
          type: "treemap",
          data: [treeMapData],
          roam: false,
          nodeClick: "zoomToNode",
          top: "0%",
          bottom: "5%",
          left: "0%",
          right: "0%",
          breadcrumb: {
            show: false, // Hide breadcrumb navigation
          },
          label: {
            show: true,
            formatter: (params: { name?: string }) => {
              const name = params.name || "";
              // Show only the last part of the account name (after last ":")
              const shortName =
                typeof name === "string" ? name.split(":").pop() || name : name;
              return shortName;
            },
            fontSize: 12,
            fontWeight: "normal",
            color: "#000", // Dark text for better contrast on HCL colors
            overflow: "truncate",
            ellipsis: "...",
          },
          upperLabel: {
            show: false, // Fava doesn't show upper labels
          },
          itemStyle: {
            borderWidth: 0,
            gapWidth: 2, // Fava uses paddingInner(2)
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: "bold",
            },
            itemStyle: {
              // Subtle emphasis without shadows
              opacity: 0.85,
            },
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 0,
                gapWidth: 2,
              },
            },
            {
              itemStyle: {
                borderWidth: 0,
                gapWidth: 2,
              },
            },
          ],
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [initialData, title, inverse, currency, formatNum]);
  return (
    <div className={className}>
      <ReactECharts option={chartOption} style={styles} />
    </div>
  );
}
