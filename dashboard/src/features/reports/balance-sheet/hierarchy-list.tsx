import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { cn } from "@/common/lib/utils/utils";
import { isZeroStatementAmount } from "@/features/reports/export/presentation";
import type {
  HierarchyListNode,
  HierarchySummaryRow,
} from "./hierarchy-list-types";

export type { HierarchyListNode, HierarchySummaryRow };

interface HierarchyListProps {
  data: HierarchyListNode[];
  className?: string;
  primaryCurrency?: string;
  collapsePatterns?: string[];
  summaryRows?: HierarchySummaryRow[];
}

interface TreeNodeProps {
  node: HierarchyListNode;
  level: number;
  /** The rendered parent's account; labels are relative to it. */
  parentAccount?: string;
  expandedNodes: Set<string>;
  onToggle: (nodePath: string) => void;
  primaryCurrency?: string;
}

/** Stable empty forest so a null/undefined `data` doesn't churn effect deps. */
const NO_NODES: HierarchyListNode[] = [];

/** Row shell shared by the header, tree rows, and summary rows. */
const ROW_CLASS =
  "grid grid-cols-12 gap-3 items-center py-2 px-3 border-b border-border";
const ACCOUNT_CELL_CLASS = "col-span-6 flex items-center gap-2 min-w-0";
const indentStyle = (level: number) => ({ paddingLeft: `${level * 20 + 8}px` });
/** Keeps rows without an expander aligned with rows that have one. */
const ExpanderSpacer = () => <div className="w-6" />;

/** Missing or zero amounts ("", "0", "0.00", …) read as a dash. */
function isZeroAmount(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return text === "" || isZeroStatementAmount(text);
}

const Dash = () => (
  <div className="text-sm text-muted-foreground font-mono">-</div>
);

function PrimaryCurrencyColumn({
  balanceData,
  primaryCurrency,
  inverted,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency: string;
  inverted?: boolean;
}) {
  const formatNum = useFormatNumber();
  const raw = balanceData[primaryCurrency];
  if (isZeroAmount(raw)) return <Dash />;
  const value = Number(raw);
  return (
    <div className="text-sm font-mono">
      {formatNum(inverted ? -value : value)}
    </div>
  );
}

