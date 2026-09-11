import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { toWrittenConversion } from "@/common/lib/ledger-search-params/conversion";
import type { ConversionOption } from "@/common/types/chart";

interface PresentationCurrencySelectProps {
  value: ConversionOption;
  operatingCurrencies: readonly string[];
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * Ledger-wide presentation currency picker in the header search controls.
 */
export function PresentationCurrencySelect({
  value,
  operatingCurrencies,
  onValueChange,
  className = "w-fit",
}: PresentationCurrencySelectProps) {
  const { t } = useTranslations();

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(toWrittenConversion(next))}
    >
      <SelectTrigger
        className={className}
        size="sm"
        aria-label={t("component.searchControls.conversion")}
      >
        <SelectValue placeholder={t("component.searchControls.conversion")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="at_cost">
          {t("component.presentationCurrencySelect.ownCurrencies")}
        </SelectItem>
        {operatingCurrencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {t("component.conversionSelect.convertedTo")} {currency}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value="at_value">
          {t("component.conversionSelect.atMarketValue")}
        </SelectItem>
        <SelectItem value="units">
          {t("component.conversionSelect.units")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
