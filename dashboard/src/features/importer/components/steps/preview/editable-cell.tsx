/**
 * EditableCell - Reusable inline editing cell component
 * Supports click-to-edit pattern with keyboard navigation
 */

import { useState, useRef, useEffect, useId } from "react";
import { Input } from "@/common/components/ui/input";
import { Textarea } from "@/common/components/ui/textarea";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "number" | "date";
  /**
   * Edit in a textarea instead of a single-line input. Required for any field
   * that may hold embedded newlines (quoted multiline CSV descriptions): a
   * native single-line input silently strips them from the DOM value, so
   * opening such a cell would flatten the parsed text.
   */
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}

export function EditableCell({
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  multiline = false,
  className,
  disabled = false,
}: EditableCellProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const finishingRef = useRef(false);
  const restoreFocusRef = useRef(false);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus the editor when entering edit mode
  useEffect(() => {
    const editor = multiline ? textareaRef.current : inputRef.current;
    if (isEditing && editor) {
      editor.focus();
      editor.select();
    }
  }, [isEditing, multiline]);

  // Restore focus to the display control after Enter/Escape exits edit mode.
  useEffect(() => {
    if (!isEditing) {
      finishingRef.current = false;
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        buttonRef.current?.focus();
      }
    }
  }, [isEditing]);

  const startEditing = () => {
    if (!disabled && !isEditing) {
      setIsEditing(true);
    }
  };

  const commitValue = () => {
    try {
      onChange(localValue);
    } catch (error) {
      console.error("Error in EditableCell onChange:", error);
    }
    onBlur?.();
  };

  const commitAndClose = (restoreFocus: boolean) => {
    finishingRef.current = true;
    restoreFocusRef.current = restoreFocus;
    commitValue();
    setIsEditing(false);
  };

  const cancelAndClose = () => {
    finishingRef.current = true;
    restoreFocusRef.current = true;
    setLocalValue(value);
    setIsEditing(false);
  };

  const handleBlur = () => {
    if (finishingRef.current) {
      return;
    }
    // Pointer/Tab blur: commit and leave focus where the browser moved it.
    restoreFocusRef.current = false;
    commitValue();
    setIsEditing(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter") {
      // Multiline cells keep a way to type a line break: Shift+Enter or
      // Cmd/Ctrl+Enter falls through to the textarea's default insertion.
      if (multiline && (e.shiftKey || e.metaKey || e.ctrlKey)) {
        return;
      }
      e.preventDefault();
      commitAndClose(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelAndClose();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setLocalValue(e.target.value);
  };

  // Check if content should be right-aligned
  const isRightAligned = className?.includes("text-right");

  if (isEditing) {
    return (
      <div className="w-full">
        {multiline ? (
          <Textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            aria-describedby={hintId}
            className={cn(
              "min-h-16 px-2 py-1 text-sm",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            disabled={disabled}
          />
        ) : (
          <Input
            ref={inputRef}
            type={type}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "h-8 px-2 py-1",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            disabled={disabled}
          />
        )}
        {multiline && (
          <p id={hintId} className="text-xs text-muted-foreground mt-1">
            {t("importer.preview.multilineHint")}
          </p>
        )}
        {error && (
          <p
            className={cn(
              "text-xs text-destructive mt-1 whitespace-nowrap",
              isRightAligned && "text-right",
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={startEditing}
      className={cn(
        "h-auto w-full min-h-[32px] justify-start px-2 py-1 font-normal",
        "hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
        error && "border border-destructive bg-destructive/5",
        disabled && "cursor-not-allowed opacity-50",
      )}
      aria-label={t("importer.preview.editCellLabel", {
        field: placeholder || t("importer.preview.field"),
        value,
      })}
    >
      <div
        className={cn(
          "flex w-full flex-col",
          isRightAligned ? "items-end" : "items-start",
        )}
      >
        <span
          className={cn(
            "text-sm",
            // Keep parsed line breaks visible instead of collapsing them.
            multiline && "whitespace-pre-wrap break-words text-left",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {value || placeholder || t("importer.preview.clickToEdit")}
        </span>
        {error && (
          <p
            className={cn(
              "text-xs text-destructive mt-1 whitespace-nowrap",
              isRightAligned && "text-right",
            )}
          >
            {error}
          </p>
        )}
      </div>
    </Button>
  );
}
