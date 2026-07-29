import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select.tsx";
import type { ComponentProps } from "react";
import { useTranslations } from "@/common/hooks/use-translations.ts";

export type ChartMode = "stacked" | "single";

interface ChartModeSelectProps {
  value: ChartMode;
  onValueChange: (value: ChartMode) => void;
  placeholder?: string;
  className?: string;
  size?: ComponentProps<typeof SelectTrigger>["size"];
}

/**
 * Reusable chart mode select component for switching between stacked and single bars
 * Provides a dropdown to select between stacked bars and single bars visualization
 */
export function ChartModeSelect({
  value,
  onValueChange,
  placeholder,
  className = "w-fit",
  size = "sm",
}: ChartModeSelectProps) {
  const { t } = useTranslations();
  const defaultPlaceholder =
    placeholder || t("page.incomeStatement.selectChartMode");

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} size={size}>
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="stacked">
          {t("page.incomeStatement.stackedBars")}
        </SelectItem>
        <SelectItem value="single">
          {t("page.incomeStatement.singleBars")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
