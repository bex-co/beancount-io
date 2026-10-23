"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

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
import { useDateLocale } from "@/common/hooks/use-date-locale";
import { isCompositionKey } from "@/common/lib/keyboard/is-composition-key";
import {
  ISO_PATTERN,
  calendarToIsoDate,
  calendarToday,
  civilCalendarDateLib,
  formatIsoDate,
  getDisplayPattern,
  getPatternHint,
  isoDateToCalendar,
  parseStrictCalendarDate,
  rollingCalendarBounds,
  todayIsoDate,
} from "./date-picker-utils";

interface DatePickerProps {
  id?: string;
  label?: string;
  /** A canonical `yyyy-MM-dd` civil day, never a local instant (m32). */
  value: string | undefined;
  onChange: (date: string | undefined) => void;
  required?: boolean;
  className?: string;
  /** From FormControl: the form's own error state and message ids. */
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}

/**
 * Reusable date picker component using shadcn/ui Calendar and Popover
 * Provides both input field and calendar popup for date selection.
 * Values are `yyyy-MM-dd` days, so a day the browser timezone skipped (e.g.
 * 2011-12-30 in Pacific/Apia) stays enterable, in the calendar too.
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  required = false,
  className = "",
  "aria-invalid": formInvalid,
  "aria-describedby": describedBy,
}: DatePickerProps) {
  const { t } = useTranslations();
  // Same resolved locale as the calendar popup: one source for both halves
  // of this control, never the browser locale.
  const displayPattern = getDisplayPattern(useDateLocale());
  // The hint is derived from the pattern actually parsed, so the two cannot
  // drift apart; the tooltip additionally names the ISO fallback.
  const hint = getPatternHint(displayPattern);
  const isoHint = getPatternHint(ISO_PATTERN);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(
    value ? isoDateToCalendar(value) : undefined,
  );
  const [inputValue, setInputValue] = React.useState(
    formatIsoDate(value, displayPattern),
  );
  const showMonthOf = (day: string | undefined) => {
    if (!day) return;
    const shown = isoDateToCalendar(day);
    // An unparseable day must not become the calendar's month (w4/326).
    if (!Number.isNaN(shown.getTime())) setMonth(shown);
  };
  // Keep the typed draft while the parent echoes an invalid/empty value.
  const [isEditing, setIsEditing] = React.useState(false);
  // The draft was published as `undefined` (invalid, or cleared). Whatever
  // value the form echoes back — react-hook-form hands back its default — is
  // not an answer to it, so the draft stays until the user changes it or
  // picks a date. Keying on value identity alone lost the draft after an
  // earlier valid edit (w4/239). The first value seen while held is that
  // echo; a later, different value is a deliberate reset and still lands.
  const [heldDraft, setHeldDraft] = React.useState(false);
  const echoRef = React.useRef<{ value: string | undefined } | null>(null);

  // The draft as last typed, read by the sync effect without re-running it.
  const draftRef = React.useRef(inputValue);
  // Declared before the sync effect so it runs first in the same commit.
  React.useEffect(() => {
    draftRef.current = inputValue;
  }, [inputValue]);
  const syncedValueRef = React.useRef(value);
  const syncedPatternRef = React.useRef(displayPattern);

  React.useEffect(() => {
    if (isEditing) return;
    // An invalid draft stays visible until the value itself changes. After
    // we publish `undefined`, react-hook-form hands back the form's default
    // as `field.value`; overwriting the draft with it showed a valid-looking
    // date beside "Invalid input" (w0/005). An external reset still lands,
    // because it arrives as a different value.
    const valueChanged = syncedValueRef.current !== value;
    // The draft was written in the pattern in force before this run; judge
    // it there, so a language switch still re-renders a valid date (m22).
    const draftPattern = syncedPatternRef.current;
    syncedValueRef.current = value;
    syncedPatternRef.current = displayPattern;
    const draft = draftRef.current.trim();
    if (heldDraft) {
      if (echoRef.current === null || echoRef.current.value === value) {
        echoRef.current = { value };
        return;
      }
      echoRef.current = null;
      setHeldDraft(false);
      setInputValue(formatIsoDate(value, displayPattern));
      showMonthOf(value);
      return;
    }
    if (
      !valueChanged &&
      draft.length > 0 &&
      !parseStrictCalendarDate(draft, draftPattern)
    ) {
      return;
    }
    // A language change re-renders the same selected day in the new
    // pattern; the stored date is never reinterpreted (m22), and a
    // mid-edit draft is left untouched until blur or commit.
    setInputValue(formatIsoDate(value, displayPattern));
    showMonthOf(value);
  }, [value, displayPattern, isEditing, heldDraft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setIsEditing(true);
    setInputValue(next);

    const parsed = parseStrictCalendarDate(next, displayPattern);
    setHeldDraft(parsed === undefined);
    echoRef.current = null;
    onChange(parsed);
    showMonthOf(parsed);
  };

  const commitDate = (date: string | undefined) => {
    setIsEditing(false);
    setHeldDraft(false);
    echoRef.current = null;
    onChange(date);
    setInputValue(formatIsoDate(date, displayPattern));
    showMonthOf(date);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    commitDate(date ? calendarToIsoDate(date) : undefined);
    setOpen(false);
  };

  const handleTodayClick = () => {
    commitDate(todayIsoDate());
    setOpen(false);
  };

  const selected = value ? isoDateToCalendar(value) : undefined;
  const { startMonth, endMonth } = rollingCalendarBounds(
    month ?? selected ?? calendarToday(),
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <div className="relative flex gap-2 w-[160px]">
        <Input
          id={id}
          value={inputValue}
          placeholder={hint}
          title={t("common.dateInputFormat", { pattern: hint, iso: isoHint })}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onBlur={() => {
            setIsEditing(false);
            // Normalize only a draft that parses; invalid text stays for the
            // user to correct.
            if (value && parseStrictCalendarDate(inputValue, displayPattern)) {
              setInputValue(formatIsoDate(value, displayPattern));
            }
          }}
          onKeyDown={(e) => {
            // An IME's ArrowDown picks a candidate; opening the calendar would
            // move focus and end the composition (w4/288).
            if (e.key === "ArrowDown" && !isCompositionKey(e.nativeEvent)) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={
            formInvalid === true ||
            formInvalid === "true" ||
            (inputValue.trim().length > 0 &&
              !parseStrictCalendarDate(inputValue, displayPattern)) ||
            (required && heldDraft && !isEditing && !inputValue.trim())
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
            // The calendar is a dialog of its own; name it as its trigger is
            // named, since the month grid's name does not label it (w4/1011).
            aria-label={t("common.selectDate")}
            // Capped at the space Radix measured, so a short window scrolls
            // to every week instead of clipping them (w4/m40).
            className="w-auto max-h-(--radix-popover-content-available-height) overflow-y-auto overscroll-contain p-0"
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
              dateLib={civilCalendarDateLib}
              selected={selected}
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
