import { HierarchyVisualizationCard } from "@/features/reports/balance-sheet/hierarchy-visualization-card";
import { HierarchyListCard } from "@/features/reports/balance-sheet/hierarchy-list-card";
import type { SerializableTreeNode } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

interface HierarchySectionProps {
  /** The hierarchy data for both visualization and list */
  data: SerializableTreeNode;
  /** The section name (e.g., "Assets", "Liabilities", "Equity") */
  sectionName: string;
  /** The ledger name for interpolation */
  ledgerName: string;
  /** Whether to invert the visualization colors */
  inverse?: boolean;
  /** Additional CSS classes for the grid container */
  className?: string;
  primaryCurrency?: string;
}

/**
 * A reusable section component that displays hierarchy data in both visualization and list formats
 *
 * @param props - The component props
 * @returns A grid layout with hierarchy visualization and list cards
 */
export function HierarchySection({
  data,
  sectionName,
  ledgerName,
  inverse = false,
  className,
  primaryCurrency = "USD",
}: HierarchySectionProps) {
  const { t } = useTranslations();
  const visualizationTitle = t("page.reports.hierarchyTitle", {
    sectionName,
  });
  const listTitle = t("page.reports.hierarchyListTitle", {
    sectionName,
  });

  const visualizationDescription = t(
    "page.reports.hierarchyVisualizationDescription",
    {
      ledgerName,
      sectionName: sectionName.toLowerCase(),
    },
  );
  const listDescription = t("page.reports.hierarchyListDescription", {
    ledgerName,
    sectionName: sectionName.toLowerCase(),
  });

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className || ""}`}>
      <HierarchyVisualizationCard
        data={data}
        title={visualizationTitle}
        description={visualizationDescription}
        hierarchyTitle={sectionName}
        inverse={inverse}
        currency={primaryCurrency}
      />
      <HierarchyListCard
        data={data}
        title={listTitle}
        description={listDescription}
        primaryCurrency={primaryCurrency}
      />
    </div>
  );
}
