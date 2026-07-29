import { List } from "lucide-react";
import { HierarchyList } from "@/features/reports/balance-sheet/hierarchy-list";
import type { SerializableTreeNode } from "@/graphql/definitions";

interface HierarchyListCardProps {
  /** The hierarchy data to display as a list */
  data: SerializableTreeNode;
  /** The title for the card */
  title: string;
  /** The description for the card */
  description: string;
  /** Additional CSS classes for the card content */
  className?: string;
  primaryCurrency?: string;
  inverted?: boolean;
  collapsePatterns?: string[];
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
}: HierarchyListCardProps) {
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
          data={[{ ...data, inverted }]}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
        />
      </div>
    </div>
  );
}
