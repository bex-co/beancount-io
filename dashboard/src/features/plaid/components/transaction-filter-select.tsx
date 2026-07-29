import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { Button } from "@/common/components/ui/button";
import { ChevronDown } from "lucide-react";

/** Radix rejects an empty SelectItem value, so "all" is the no-filter sentinel. */
export const ALL_FILTER = "all";

export interface FilterOption {
  value: string;
  label: string;
}

interface TransactionFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  /** Label for the "no filter" item, e.g. "All banks". */
  allLabel: string;
  /** Accessible name — the trigger carries no visible label. */
  ariaLabel: string;
}

/**
 * Dropdown that narrows the transaction review table to one facet of the
 * already-fetched rows. Options are derived from the rows by the caller, so a
 * bank or account with nothing left to review drops out of the list.
 */
export function TransactionFilterSelect({
  value,
  onValueChange,
  options,
  allLabel,
  ariaLabel,
}: TransactionFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      {/* aria-label belongs on the trigger: the Radix root renders no DOM node. */}
      <SelectTrigger className="w-45" aria-label={ariaLabel}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TransactionMultiFilterSelectProps {
  /** Picked values. Empty means "no filter" — every row passes. */
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: FilterOption[];
  /** Label for the item that clears the picks, e.g. "All bank accounts". */
  allLabel: string;
  /** What the closed trigger reads; the caller knows how to summarise a count. */
  triggerLabel: string;
  ariaLabel: string;
}

/**
 * Same job as TransactionFilterSelect, but several values can be active at
 * once. Radix Select is single-value only, so this is a dropdown of checkbox
 * items that stays open while picks are made.
 */
export function TransactionMultiFilterSelect({
  values,
  onValuesChange,
  options,
  allLabel,
  triggerLabel,
  ariaLabel,
}: TransactionMultiFilterSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label={ariaLabel}
          className="w-45 justify-between font-normal"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* preventDefault keeps the menu open, so several can be ticked in a row */}
        <DropdownMenuCheckboxItem
          checked={values.length === 0}
          onCheckedChange={() => onValuesChange([])}
          onSelect={(event) => event.preventDefault()}
        >
          {allLabel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={values.includes(option.value)}
            onCheckedChange={(checked) =>
              onValuesChange(
                checked
                  ? [...values, option.value]
                  : values.filter((value) => value !== option.value),
              )
            }
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
