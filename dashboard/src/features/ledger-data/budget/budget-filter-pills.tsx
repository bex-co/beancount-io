import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";
import { filterChip } from "@/common/components/filter-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";

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
  /** Said after the choices: what the chosen one means, in dates. */
  detail?: string;
}

/**
 * One filter's choices, in the ledger pages' shared chip style, its name
 * beside them. It wraps on narrow viewports and exposes the selected value
 * through aria-pressed.
 */
export function BudgetFilterPills({
  label,
  options,
  value,
  onChange,
  className,
  detail,
}: BudgetFilterPillsProps) {
  return (
    <div
      className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}
      role="group"
      aria-label={label}
    >
      <span aria-hidden="true" className="me-1 text-xs text-muted-foreground">
        {label}
      </span>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            className={filterChip(isSelected)}
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
          >
            {option.label}
          </Button>
        );
      })}
      {/* The choice answered where it was made. Its room is held while
          it is empty, so choosing a span never rewraps the toolbar and
          moves the chip just pressed. */}
      {detail !== undefined && (
        <span
          aria-live="polite"
          className="ms-1 min-w-40 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
        >
          {detail}
        </span>
      )}
    </div>
  );
}

/**
 * The same filter as one select, for a toolbar too narrow for its chips:
 * its name above it, the choices in a list.
 */
export function BudgetFilterSelect({
  label,
  options,
  value,
  onChange,
  className,
  detail,
}: BudgetFilterPillsProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label={label}
          className="h-9 w-full min-w-0 bg-background pointer-coarse:h-11"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span
        aria-live="polite"
        className="min-h-4 text-xs leading-4 text-muted-foreground tabular-nums"
      >
        {detail}
      </span>
    </label>
  );
}
