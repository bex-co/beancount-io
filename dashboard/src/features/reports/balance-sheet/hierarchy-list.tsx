import { useState, useEffect, useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
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

const ROW_CLASS =
  "border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors";
const CELL_PAD = "py-2 px-2.5 sm:px-3 align-middle";
/**
 * Depth indents from the leading edge: `paddingLeft` indented nothing in RTL
 * (Persian), where it padded the trailing side and every depth ended flush.
 */
const indentStyle = (level: number) => ({
  paddingInlineStart: `${level * 20 + 8}px`,
});
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
      {formatNum(
        inverted ? -value : value,
        primaryCurrency,
        fractionDigitsOf(String(raw)),
      )}
    </span>
  );
}

function OtherBalancesColumn({
  balanceData,
  primaryCurrency = "USD",
  inverted,
  label,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency?: string;
  inverted?: boolean;
  /** The account or summary row this cell belongs to, for the control's name. */
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
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
        .map(([commodity, value]) => ({
          commodity,
          value: Number(value),
          digits: fractionDigitsOf(String(value)),
        })),
    [balanceData, currencyUpper, currencyLower],
  );

  if (otherBalances.length === 0) return <Dash />;
  // The compact form keeps wide rows readable, but the count used to be inert
  // text: it advertised amounts with no way to see them. Revealing them in
  // place keeps the table relationships and the reader's focus intact, which a
  // popover over a horizontally scrolling table would not.
  const shown = expanded ? otherBalances : otherBalances.slice(0, 3);
  return (
    <div className="space-y-1">
      {shown.map(({ commodity, value, digits }) => (
        <div
          key={commodity}
          className="text-sm whitespace-nowrap [overflow-wrap:normal]"
        >
          <span className="text-muted-foreground font-mono tabular-nums">
            {formatNum(inverted ? -value : value, commodity, digits)}
          </span>{" "}
          <span className="text-muted-foreground">{commodity}</span>
        </div>
      ))}
      {otherBalances.length > 3 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((open) => !open);
          }}
          aria-expanded={expanded}
          aria-label={t("common.otherBalancesLabel", { account: label ?? "" })}
          className="cursor-pointer text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {expanded
            ? t("common.showLess")
            : t("common.moreCount", { count: otherBalances.length - 3 })}
        </button>
      )}
    </div>
  );
}

/** The two amount cells shared by tree rows and summary rows. */
function AmountCells({
  balanceData,
  primaryCurrency = "USD",
  inverted,
  label,
}: {
  balanceData: Record<string, unknown>;
  primaryCurrency?: string;
  inverted?: boolean;
  label?: string;
}): ReactNode {
  return (
    <>
      <td className={cn(CELL_PAD, "w-px text-end whitespace-nowrap")}>
        <PrimaryCurrencyColumn
          balanceData={balanceData}
          primaryCurrency={primaryCurrency}
          inverted={inverted}
        />
      </td>
      <td className={cn(CELL_PAD, "w-px text-end whitespace-nowrap")}>
        <OtherBalancesColumn
          label={label}
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
          className={cn(CELL_PAD, "min-w-0 font-normal text-start")}
          style={indentStyle(level)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
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
                className="inline-flex min-h-6 min-w-6 max-w-full items-center font-mono font-medium text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{label}</span>
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
          label={node.account}
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
    <tr className={cn(ROW_CLASS, row.bold && "font-semibold bg-muted/20")}>
      <th
        scope="row"
        className={cn(CELL_PAD, "min-w-0 font-inherit text-start")}
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
        label={row.label}
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

      {/* The table is wider than a half-width card (40rem), so its Other
          column often sits past the edge. A named, focusable region lets
          keyboard users scroll to it even when the table has no links, as
          in summary-only cards (w0/014). */}
      <div className="relative">
        <div
          role="region"
          tabIndex={0}
          aria-label={tableLabel}
          aria-labelledby={ariaLabelledBy}
          className={`@container hierarchy-scroll overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className || ""}`}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor:
              "hsl(var(--muted-foreground) / 0.3) hsl(var(--muted))",
          }}
        >
          <table
            className="w-full table-auto border-collapse"
            aria-label={tableLabel}
            aria-labelledby={ariaLabelledBy}
          >
            <thead>
              <tr
                className={cn(
                  "border-b border-border bg-muted/40 font-medium text-xs text-muted-foreground",
                )}
              >
                <th scope="col" className={cn(CELL_PAD, "text-start")}>
                  {t("common.accountColumn")}
                </th>
                <th
                  scope="col"
                  className={cn(CELL_PAD, "w-px text-end whitespace-nowrap")}
                >
                  {primaryCurrency}
                </th>
                <th
                  scope="col"
                  className={cn(CELL_PAD, "w-px text-end whitespace-nowrap")}
                >
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 w-6 bg-gradient-to-l from-card to-transparent sm:hidden"
        />
      </div>
    </>
  );
}
