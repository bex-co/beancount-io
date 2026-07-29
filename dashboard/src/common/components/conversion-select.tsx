import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import type { ConversionOption } from "@/common/types/chart";

interface ConversionSelectProps {
  value: ConversionOption;
  onValueChange: (value: ConversionOption) => void;
  placeholder?: string;
  className?: string;
  currency?: string;
}

/**
 * Conversion selector component for choosing how to display financial data
 * Used across balance sheet, income statement, and account pages
 */
export function ConversionSelect({
  value,
  onValueChange,
  placeholder,
  className = "w-fit",
  currency = "USD",
}: ConversionSelectProps) {
  const { t } = useTranslations();
  const defaultPlaceholder =
    placeholder || t("component.conversionSelect.placeholder");

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} size="sm">
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="at_cost">
          {t("component.conversionSelect.atCost")}
        </SelectItem>
        <SelectItem value="at_value">
          {t("component.conversionSelect.atMarketValue")}
        </SelectItem>
        <SelectItem value="units">
          {t("component.conversionSelect.units")}
        </SelectItem>
        <SelectItem value={currency}>
          {t("component.conversionSelect.convertedTo")} {currency}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
