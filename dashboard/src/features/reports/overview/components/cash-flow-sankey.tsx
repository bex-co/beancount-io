import { useCallback, useMemo, useRef, useState } from "react";
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
import { getSankeyNodeColor, tintColor } from "../lib/sankey-colors";
import { ChartUnitScope } from "./chart-unit-scope";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { CONFINED_TOOLTIP } from "@/common/lib/chart/tooltip";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { sumDecimalNumbers } from "@/common/lib/beancount/decimal-number";
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

/**
 * Label ink per theme: the account's leaf in the text color, its amount
 * muted, and a halo in the card color so a link passing under a label never
 * reads as a strikethrough.
 */
const LABEL_INK = {
  light: { leaf: "#161a12", amount: "#646973", halo: "#ffffff" },
  dark: { leaf: "#ebebe7", amount: "#a1a398", halo: "#131713" },
};

/**
 * Narrower than this, the diagram has no room for labels beside it. Measured
 * on the diagram's own box, not the window: beside a sidebar a tablet gives
 * it a phone's width.
 */
const NARROW_WIDTH = 560;

/** Whether the diagram's box is narrow, and the ref that measures it. */
function useNarrowBox(): [boolean, (element: HTMLDivElement | null) => void] {
  const [narrow, setNarrow] = useState(false);
  const observer = useRef<ResizeObserver | null>(null);
  const measure = useCallback((element: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!element || typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < NARROW_WIDTH),
    );
    observer.current.observe(element);
  }, []);
  return [narrow, measure];
}

/**
 * A node's label: its own name (`Food`, not `Expenses:Food` — the side and
 * color already say which kind it is) and, where there is room, the amount
 * through it. The tooltip and Flows keep the full account name.
 */
const leafOf = (name: string) => name.slice(name.lastIndexOf(":") + 1);

