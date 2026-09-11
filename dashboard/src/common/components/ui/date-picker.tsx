"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, isValid } from "date-fns";

import { Button } from "@/common/components/ui/button";
import { Calendar } from "@/common/components/ui/calendar";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  DISPLAY_PATTERN,
  parseStrictCalendarDate,
  rollingCalendarBounds,
} from "./date-picker-utils";

function formatDate(date: Date | undefined, short = false) {
  if (!date || !isValid(date)) {
    return "";
  }

  if (short) {
    return format(date, DISPLAY_PATTERN);
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface DatePickerProps {
  id?: string;
  label?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Reusable date picker component using shadcn/ui Calendar and Popover
 * Provides both input field and calendar popup for date selection
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
}: DatePickerProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("common.selectDate");
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(value);
  const [inputValue, setInputValue] = React.useState(formatDate(value, true));
  // Keep the typed draft while the parent echoes an invalid/empty value.
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isEditing) return;
    setInputValue(formatDate(value, true));
    if (value && isValid(value)) {
      setMonth(value);
    }
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setIsEditing(true);
    setInputValue(next);

    const parsed = parseStrictCalendarDate(next);
    onChange(parsed);
    if (parsed) {
      setMonth(parsed);
    }
  };

  const commitDate = (date: Date | undefined) => {
    setIsEditing(false);
    onChange(date);
    setInputValue(formatDate(date, true));
    if (date) {
      setMonth(date);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    commitDate(date);
    setOpen(false);
  };

  const handleTodayClick = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    commitDate(today);
    setOpen(false);
  };

  const boundsAnchor =
    month ?? (value && isValid(value) ? value : undefined) ?? new Date();
  const { startMonth, endMonth } = rollingCalendarBounds(boundsAnchor);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <div className="relative flex gap-2 w-[128px]">
        <Input
          id={id}
          value={inputValue}
          placeholder={defaultPlaceholder}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onBlur={() => {
            setIsEditing(false);
            if (value && isValid(value)) {
              setInputValue(formatDate(value, true));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          required={required}
          aria-invalid={
            inputValue.trim().length > 0 && !parseStrictCalendarDate(inputValue)
              ? true
              : undefined
          }
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">{t("common.selectDate")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                className="h-7 text-xs"
              >
                {t("common.today")}
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              month={month}
              startMonth={startMonth}
              endMonth={endMonth}
              onMonthChange={setMonth}
              onSelect={handleCalendarSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
