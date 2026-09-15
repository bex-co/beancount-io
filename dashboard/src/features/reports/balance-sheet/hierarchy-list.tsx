import { useState, useEffect, useMemo, type ReactNode } from "react";
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
  /** Accessible name when no heading id is available. */
  ariaLabel?: string;
  /** Prefer associating the table with an existing localized heading. */
  ariaLabelledBy?: string;
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

const ROW_CLASS = "border-b border-border hover:bg-muted/50";
const CELL_PAD = "py-2 px-3 align-middle";
const indentStyle = (level: number) => ({ paddingLeft: `${level * 20 + 8}px` });
/** Keeps rows without an expander aligned with rows that have one. */
const ExpanderSpacer = () => (
  <div className="w-6 shrink-0" aria-hidden="true" />
);

/** Missing or zero amounts ("", "0", "0.00", …) read as a dash. */
function isZeroAmount(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return text === "" || isZeroStatementAmount(text);
}

const Dash = () => (
  <span className="text-sm text-muted-foreground font-mono">-</span>
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
    <span className="text-sm font-mono tabular-nums whitespace-nowrap [overflow-wrap:normal]">
      {formatNum(inverted ? -value : value)}
    </span>
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
        <div
          key={commodity}
          className="text-sm whitespace-nowrap [overflow-wrap:normal]"
        >
          <span className="text-muted-foreground font-mono tabular-nums">
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

/** The two amount cells shared by tree rows and summary rows. */
function AmountCells({
  balanceData,
  primaryCurrency = "USD",
  inverted,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency?: string;
  inverted?: boolean;
}): ReactNode {
  return (
    <>
      <td className={cn(CELL_PAD, "w-[25%] text-right")}>
        <PrimaryCurrencyColumn
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={inverted}
        />
      </td>
      <td className={cn(CELL_PAD, "w-[25%] text-right")}>
        <OtherBalancesColumn
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={inverted}
        />
      </td>
    </>
  );
}

/**
 * Individual tree node: one table row plus recursively rendered children as
 * sibling rows (tables cannot nest rows).
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
    <>
      <tr
        className={cn(ROW_CLASS, hasChildren && "cursor-pointer")}
        onClick={hasChildren ? () => onToggle(node.account) : undefined}
      >
        <th
          scope="row"
          className={cn(CELL_PAD, "w-1/2 font-normal text-left")}
          style={indentStyle(level)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                className="shrink-0 p-1 hover:bg-muted rounded"
                aria-expanded={isExpanded}
                aria-label={t("common.toggleAccountChildren", {
                  account: node.account,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.account);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
        </th>

        <AmountCells
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={node.inverted}
        />
      </tr>

      {hasChildren && isExpanded
        ? node.children.map((child) => (
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
          ))
        : null}
    </>
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
    <tr className={cn(ROW_CLASS, row.bold && "font-semibold")}>
      <th
        scope="row"
        className={cn(CELL_PAD, "w-1/2 font-inherit text-left")}
        style={indentStyle(0)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ExpanderSpacer />
          {/* Prose label: wrap rather than truncate (account names truncate) */}
          <span className="text-sm break-words">{row.label}</span>
        </div>
      </th>

      <AmountCells
        balanceData={row.balance}
        primaryCurrency={primaryCurrency}
        inverted={row.inverted}
      />
    </tr>
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
 * Displays hierarchical data as a collapsible native table
 */
export function HierarchyList({
  data: dataProp,
  className,
  primaryCurrency = "USD",
  collapsePatterns = [],
  summaryRows = [],
  ariaLabel,
  ariaLabelledBy,
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

  const tableLabel =
    ariaLabel ?? (ariaLabelledBy ? undefined : t("common.accountColumn"));

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
        className={`hierarchy-scroll overflow-x-auto ${className || ""}`}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor:
            "hsl(var(--muted-foreground) / 0.3) hsl(var(--muted))",
        }}
      >
        {/*
          Keep amount columns wide enough that signed decimals stay one line;
          narrow viewports scroll horizontally instead of wrapping digits.
        */}
        <table
          className="w-full min-w-[40rem] border-collapse"
          aria-label={tableLabel}
          aria-labelledby={ariaLabelledBy}
        >
          <thead>
            <tr
              className={cn(
                "border-b border-border bg-muted font-semibold text-sm text-muted-foreground",
              )}
            >
              <th scope="col" className={cn(CELL_PAD, "w-1/2 text-left")}>
                {t("common.accountColumn")}
              </th>
              <th scope="col" className={cn(CELL_PAD, "w-[25%] text-right")}>
                {primaryCurrency}
              </th>
              <th scope="col" className={cn(CELL_PAD, "w-[25%] text-right")}>
                {t("common.otherColumn")}
              </th>
            </tr>
          </thead>
          <tbody>
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
              <SummaryRow
                key={index}
                row={row}
                primaryCurrency={primaryCurrency}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
