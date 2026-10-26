import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import { CHART_INTERVALS, type ChartInterval } from "@/common/types/chart";
import type { ComponentProps } from "react";
import { useTranslations } from "@/common/hooks/use-translations.ts";

const INTERVAL_LABEL_KEYS = {
  yearly: "component.intervalSelect.yearly",
  quarterly: "component.intervalSelect.quarterly",
  monthly: "userSettings.monthly",
  weekly: "userSettings.weekly",
  daily: "component.intervalSelect.daily",
} as const satisfies Record<ChartInterval, string>;

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
      {/* The trigger shows the selected value, so the placeholder never
          renders once a value exists and the control is left nameless. The
          same localized string names it. */}
      <SelectTrigger
        className={className}
        size={size}
        aria-label={defaultPlaceholder}
      >
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {CHART_INTERVALS.map((interval) => (
          <SelectItem key={interval} value={interval}>
            {t(INTERVAL_LABEL_KEYS[interval])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
