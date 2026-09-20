import { buildDistributionData } from "../../lib/overview-utils";
import { ChartUnitScope } from "../chart-unit-scope";
import { groupDistributionData } from "./utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { DistributionBar } from "./distribution-bar";
import { DistributionPie } from "./distribution-pie";

/**
 * Renders a pie chart by default.
 * Falls back to a horizontal bar chart when any account has a negative balance,
 * since pie slices cannot meaningfully represent negative values.
 */
export function DistributionChart({
  title,
  description,
  data,
  inverse = false,
  primaryCurrency,
}: {
  title: string;
  description?: string;
  data: unknown;
  inverse?: boolean;
  /** The ledger's operating currency, preferred as the chart's unit. */
  primaryCurrency?: string | null;
}) {
  const { t } = useTranslations();
  const distribution = buildDistributionData(data, inverse, primaryCurrency);
  const items = groupDistributionData(
    distribution.items,
    t("common.otherColumn"),
  );
  const hasNegatives = items.some((d) => d.value < 0);

  // One root element, because both call sites are cells of a two-column grid.
  return (
    <div className="min-w-0">
      {hasNegatives ? (
        <DistributionBar
          title={title}
          description={description}
          items={items}
        />
      ) : (
        <DistributionPie
          title={title}
          description={description}
          items={items}
        />
      )}
      <ChartUnitScope unit={distribution.unit} units={distribution.units} />
    </div>
  );
}
