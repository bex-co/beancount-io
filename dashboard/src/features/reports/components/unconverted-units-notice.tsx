import { useTranslations } from "@/common/hooks/use-translations";

export function UnconvertedUnitsNotice({
  currency,
  units,
}: {
  currency: string;
  units: string[];
}) {
  const { t } = useTranslations();

  if (units.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t("reports.unconvertedUnits", { currency, units: units.join(", ") })}
    </p>
  );
}
