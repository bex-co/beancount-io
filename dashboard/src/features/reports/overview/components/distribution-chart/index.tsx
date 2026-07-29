import { buildDistributionData } from "../../lib/overview-utils";
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
  const items = groupDistributionData(
    buildDistributionData(data, inverse),
    t("common.otherColumn"),
  );
  const hasNegatives = items.some((d) => d.value < 0);

  if (hasNegatives) {
    return (
      <DistributionBar title={title} description={description} items={items} />
    );
  }

  return (
    <DistributionPie title={title} description={description} items={items} />
  );
}