function OtherBalancesColumn({
  balanceData,
  primaryCurrency = "USD",
  inverted,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency?: string;
  inverted?: boolean;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const currencyUpper = primaryCurrency?.toUpperCase();
  const currencyLower = primaryCurrency?.toLowerCase();

  // Non-primary balances; zero legs (e.g. a total whose IRAUSD entries cancel
  // out) are omitted rather than shown as "0 IRAUSD".
  const otherBalances = useMemo(
    () =>
      Object.entries(balanceData)
        .filter(
          ([key, value]) =>
            key !== currencyUpper &&
            key !== currencyLower &&
            !isZeroAmount(value),
        )
        .map(([commodity, value]) => ({ commodity, value: Number(value) })),
    [balanceData, currencyUpper, currencyLower],
  );

  if (otherBalances.length === 0) return <Dash />;
  return (
    <div className="space-y-1">
      {otherBalances.slice(0, 3).map(({ commodity, value }) => (
        <div key={commodity} className="text-sm">
          <span className="text-muted-foreground font-mono">
            {formatNum(inverted ? -value : value)}
          </span>{" "}
          <span className="text-muted-foreground">{commodity}</span>
        </div>
      ))}
      {otherBalances.length > 3 && (
        <div className="text-xs text-muted-foreground">
          {t("common.moreCount", { count: otherBalances.length - 3 })}
        </div>
      )}
    </div>
  );
}

/** The two amount columns shared by tree rows and summary rows. */
function AmountColumns({
  balanceData,
  primaryCurrency = "USD",
  inverted,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency?: string;
  inverted?: boolean;
}) {
  return (
    <>
      <div className="col-span-3 text-right">
        <PrimaryCurrencyColumn
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={inverted}
        />
      </div>
      <div className="col-span-3 text-right">
        <OtherBalancesColumn
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={inverted}
        />
      </div>
    </>
  );
}

/**
 * Individual tree node component with collapsible functionality
 */
function TreeNode({
  node,
  level,
  parentAccount,
  expandedNodes,
  onToggle,
  primaryCurrency = "USD",
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.account);
  const { ledgerOwner, ledgerName } = useLedger();
  const { t } = useTranslations();
  // Use balance_children for the total value (includes all children)
  const balanceData: Record<string, unknown> =
    node.balanceChildren || node.balance || {};
  // Label relative to the rendered parent; rows without one (roots, or a
  // forest mixing roots) show their full path.
  const label =
    parentAccount && node.account.startsWith(`${parentAccount}:`)
      ? node.account.slice(parentAccount.length + 1)
      : node.account;

  return (
    <div className="w-full">
      <div
        className={cn(ROW_CLASS, "hover:bg-muted/50 cursor-pointer")}
        onClick={hasChildren ? () => onToggle(node.account) : undefined}
      >
        {/* Account Column */}
        <div className={ACCOUNT_CELL_CLASS} style={indentStyle(level)}>
          {hasChildren ? (
            <button
              className="shrink-0 p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.account);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <ExpanderSpacer />
          )}

          <div className="flex-1 min-w-0 flex flex-row items-center">
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
              params={{
                ledgerOwner,
                ledgerName,
                accountName: node.account,
              }}
              className="font-mono font-medium text-sm text-primary truncate inline-block hover:text-primary/80"
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
            {node.roleSource === "declared" ? (
              <span
                className="ml-2 shrink-0 text-xs text-muted-foreground"
                title={t("page.cashFlow.declaredRoleTooltip")}
              >
                {t("page.cashFlow.declaredRoleBadge")}
              </span>
            ) : null}
          </div>
        </div>

        <AmountColumns
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={node.inverted}
        />
      </div>

      {hasChildren && isExpanded && (
        <div className="bg-muted/30">
          {node.children.map((child) => (
            <TreeNode
              key={(child as HierarchyListNode).account}
              node={{
                ...(child as HierarchyListNode),
                inverted: node.inverted,
              }}
              level={level + 1}
              parentAccount={node.account}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              primaryCurrency={primaryCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Plain summary row (e.g. a section total): label as text, amounts through
 * the same columns as tree rows. No account link, no expander.
 */
function SummaryRow({
  row,
  primaryCurrency = "USD",
}: {
  row: HierarchySummaryRow;
  primaryCurrency?: string;
}) {
  return (
    <div className={cn(ROW_CLASS, row.bold && "font-semibold")}>
      <div className={ACCOUNT_CELL_CLASS} style={indentStyle(0)}>
        <ExpanderSpacer />
        {/* Prose label: wrap rather than truncate (account names truncate) */}
        <span className="text-sm break-words">{row.label}</span>
      </div>

      <AmountColumns
        balanceData={row.balance}
        primaryCurrency={primaryCurrency}
        inverted={row.inverted}
      />
    </div>
  );
}

/**
 * Recursively collects all account paths from a tree node and its children
 */
function collectAllAccountPaths(
  node: SerializableTreeNode,
  paths: Set<string> = new Set(),
): Set<string> {
  paths.add(node.account);
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      collectAllAccountPaths(child as SerializableTreeNode, paths);
    });
  }
  return paths;
}

/**
 * Collects all account paths from an array of tree nodes
 */
function getAllAccountPaths(nodes: HierarchyListNode[]): Set<string> {
  const allPaths = new Set<string>();
  nodes.forEach((node) => {
    collectAllAccountPaths(node, allPaths);
  });
  return allPaths;
}

/**
 * Computes the initial set of expanded nodes, excluding accounts that match
 * any of the provided collapse patterns (regex strings).
 */
function getInitialExpandedNodes(
  nodes: HierarchyListNode[],
  collapsePatterns: string[],
): Set<string> {
  const allPaths = getAllAccountPaths(nodes);
  if (collapsePatterns.length === 0) return allPaths;
  const expanded = new Set<string>();
  for (const path of allPaths) {
    const shouldCollapse = collapsePatterns.some((pattern) => {
      try {
        return new RegExp(pattern).test(path);
      } catch {
        return false;
      }
    });
    if (!shouldCollapse) expanded.add(path);
  }
  return expanded;
}

/**
 * Hierarchy List Component
 * Displays hierarchical data as a collapsible list with parent-child relationships
 */
export function HierarchyList({
  data: dataProp,
  className,
  primaryCurrency = "USD",
  collapsePatterns = [],
  summaryRows = [],
}: HierarchyListProps) {
  const { t } = useTranslations();
  const data = dataProp ?? NO_NODES;

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() =>
    getInitialExpandedNodes(data, collapsePatterns),
  );

  // Update expanded nodes when data or collapse patterns change
  useEffect(() => {
    setExpandedNodes(getInitialExpandedNodes(data, collapsePatterns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, collapsePatterns.join(",")]);

  const handleToggle = (nodePath: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodePath)) {
        newSet.delete(nodePath);
      } else {
        newSet.add(nodePath);
      }
      return newSet;
    });
  };

  if (data.length === 0 && summaryRows.length === 0) {
    return (
      <div
        className={`text-center text-muted-foreground py-8 ${className || ""}`}
      >
        {t("common.noDataFound")}
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .hierarchy-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .hierarchy-scroll::-webkit-scrollbar-track {
            background: hsl(var(--muted));
            border-radius: 3px;
          }
          .hierarchy-scroll::-webkit-scrollbar-thumb {
            background: hsl(var(--muted-foreground) / 0.3);
            border-radius: 3px;
          }
          .hierarchy-scroll::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--muted-foreground) / 0.5);
          }
        `,
        }}
      />

      <div
        className={`hierarchy-scroll ${className || ""}`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor:
            "hsl(var(--muted-foreground) / 0.3) hsl(var(--muted))",
        }}
      >
        {/* Table Header */}
        <div
          className={cn(
            ROW_CLASS,
            "bg-muted font-semibold text-sm text-muted-foreground",
          )}
        >
          <div className="col-span-6">{t("common.accountColumn")}</div>
          <div className="col-span-3 text-right">{primaryCurrency}</div>
          <div className="col-span-3 text-right">{t("common.otherColumn")}</div>
        </div>

        {data.map((node) => (
          <TreeNode
            key={node.account}
            node={node}
            level={0}
            expandedNodes={expandedNodes}
            onToggle={handleToggle}
            primaryCurrency={primaryCurrency}
          />
        ))}

        {summaryRows.map((row, index) => (
          <SummaryRow key={index} row={row} primaryCurrency={primaryCurrency} />
        ))}
      </div>
    </>
  );
}
