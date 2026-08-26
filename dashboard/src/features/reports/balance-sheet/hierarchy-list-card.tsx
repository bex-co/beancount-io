import { useMemo } from "react";
import { List } from "lucide-react";
import { HierarchyList } from "@/features/reports/balance-sheet/hierarchy-list";
import type {
  HierarchyListNode,
  HierarchySummaryRow,
} from "./hierarchy-list-types";

interface HierarchyListCardProps {
  /** The hierarchy data to display as a list: a single root or a forest */
  data: HierarchyListNode | HierarchyListNode[];
  /** The title for the card */
  title: string;
  /** The description for the card */
  description: string;
  /** Additional CSS classes for the card content */
  className?: string;
  primaryCurrency?: string;
  /** Sign-invert every row (tree and summary) — credit-side statements */
  inverted?: boolean;
  collapsePatterns?: string[];
  /** Plain total/summary rows rendered below the tree rows */
  summaryRows?: HierarchySummaryRow[];
}

/**
 * A reusable card component for displaying hierarchy data as a detailed list
 *
 * @param props - The component props
 * @returns A card with hierarchy list display
 */
export function HierarchyListCard({
  data,
  title,
  description,
  className,
  primaryCurrency = "USD",
  inverted,
  collapsePatterns,
  summaryRows,
}: HierarchyListCardProps) {
  // Stable identity: HierarchyList resets its expansion state whenever `data`
  // changes, so only rebuild when the input actually does.
  const nodes = useMemo(
    () =>
      (Array.isArray(data) ? data : [data]).map((node) => ({
        ...node,
        inverted,
      })),
    [data, inverted],
  );
  const rows = summaryRows?.map((row) => ({ inverted, ...row }));
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <List className="h-5 w-5" />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className={className}>
        <HierarchyList
          data={nodes}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
          summaryRows={rows}
        />
      </div>
    </div>
  );
}