function sankeyLabel(
  name: string,
  amount: string | undefined,
  qualified = false,
): string {
  const parts = name.split(":");
  // Two nodes with the same leaf (dividends from a broker and purchases at
  // it) say which they are by their root: "Income · ETrade".
  const text =
    qualified && parts.length > 1
      ? `${parts[0]} · ${parts.at(-1)}`
      : parts.at(-1);
  const leaf = `{leaf|${text}}`;
  return amount ? `${leaf}  {amount|${amount}}` : leaf;
}

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
  /** What the pending state says, when it waits for something else. */
  pendingLabel?: string;
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
  pendingLabel,
}: CashFlowSankeyProps) {
  const isDark = useIsDarkTheme();
  const [compactLabels, measureBox] = useNarrowBox();
  const ink = LABEL_INK[isDark ? "dark" : "light"];
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
      expandSingleSource: true,
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

  // What passes through each node, from its links' own decimals: everything
  // into a target, everything out of a source.
  const nodeTotals = useMemo(() => {
    const parts = new Map<string, string[]>();
    const add = (name: string, exact: string) =>
      parts.set(name, [...(parts.get(name) ?? []), exact]);
    for (const link of sankeyData.links) {
      add(link.target, link.exact);
      if (link.source !== CASH_FLOW_NODE) add(link.source, link.exact);
    }
    return new Map(
      [...parts].map(([name, amounts]) => [name, sumDecimalNumbers(amounts)]),
    );
  }, [sankeyData.links]);

  // Apply colors to nodes
  const nodesWithColors = useMemo(() => {
    const roots = hierarchyRoots({
      income: incomeHierarchyData,
      expenses: expensesHierarchyData,
      assets: assetsHierarchyData,
      liabilities: liabilitiesHierarchyData,
    });
    // Labels sit where no link runs under them: a source's to its left, the
    // hub's above it, every other node's to its right. A phone has no room
    // beside the diagram, so there they turn inward and sit on the links,
    // haloed, instead of being cut off at the screen's edge.
    const targets = new Set(sankeyData.links.map((link) => link.target));
    const labelPosition = (name: string): "top" | "right" | "left" =>
      name === CASH_FLOW_NODE
        ? "top"
        : targets.has(name) !== compactLabels
          ? "right"
          : "left";
    return sankeyData.nodes.map((node) => ({
      ...node,
      id: node.name,
      name: labelOf(node.name),
      label: { position: labelPosition(node.name) },
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
    sankeyData.links,
    labelOf,
    isDark,
    accountMeta,
    compactLabels,
    incomeHierarchyData,
    expensesHierarchyData,
    assetsHierarchyData,
    liabilitiesHierarchyData,
  ]);

  const nodeColors = new Map(
    nodesWithColors.map((node) => [node.id, node.itemStyle.color]),
  );
  const colorOf = (id: string) => nodeColors.get(id) ?? ink.amount;

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
            {pendingLabel ?? t("page.overview.cashFlowRolesPending")}
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
          // The link's own decimal, not the plotted double (w4/m53), in
          // the diagram's unit: USD keeps its cents, as in Flows.
          const { source, target, exact } = p.data;
          return `
            <strong>${labelOf(source)} → ${labelOf(target)}</strong><br/>
            ${formatNum(exact, sankeyData.unit ?? undefined, fractionDigitsOf(exact))}${sankeyData.unit ? ` ${sankeyData.unit}` : ""}
          `;
        }

        if (p.dataType === "node") {
          const id = (p.data as { id?: string } | undefined)?.id ?? p.name;
          const total = id ? nodeTotals.get(id) : undefined;
          return `<strong>${p.name}</strong>${
            total && sankeyData.unit
              ? `<br/>${formatNum(total, sankeyData.unit, fractionDigitsOf(total))} ${sankeyData.unit}`
              : ""
          }`;
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
        nodeGap: 14,
        nodeWidth: 12,
        // Room for the source labels on the left and the leaves on the
        // right with their amounts; on a narrow screen the labels are inside
        // the diagram, names only, and it takes the full width.
        left: compactLabels ? 2 : 150,
        right: compactLabels ? 2 : 190,
        top: 28,
        bottom: 8,
        layoutIterations: 0,
        // Each link takes its destination's color — where the money went —
        // instead of a source-to-target blend that turned green and orange
        // into mud.
        lineStyle: {
          color: "target" as const,
          curveness: 0.5,
          opacity: isDark ? 0.24 : 0.28,
        },
        label: {
          fontSize: 12,
          formatter: (params: { name: string; data?: unknown }) => {
            const id = (params.data as { id?: string } | null | undefined)?.id;
            const total =
              !compactLabels && id && id !== CASH_FLOW_NODE && sankeyData.unit
                ? nodeTotals.get(id)
                : undefined;
            return sankeyLabel(
              params.name,
              total &&
                formatNum(
                  total,
                  sankeyData.unit ?? undefined,
                  fractionDigitsOf(total),
                ),
              Boolean(id) &&
                sankeyData.nodes.filter(
                  (node) => leafOf(node.name) === leafOf(id ?? ""),
                ).length > 1,
            );
          },
          textBorderColor: ink.halo,
          textBorderWidth: 3,
          rich: {
            leaf: { color: ink.leaf, fontSize: 12, fontWeight: 500 },
            amount: { color: ink.amount, fontSize: 12 },
          },
        },
        data: nodesWithColors,
        // On a dark card a translucent orange reads as brown: each link takes
        // a lighter tint of where it goes, so it stays a quiet shade of it.
        // Cash drawn down flows in its own grey, not the hub's green, so it
        // is never read as income.
        links: sankeyData.links.map((link) =>
          link.source === SHORTFALL_NODE
            ? {
                ...link,
                lineStyle: {
                  color: isDark
                    ? tintColor(colorOf(SHORTFALL_NODE), 0.25)
                    : colorOf(SHORTFALL_NODE),
                },
              }
            : isDark
              ? {
                  ...link,
                  lineStyle: { color: tintColor(colorOf(link.target), 0.45) },
                }
              : link,
        ),
      },
    ],
    animation: true,
    animationDuration: 800,
  };

  return (
    <div ref={measureBox} className="w-full">
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
                <TableCell className="text-end text-sm tabular-nums">
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
