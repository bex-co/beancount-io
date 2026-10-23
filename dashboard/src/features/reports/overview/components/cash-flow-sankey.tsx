import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  hierarchyRoots,
  transformToSankeyData,
} from "../lib/sankey-data-transformer";
import { getSankeyNodeColor } from "../lib/sankey-colors";
import { ChartUnitScope } from "./chart-unit-scope";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { ChartDataTable } from "../../components/chart-data-table";
import { Amount } from "@/common/components/amount";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";

const SANKEY_HEIGHT = "400px";

interface CashFlowSankeyProps {
  incomeHierarchyData?: SerializableTreeNode;
  expensesHierarchyData?: SerializableTreeNode;
  assetsHierarchyData?: SerializableTreeNode;
  liabilitiesHierarchyData?: SerializableTreeNode;
  depth?: 1 | 2 | 3;
  /** The ledger's operating currency, preferred as the diagram's unit. */
  primaryCurrency?: string | null;
  /** Open-directive metadata per account (cash-flow-role declarations). */
  accountMeta?: AccountMetaMap;
  /**
   * The declarations are still loading. Declared roles are authoritative, so
   * the chart reserves its space instead of showing the heuristic layout as
   * if it were final.
   */
  accountMetaPending?: boolean;
}

export default function CashFlowSankey({
  incomeHierarchyData,
  expensesHierarchyData,
  assetsHierarchyData,
  liabilitiesHierarchyData,
  depth = 2,
  primaryCurrency,
  accountMeta,
  accountMetaPending = false,
}: CashFlowSankeyProps) {
  const isDark = useIsDarkTheme();
  const formatNum = useFormatNumber();
  const { t } = useTranslations();

  const sankeyData = useMemo(() => {
    return transformToSankeyData({
      incomeHierarchyData,
      expensesHierarchyData,
      assetsHierarchyData,
      liabilitiesHierarchyData,
      depth,
      preferredCurrency: primaryCurrency,
      accountMeta,
    });
  }, [
    incomeHierarchyData,
    expensesHierarchyData,
    assetsHierarchyData,
    liabilitiesHierarchyData,
    depth,
    primaryCurrency,
    accountMeta,
  ]);

  // Apply colors to nodes
  const nodesWithColors = useMemo(() => {
    const roots = hierarchyRoots({
      income: incomeHierarchyData,
      expenses: expensesHierarchyData,
      assets: assetsHierarchyData,
      liabilities: liabilitiesHierarchyData,
    });
    return sankeyData.nodes.map((node) => ({
      ...node,
      itemStyle: {
        color: getSankeyNodeColor(
          node.name,
          isDark,
          accountMeta?.get(node.name),
          roots,
        ),
      },
    }));
  }, [
    sankeyData.nodes,
    isDark,
    accountMeta,
    incomeHierarchyData,
    expensesHierarchyData,
    assetsHierarchyData,
    liabilitiesHierarchyData,
  ]);

  if (accountMetaPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="cash-flow-sankey-pending"
        className="flex w-full items-center justify-center"
        style={{ height: SANKEY_HEIGHT }}
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">
            {t("page.overview.cashFlowRolesPending")}
          </p>
        </div>
      </div>
    );
  }

  const option = {
    tooltip: {
      ...CONFINED_TOOLTIP,
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
            ${formatNum(Number(value))}${sankeyData.unit ? ` ${sankeyData.unit}` : ""}
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
        style={{ height: SANKEY_HEIGHT, width: "100%" }}
        className="w-full"
      />
      <ChartUnitScope unit={sankeyData.unit} units={sankeyData.units} />
      {option.series[0].links.length > 0 && (
        <ChartDataTable
          label={t("page.overview.cashFlow")}
          summary={t("page.overview.chartFlows")}
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("common.from")}</TableHead>
              <TableHead scope="col">{t("common.to")}</TableHead>
              <TableHead scope="col" className="text-end">
                {t("page.accountReport.periodAmount")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {option.series[0].links.map((link, index) => (
              <TableRow key={`${link.source}-${link.target}-${index}`}>
                <TableHead scope="row" className="font-normal">
                  {link.source}
                </TableHead>
                <TableCell>{link.target}</TableCell>
                <TableCell className="text-end font-mono text-sm tabular-nums">
                  <Amount>
                    {formatNum(link.value, sankeyData.unit ?? undefined)}
                    {sankeyData.unit ? ` ${sankeyData.unit}` : ""}
                  </Amount>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ChartDataTable>
      )}
    </div>
  );
}
