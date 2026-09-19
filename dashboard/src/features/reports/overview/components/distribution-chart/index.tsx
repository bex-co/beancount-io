import { buildDistributionData } from "../../lib/overview-utils";
import { omittedUnits } from "../../lib/unit-amounts";
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
}: {
  title: string;
  description?: string;
  data: unknown;
  inverse?: boolean;
}) {
  const { t } = useTranslations();
  const distribution = buildDistributionData(data, inverse);
  const items = groupDistributionData(
    distribution.items,
    t("common.otherColumn"),
  );
  const hasNegatives = items.some((d) => d.value < 0);

  // Percentages here divide by the sum of the slices, so a balance in another
  // unit cannot join them. Name the ones left out instead of absorbing them
  // into a slice or dropping them without a word.
  const omitted = omittedUnits(distribution.units, distribution.unit);
  const scopeNote =
    distribution.unit && omitted.length > 0 ? (
      <p className="mt-2 text-xs text-muted-foreground">
        {t("page.overview.chartUnitScope", {
          unit: distribution.unit,
          others: omitted.join(", "),
        })}
      </p>
    ) : null;

  if (hasNegatives) {
    return (
      <>
        <DistributionBar
          title={title}
          description={description}
          items={items}
        />
        {scopeNote}
      </>
    );
  }

  return (
    <>
      <DistributionPie title={title} description={description} items={items} />
      {scopeNote}
    </>
  );
}
