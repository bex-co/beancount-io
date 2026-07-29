import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import type { ChartInterval } from "@/common/types/chart";
import type { ComponentProps } from "react";
import { useTranslations } from "@/common/hooks/use-translations.ts";

interface IntervalSelectProps {
  value: ChartInterval;
  onValueChange: (value: ChartInterval) => void;
  placeholder?: string;
  className?: string;
  size?: ComponentProps<typeof SelectTrigger>["size"];
}

/**
 * Reusable interval select component for chart time periods
 * Provides a dropdown to select between yearly, quarterly, monthly, weekly, and daily intervals
 */
export function IntervalSelect({
  value,
  onValueChange,
  placeholder,
  className = "w-fit",
  size = "sm",
}: IntervalSelectProps) {
  const { t } = useTranslations();
  const defaultPlaceholder =
    placeholder || t("component.intervalSelect.placeholder");

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} size={size}>
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yearly">
          {t("component.intervalSelect.yearly")}
        </SelectItem>
        <SelectItem value="quarterly">
          {t("component.intervalSelect.quarterly")}
        </SelectItem>
        <SelectItem value="monthly">{t("userSettings.monthly")}</SelectItem>
        <SelectItem value="weekly">{t("userSettings.weekly")}</SelectItem>
        <SelectItem value="daily">
          {t("component.intervalSelect.daily")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
