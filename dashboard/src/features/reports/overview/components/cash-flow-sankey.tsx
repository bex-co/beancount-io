import { useMemo } from "react";
import { ReactECharts } from "@/common/components/react-echarts";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  transformToSankeyData,
  SANKEY_CASH_NODE,
  SANKEY_HUB_NODE,
} from "../lib/sankey-data-transformer";
import { getSankeyNodeColor } from "../lib/sankey-colors";
import type {
  AccountMetaMap,
  CashFlowStatement,
} from "@/features/reports/cash-flow/lib/model";

const SANKEY_HEIGHT = "400px";

interface CashFlowSankeyProps {
  /** The period's cash-flow statement; undefined until it has loaded. */
  statement?: CashFlowStatement;
  /** The single unit every link is drawn in. */
  primaryCurrency: string;
  depth?: 1 | 2 | 3;
  /** Open-directive metadata per account (cash-flow-role declarations). */
  accountMeta?: AccountMetaMap;
  /**
   * The flows or the declarations are still loading. Declared roles are
   * authoritative, so the chart reserves its space instead of showing a
   * provisional layout as if it were final.
   */
  pending?: boolean;
}

export default function CashFlowSankey({
  statement,
  primaryCurrency,
  depth = 2,
  accountMeta,
  pending = false,
}: CashFlowSankeyProps) {
  const isDark = useIsDarkTheme();
  const formatNum = useFormatNumber();
  const { t } = useTranslations();

  const sankeyData = useMemo(
    () => transformToSankeyData({ statement, primaryCurrency, depth }),
    [statement, primaryCurrency, depth],
  );

  /**
   * Display labels per node id. The hub and cash nodes carry stable ids, so
   * their names are translated here rather than baked into the data — and the
   * cash node's wording follows the direction of its link, which is the whole
   * point of the node.
   */
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    map.set(SANKEY_HUB_NODE, t("page.overview.cashFlow"));
    const cashIsTarget = sankeyData.links.some(
      (link) => link.target === SANKEY_CASH_NODE,
    );
    map.set(
      SANKEY_CASH_NODE,
      cashIsTarget
        ? t("page.overview.cashFlowToCash")
        : t("page.overview.cashFlowFromCash"),
    );
    return map;
  }, [sankeyData.links, t]);

  const labelFor = (name: string | undefined) =>
    (name && labels.get(name)) || name || "";

  const nodesWithColors = useMemo(() => {
    return sankeyData.nodes.map((node) => ({
      ...node,
      itemStyle: {
        color: getSankeyNodeColor(node, isDark, accountMeta?.get(node.name)),
      },
    }));
  }, [sankeyData.nodes, isDark, accountMeta]);

  if (pending) {
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

  /**
   * Units with movement but no price to the presentation currency. Disclosed
   * rather than converted or dropped: a chart that silently omits a third of
   * the ledger's activity is worse than one that says so.
   */
  const caption =
    sankeyData.unshownUnits.length > 0
      ? t("page.overview.cashFlowUnshownUnits", {
          currency: primaryCurrency,
          units: sankeyData.unshownUnits.join(", "),
        })
      : null;

  if (sankeyData.links.length === 0) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center gap-2 text-center"
        style={{ height: SANKEY_HEIGHT }}
        data-testid="cash-flow-sankey-empty"
      >
        <p className="text-sm text-muted-foreground">
          {t("page.overview.cashFlowNoFlows", { currency: primaryCurrency })}
        </p>
        {caption ? (
          <p className="text-xs text-muted-foreground">{caption}</p>
        ) : null}
      </div>
    );
  }

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
            <strong>${labelFor(source)} → ${labelFor(target)}</strong><br/>
            ${formatNum(Number(value))} ${primaryCurrency}
          `;
        }

        if (p.dataType === "node") {
          return `<strong>${labelFor(p.name)}</strong>`;
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
          formatter: (params: unknown) =>
            labelFor((params as { name?: string }).name),
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
      {caption ? (
        <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
