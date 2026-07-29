import { PieChart } from "lucide-react";
import { HierarchyTreeMap } from "@/features/reports/balance-sheet/hierarchy-tree-map";
import type { SerializableTreeNode } from "@/graphql/definitions";

interface HierarchyVisualizationCardProps {
  /** The hierarchy data to visualize */
  data: SerializableTreeNode;
  /** The title for the card */
  title: string;
  /** The description for the card */
  description: string;
  /** The title for the hierarchy tree map */
  hierarchyTitle: string;
  /** Whether to invert the visualization colors */
  inverse?: boolean;
  /** Additional CSS classes for the card content */
  className?: string;
  currency?: string;
}

/**
 * A reusable card component for displaying hierarchy data as a tree map visualization
 *
 * @param props - The component props
 * @returns A card with hierarchy tree map visualization
 */
export function HierarchyVisualizationCard({
  data,
  title,
  description,
  hierarchyTitle,
  inverse = false,
  className,
  currency = "USD",
}: HierarchyVisualizationCardProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className={className}>
        <HierarchyTreeMap
          data={data}
          title={hierarchyTitle}
          inverse={inverse}
          currency={currency}
        />
      </div>
    </div>
  );
}
