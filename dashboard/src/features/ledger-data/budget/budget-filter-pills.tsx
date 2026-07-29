import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";

export interface BudgetFilterOption {
  value: string;
  label: string;
}

interface BudgetFilterPillsProps {
  label: string;
  options: BudgetFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Compact segmented filter for the budget page. It wraps on narrow viewports
 * and exposes the selected value through aria-pressed.
 */
export function BudgetFilterPills({
  label,
  options,
  value,
  onChange,
  className,
}: BudgetFilterPillsProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 rounded-md px-3 text-xs text-muted-foreground",
                isSelected &&
                  "bg-background text-foreground shadow-xs ring-1 ring-border hover:bg-background",
              )}
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
