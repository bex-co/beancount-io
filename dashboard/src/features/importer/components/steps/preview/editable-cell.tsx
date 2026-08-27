/**
 * EditableCell - Reusable inline editing cell component
 * Supports click-to-edit pattern with keyboard navigation
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/common/components/ui/input";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "number" | "date";
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
  className,
  disabled = false,
}: EditableCellProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    try {
      if (onChange) {
        onChange(localValue);
      }
    } catch (error) {
      console.error("Error in EditableCell onChange:", error);
    }
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLocalValue(value); // Reset to original value
      setIsEditing(false);
    }
    // Tab naturally moves to next input
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  // Check if content should be right-aligned
  const isRightAligned = className?.includes("text-right");

  if (isEditing) {
    return (
      <div className="w-full">
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
            className, // Apply passed className (e.g., text-right)
          )}
          disabled={disabled}
        />
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
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !disabled) {
          setIsEditing(true);
        }
      }}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "w-full min-h-[32px] px-2 py-1 rounded cursor-pointer",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
        "transition-colors",
        error && "border border-destructive bg-destructive/5",
        disabled && "cursor-not-allowed opacity-50",
      )}
      role="button"
      aria-label={t("importer.preview.editCellLabel", {
        field: placeholder || t("importer.preview.field"),
        value,
      })}
    >
      <div
        className={cn(
          "flex items-center",
          isRightAligned ? "justify-end" : "justify-between",
        )}
      >
        <span
          className={cn(
            "text-sm",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {value || placeholder || t("importer.preview.clickToEdit")}
        </span>
      </div>
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
