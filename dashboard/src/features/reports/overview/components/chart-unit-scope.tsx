import { useTranslations } from "@/common/hooks/use-translations";
import { omittedUnits } from "../lib/unit-amounts";

/**
 * Names the units a chart is not showing.
 *
 * Renders nothing when the chart already accounts for every unit, so a
 * single-currency ledger sees no note at all.
 */
export function ChartUnitScope({
  unit,
  units,
}: {
  unit: string | null;
  units: string[];
}) {
  const { t } = useTranslations();
  const omitted = omittedUnits(units, unit);
  if (!unit || omitted.length === 0) return null;

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {t("page.overview.chartUnitScope", {
        unit,
        others: omitted.join(", "),
      })}
    </p>
  );
}
