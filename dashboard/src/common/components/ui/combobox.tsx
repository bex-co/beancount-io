import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/common/lib/utils/utils.ts";
import { Input } from "@/common/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/common/components/ui/popover.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";

export interface ComboboxOption {
  value: string;
  label: string;
  indent?: number; // For hierarchical display
  /**
   * Extra text this option can be found by, when what the reader types is not
   * what the option says. A payee suggestion carries the FQL expression, which
   * escapes the punctuation in the name, so the name itself goes here.
   */
  searchText?: string;
}

/** Native input identity/ARIA props FormControl (Radix Slot) expects to reach. */
export type ComboboxFieldProps = Pick<
  React.ComponentPropsWithoutRef<"input">,
  "id" | "aria-describedby" | "aria-invalid"
>;

interface ComboboxProps extends ComboboxFieldProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
  triggerOn?: "change" | "blur"; // When to trigger onValueChange for custom values
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyText,
  allowCustom = true,
  className,
  disabled = false,
  triggerOn = "change",
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const { t } = useTranslations();
  const defaultPlaceholder = placeholder || t("component.combobox.placeholder");
  const defaultEmptyText = emptyText || t("common.noResultsFound");

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [popoverWidth, setPopoverWidth] = React.useState<number | undefined>(
    undefined,
  );
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Skip the blur that follows an explicit selection so it cannot overwrite
  // the chosen option with the still-rendered draft query.
  const skipBlurCommitRef = React.useRef(false);
  // Unique ID per instance to scope querySelector and avoid cross-instance conflicts
  const instanceId = React.useId().replace(/:/g, "");
  const listboxId = `${instanceId}-listbox`;
  const optionId = (index: number) => `${instanceId}-option-${index}`;

  // Filter options based on input value
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;

    const search = inputValue.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(search) ||
        option.value.toLowerCase().includes(search) ||
        option.searchText?.toLowerCase().includes(search),
    );
  }, [options, inputValue]);

  const handleSelect = (selectedValue: string) => {
    skipBlurCommitRef.current = true;
    setInputValue(selectedValue);
    onValueChange(selectedValue);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue("");
    onValueChange("");
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // If allowCustom is true and triggerOn is "change", immediately update the value
    if (allowCustom && triggerOn === "change") {
      onValueChange(newValue);
    }

    // Open dropdown when typing
    if (!open) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    setOpen(true);
  };

  const handleInputBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    // If triggerOn is "blur" and allowCustom is true, update the value on blur
    if (allowCustom && triggerOn === "blur") {
      onValueChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Escape dismisses the suggestions and keeps editing focus. It must not
      // blur: in `triggerOn="blur"` mode a blur commits the draft, which turned
      // "cancel this popup" into "apply whatever I had half-typed". With no
      // popup to dismiss, let Escape through to an enclosing sheet or dialog.
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        // Select the highlighted option
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (allowCustom) {
        // Use custom value
        skipBlurCommitRef.current = true;
        onValueChange(inputValue);
        setOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }
  };

  // Sync input value with prop value when it changes externally
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredOptions]);

  // Reset highlighted index when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
    }
  }, [open]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const item = document.querySelector(
        `[data-combobox-item-index="${instanceId}-${highlightedIndex}"]`,
      );
      if (item && typeof item.scrollIntoView === "function") {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [highlightedIndex, open, instanceId]);

  // Measure container width for popover
  React.useLayoutEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setPopoverWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();

    // Update width on window resize
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              id={id}
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder={defaultPlaceholder}
              disabled={disabled}
              className={cn("pr-8", className)}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls={open ? listboxId : undefined}
              aria-activedescendant={
                open &&
                highlightedIndex >= 0 &&
                highlightedIndex < filteredOptions.length
                  ? optionId(highlightedIndex)
                  : undefined
              }
            />

            {inputValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm hover:bg-muted p-1 z-10 cursor-pointer"
                aria-label={t("common.clearInput")}
                tabIndex={-1}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="p-0"
          // Radix gives this popup role="dialog"; without a name assistive
          // technology announces an unnamed dialog next to a named field. The
          // field's own placeholder is the identity a reader already has.
          aria-label={defaultPlaceholder}
          style={{
            width: popoverWidth ? `${popoverWidth}px` : undefined,
            // Never extend past the space Radix measured between the anchor and
            // the viewport edge; short windows otherwise push the list off-screen.
            maxHeight: "var(--radix-popover-content-available-height)",
          }}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Prevent closing when interacting with the input or clear button
            if (containerRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          {/*
            One selection model. This component already filters its own options
            and owns its own keyboard handling, so cmdk was contributing only a
            second, competing notion of which item is selected — which is how
            `aria-selected` came to name a different option than the highlight
            and than the value Enter applied. The list below is a plain
            listbox whose selected state, ids and highlight all come from the
            same `highlightedIndex`.

            The scroll region must shrink to the available popover height as
            well as respecting the shared 300px cap.
          */}
          <div
            id={listboxId}
            role="listbox"
            aria-label={defaultPlaceholder}
            className="overflow-x-hidden overflow-y-auto p-1"
            style={{
              maxHeight:
                "min(300px, var(--radix-popover-content-available-height))",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm">
                {defaultEmptyText}
                {allowCustom && inputValue && (
                  <div className="mt-2 text-xs">
                    {t("component.combobox.useCustomValue", {
                      value: inputValue,
                    })}
                  </div>
                )}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  onClick={() => handleSelect(option.value)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  data-combobox-item-index={`${instanceId}-${index}`}
                  className={cn(
                    "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
                    highlightedIndex === index &&
                      "bg-accent text-accent-foreground",
                  )}
                  style={
                    option.indent
                      ? { paddingLeft: `${8 + option.indent * 8}px` }
                      : undefined
                  }
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
