import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";

type HierarchyListNode = SerializableTreeNode & { inverted?: boolean };

interface HierarchyListProps {
  data: HierarchyListNode[];
  className?: string;
  primaryCurrency?: string;
  collapsePatterns?: string[];
}

interface TreeNodeProps {
  node: HierarchyListNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodePath: string) => void;
  primaryCurrency?: string;
}

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
  const usdBalance = String(balanceData[primaryCurrency] || "") || "0";
  if (usdBalance === "0")
    return <div className="text-sm text-muted-foreground font-mono">-</div>;
  const value = inverted ? -parseFloat(usdBalance) : parseFloat(usdBalance);
  return <div className="text-sm font-mono">{formatNum(value)}</div>;
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
  const formatNum = useFormatNumber();
  const currencyUpper = primaryCurrency?.toUpperCase();
  const currencyLower = primaryCurrency?.toLowerCase();

  // Get balances excluding the primary currency
  const otherBalances = useMemo(
    () =>
      Object.entries(balanceData)
        .filter(([key]) => key !== currencyUpper && key !== currencyLower)
        .map(([key, value]) => ({
          commodity: key,
          value: String(value || ""),
        })),
    [balanceData, currencyUpper, currencyLower],
  );

  if (otherBalances.length > 0) {
    return (
      <div className="space-y-1">
        {otherBalances.slice(0, 3).map(({ commodity, value }) => (
          <div key={commodity} className="text-sm">
            <span className="text-muted-foreground font-mono">
              {formatNum(inverted ? -parseFloat(value) : parseFloat(value))}
            </span>{" "}
            <span className="text-muted-foreground">{commodity}</span>
          </div>
        ))}
        {otherBalances.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{otherBalances.length - 3} more
          </div>
        )}
      </div>
    );
  }
  return <div className="text-sm text-muted-foreground font-mono">-</div>;
}

/**
 * Individual tree node component with collapsible functionality
 */
function TreeNode({
  node,
  level,
  expandedNodes,
  onToggle,
  primaryCurrency = "USD",
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const indentLevel = level * 20;
  const isExpanded = expandedNodes.has(node.account);
  const { ledgerOwner, ledgerName } = useLedger();
  // Use balance_children for the total value (includes all children)
  const balanceData: Record<string, unknown> =
    node.balanceChildren || node.balance || {};

  return (
    <div className="w-full">
      <div
        className="grid grid-cols-12 gap-3 items-center py-2 px-3 hover:bg-muted/50 border-b border-border cursor-pointer"
        onClick={hasChildren ? () => onToggle(node.account) : undefined}
      >
        {/* Account Column */}
        <div
          className="col-span-6 flex items-center gap-2 min-w-0"
          style={{ paddingLeft: `${indentLevel + 8}px` }}
        >
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
            <div className="w-6" /> // Spacer for alignment
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
              {node.account.split(":").pop() || node.account}
            </Link>
          </div>
        </div>

        {/* USD Column */}
        <div className="col-span-3 text-right">
          <PrimaryCurrencyColumn
            balanceData={balanceData}
            primaryCurrency={primaryCurrency}
            inverted={node.inverted}
          />
        </div>

        {/* Other Column */}
        <div className="col-span-3 text-right">
          <OtherBalancesColumn
            balanceData={balanceData}
            primaryCurrency={primaryCurrency}
            inverted={node.inverted}
          />
        </div>
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
  data,
  className,
  primaryCurrency = "USD",
  collapsePatterns = [],
}: HierarchyListProps) {
  const { t } = useTranslations();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() =>
    getInitialExpandedNodes(data || [], collapsePatterns),
  );

  // Update expanded nodes when data or collapse patterns change
  useEffect(() => {
    setExpandedNodes(getInitialExpandedNodes(data || [], collapsePatterns));
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

  if (!data || data.length === 0) {
    return (
      <div
        className={`text-center text-muted-foreground py-8 ${className || ""}`}
      >
        No data available
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
        <div className="grid grid-cols-12 gap-3 items-center py-2 px-3 bg-muted border-b border-border font-semibold text-sm text-muted-foreground">
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
      </div>
    </>
  );
}
