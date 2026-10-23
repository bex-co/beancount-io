import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  CASH_FLOW_NODE,
  SAVINGS_NODE,
  SHORTFALL_NODE,
  type SankeyLink,
  hierarchyRoots,
  transformToSankeyData,
} from "../lib/sankey-data-transformer";
import { getSankeyNodeColor } from "../lib/sankey-colors";
import { ChartUnitScope } from "./chart-unit-scope";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
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

  // The diagram's own nodes read in the reader's language; accounts keep
  // their names. ECharts keys nodes by `id`, so links still name identities.
  // Keyed on the strings, since `t` changes identity every render.
  const hubLabel = t("page.overview.cashFlow");
  const savingsLabel = t("page.overview.cashFlowSavings");
  const shortfallLabel = t("page.overview.cashFlowShortfall");
  const labelOf = useMemo(() => {
    const labels = new Map([
      [CASH_FLOW_NODE, hubLabel],
      [SAVINGS_NODE, savingsLabel],
      [SHORTFALL_NODE, shortfallLabel],
    ]);
    return (name: string) => labels.get(name) ?? name;
  }, [hubLabel, savingsLabel, shortfallLabel]);

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
      id: node.name,
      name: labelOf(node.name),
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
    labelOf,
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
          data?: SankeyLink;
          name?: string;
        };

        if (p.dataType === "edge" && p.data) {
          // The link's own decimal, not the plotted double (w4/m53).
          const { source, target, exact } = p.data;
          return `
            <strong>${labelOf(source)} → ${labelOf(target)}</strong><br/>
            ${formatNum(exact, undefined, fractionDigitsOf(exact))}${sankeyData.unit ? ` ${sankeyData.unit}` : ""}
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
                  {labelOf(link.source)}
                </TableHead>
                <TableCell>{labelOf(link.target)}</TableCell>
                <TableCell className="text-end font-mono text-sm tabular-nums">
                  <Amount>
                    {formatNum(
                      link.exact,
                      sankeyData.unit ?? undefined,
                      fractionDigitsOf(link.exact),
                    )}
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
