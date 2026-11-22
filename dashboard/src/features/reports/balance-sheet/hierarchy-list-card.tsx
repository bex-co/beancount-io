import { useId, useMemo } from "react";
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
  const titleId = useId();
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
    <section
      aria-labelledby={titleId}
      className="overflow-clip rounded-xl border bg-card shadow-sm"
    >
      <div className="border-b bg-muted/20 px-4 py-3">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <List className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className={className}>
        <HierarchyList
          data={nodes}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
          summaryRows={rows}
          ariaLabelledBy={titleId}
        />
      </div>
    </section>
  );
}
