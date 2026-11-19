import { Button } from "@/common/components/ui/button";
import { DirectiveType } from "@/common/types/journal";
import { cn } from "@/common/lib/utils/utils";
import { Separator } from "@/common/components/ui/separator";
import { useState, useSyncExternalStore } from "react";
import { filterChip } from "@/common/components/filter-chip";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { ChevronDown, Rows2, Rows4, SlidersHorizontal } from "lucide-react";
import type { JournalDensity } from "@/features/journal/hooks/use-journal-filter-state";
import { filterButtons, type FilterButton } from "./journal-filter-buttons";

interface JournalFiltersProps {
  selectedDirectiveTypes: DirectiveType[];
  onDirectiveTypesChange: (types: DirectiveType[]) => void;
  selectedTransactionSubtypes: string[];
  onTransactionSubtypesChange: (subtypes: string[]) => void;
  selectedDocumentSubtypes: string[];
  onDocumentSubtypesChange: (subtypes: string[]) => void;
  selectedCustomSubtypes: string[];
  onCustomSubtypesChange: (subtypes: string[]) => void;
  showMetadata: boolean;
  onShowMetadataChange: (show: boolean) => void;
  showPostings: boolean;
  onShowPostingsChange: (show: boolean) => void;
  /** The list's layout; without a handler the choice is not offered. */
  density?: JournalDensity;
  onDensityChange?: (density: JournalDensity) => void;
}

const NARROW_QUERY = "(max-width: 1279px)";

function isNarrow(): boolean {
  // Without matchMedia there is no layout to fit (a test DOM): the full
  // strip, as every browser shows it at desktop widths.
  return typeof window.matchMedia === "function"
    ? window.matchMedia(NARROW_QUERY).matches
    : false;
}

function subscribeNarrow(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** What each transaction flag means, beside the flag itself. */
const FLAG_WORDS: Record<string, string> = {
  cleared: "journal.clearedStatus",
  pending: "journal.pendingStatus",
  other: "journal.otherStatus",
};

// Store previous subtype selections when parent is deselected
interface PreviousSelections {
  transaction: string[];
  document: string[];
  custom: string[];
}

export function JournalFilters({
  selectedDirectiveTypes,
  onDirectiveTypesChange,
  selectedTransactionSubtypes,
  onTransactionSubtypesChange,
  selectedDocumentSubtypes,
  onDocumentSubtypesChange,
  selectedCustomSubtypes,
  onCustomSubtypesChange,
  showMetadata,
  onShowMetadataChange,
  showPostings,
  onShowPostingsChange,
  density = "compact",
  onDensityChange,
}: JournalFiltersProps) {
  const { t } = useTranslations();
  // Narrower than `xl`: the choices fold into one control (with a pinned
  // sidebar the strip fits one row only from there). Read from the
  // first render (the Journal renders only in the browser), so a narrow
  // window never shows the strip and then swaps it.
  const compact = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  // Store previous subtype selections
  const [previousSelections, setPreviousSelections] =
    useState<PreviousSelections>({
      transaction: [],
      document: [],
      custom: [],
    });

  // Handle directive type toggle with cascade logic
  const handleDirectiveTypeToggle = (directiveType: DirectiveType) => {
    const isCurrentlySelected = selectedDirectiveTypes.includes(directiveType);

    if (isCurrentlySelected) {
      // Deselecting parent type - store current subtypes and clear them
      if (directiveType === DirectiveType.TRANSACTION) {
        setPreviousSelections((prev) => ({
          ...prev,
          transaction: [...selectedTransactionSubtypes],
        }));
        onTransactionSubtypesChange([]);
      } else if (directiveType === DirectiveType.DOCUMENT) {
        setPreviousSelections((prev) => ({
          ...prev,
          document: [...selectedDocumentSubtypes],
        }));
        onDocumentSubtypesChange([]);
      } else if (directiveType === DirectiveType.CUSTOM) {
        setPreviousSelections((prev) => ({
          ...prev,
          custom: [...selectedCustomSubtypes],
        }));
        onCustomSubtypesChange([]);
      }

      onDirectiveTypesChange(
        selectedDirectiveTypes.filter((t) => t !== directiveType),
      );
    } else {
      // Selecting parent type - restore previous subtypes if any
      onDirectiveTypesChange([...selectedDirectiveTypes, directiveType]);

      if (
        directiveType === DirectiveType.TRANSACTION &&
        previousSelections.transaction.length > 0
      ) {
        onTransactionSubtypesChange([...previousSelections.transaction]);
      } else if (
        directiveType === DirectiveType.DOCUMENT &&
        previousSelections.document.length > 0
      ) {
        onDocumentSubtypesChange([...previousSelections.document]);
      } else if (
        directiveType === DirectiveType.CUSTOM &&
        previousSelections.custom.length > 0
      ) {
        onCustomSubtypesChange([...previousSelections.custom]);
      }
    }
  };

  const handleTransactionSubtypeToggle = (subtype: string) => {
    // Only allow if parent type is selected
    if (!selectedDirectiveTypes.includes(DirectiveType.TRANSACTION)) {
      return;
    }

    if (selectedTransactionSubtypes.includes(subtype)) {
      onTransactionSubtypesChange(
        selectedTransactionSubtypes.filter((s) => s !== subtype),
      );
    } else {
      onTransactionSubtypesChange([...selectedTransactionSubtypes, subtype]);
    }
  };

  const handleDocumentSubtypeToggle = (subtype: string) => {
    // Only allow if parent type is selected
    if (!selectedDirectiveTypes.includes(DirectiveType.DOCUMENT)) {
      return;
    }

    if (selectedDocumentSubtypes.includes(subtype)) {
      onDocumentSubtypesChange(
        selectedDocumentSubtypes.filter((s) => s !== subtype),
      );
    } else {
      onDocumentSubtypesChange([...selectedDocumentSubtypes, subtype]);
    }
  };

  const handleCustomSubtypeToggle = (subtype: string) => {
    // Only allow if parent type is selected
    if (!selectedDirectiveTypes.includes(DirectiveType.CUSTOM)) {
      return;
    }

    if (selectedCustomSubtypes.includes(subtype)) {
      onCustomSubtypesChange(
        selectedCustomSubtypes.filter((s) => s !== subtype),
      );
    } else {
      onCustomSubtypesChange([...selectedCustomSubtypes, subtype]);
    }
  };

  const handleUIToggle = (toggle: string) => {
    if (toggle === "metadata") {
      onShowMetadataChange(!showMetadata);
    } else if (toggle === "postings") {
      onShowPostingsChange(!showPostings);
    }
  };

  const isButtonActive = (button: FilterButton): boolean => {
    switch (button.type) {
      case "directive":
        return selectedDirectiveTypes.includes(button.value as DirectiveType);
      case "transaction_subtype":
        return selectedTransactionSubtypes.includes(button.value!);
      case "document_subtype":
        return selectedDocumentSubtypes.includes(button.value!);
      case "custom_subtype":
        return selectedCustomSubtypes.includes(button.value!);
      case "ui_toggle":
        if (button.value === "metadata") return showMetadata;
        if (button.value === "postings") return showPostings;
        return false;
      default:
        return false;
    }
  };

  const isButtonDisabled = (button: FilterButton): boolean => {
    switch (button.type) {
      case "transaction_subtype":
        return !selectedDirectiveTypes.includes(DirectiveType.TRANSACTION);
      case "document_subtype":
        return !selectedDirectiveTypes.includes(DirectiveType.DOCUMENT);
      case "custom_subtype":
        return !selectedDirectiveTypes.includes(DirectiveType.CUSTOM);
      default:
        return false;
    }
  };

  const buttonVariant = (button: FilterButton) =>
    isButtonActive(button) ? "secondary" : "ghost";

  const handleButtonClick = (button: FilterButton) => {
    switch (button.type) {
      case "directive":
        handleDirectiveTypeToggle(button.value as DirectiveType);
        break;
      case "transaction_subtype":
        handleTransactionSubtypeToggle(button.value!);
        break;
      case "document_subtype":
        handleDocumentSubtypeToggle(button.value!);
        break;
      case "custom_subtype":
        handleCustomSubtypeToggle(button.value!);
        break;
      case "ui_toggle":
        handleUIToggle(button.value!);
        break;
    }
  };

  // Group buttons by type for better organization
  const directiveButtons = filterButtons.filter((b) => b.type === "directive");
  const transactionSubtypeButtons = filterButtons.filter(
    (b) => b.type === "transaction_subtype",
  );
  const documentSubtypeButtons = filterButtons.filter(
    (b) => b.type === "document_subtype",
  );
  const customSubtypeButtons = filterButtons.filter(
    (b) => b.type === "custom_subtype",
  );
  const uiToggleButtons = filterButtons.filter((b) => b.type === "ui_toggle");

  // The type chips, each with the flags or kinds that narrow it.
  const typeChips = directiveButtons.map((button) => (
    <div key={button.id} className="flex shrink-0 items-center gap-1">
      <Button
        variant={buttonVariant(button)}
        size="sm"
        onClick={() => handleButtonClick(button)}
        title={button.titleKey ? t(button.titleKey) : undefined}
        aria-pressed={isButtonActive(button)}
        className={filterChip(isButtonActive(button))}
      >
        {t(button.labelKey)}
      </Button>

      {/* Kinds of document or custom entry, inside the type they narrow. */}
      {button.id === "document" && isButtonActive(button) && (
        <div className="flex gap-1">
          {documentSubtypeButtons.map((subButton) => (
            <Button
              key={subButton.id}
              variant={buttonVariant(subButton)}
              size="sm"
              onClick={() => handleButtonClick(subButton)}
              title={subButton.titleKey ? t(subButton.titleKey) : undefined}
              aria-label={
                subButton.titleKey ? t(subButton.titleKey) : undefined
              }
              aria-pressed={isButtonActive(subButton)}
              className={cn(
                filterChip(isButtonActive(subButton)),
                "min-w-8 font-mono",
              )}
              disabled={isButtonDisabled(subButton)}
            >
              {t(subButton.labelKey)}
            </Button>
          ))}
        </div>
      )}

      {button.id === "custom" && isButtonActive(button) && (
        <div className="flex gap-1">
          {customSubtypeButtons.map((subButton) => (
            <Button
              key={subButton.id}
              variant={buttonVariant(subButton)}
              size="sm"
              onClick={() => handleButtonClick(subButton)}
              title={subButton.titleKey ? t(subButton.titleKey) : undefined}
              aria-label={
                subButton.titleKey ? t(subButton.titleKey) : undefined
              }
              aria-pressed={isButtonActive(subButton)}
              className={cn(
                filterChip(isButtonActive(subButton)),
                "min-w-8 font-mono",
              )}
              disabled={isButtonDisabled(subButton)}
            >
              {t(subButton.labelKey)}
            </Button>
          ))}
        </div>
      )}
    </div>
  ));
  // Which transactions, by the ledger's flag: the filter a reconciliation
  // turns to most, so it has a place of its own. "All" is the choice of
  // none, so every chip is plainly on or off.
  const transactionFlags = selectedDirectiveTypes.includes(
    DirectiveType.TRANSACTION,
  ) ? (
    <div
      role="group"
      aria-label={t("journal.statusLabel")}
      className="flex w-fit max-w-full flex-wrap gap-1"
    >
      <Button
        variant={
          selectedTransactionSubtypes.length === 0 ? "secondary" : "ghost"
        }
        size="sm"
        onClick={() => onTransactionSubtypesChange([])}
        aria-pressed={selectedTransactionSubtypes.length === 0}
        className={filterChip(selectedTransactionSubtypes.length === 0)}
      >
        {t("journal.allEntryTypes")}
      </Button>
      {transactionSubtypeButtons.map((subButton) => (
        <Button
          key={subButton.id}
          variant={buttonVariant(subButton)}
          size="sm"
          onClick={() => handleButtonClick(subButton)}
          title={subButton.titleKey ? t(subButton.titleKey) : undefined}
          aria-label={subButton.titleKey ? t(subButton.titleKey) : undefined}
          aria-pressed={isButtonActive(subButton)}
          className={cn(filterChip(isButtonActive(subButton)), "min-w-8")}
          disabled={isButtonDisabled(subButton)}
        >
          {/* The ledger's own flag, then what it means. "Other" is every
              other flag, not one glyph: a lone "x" read as close. */}
          {subButton.id !== "other" && (
            <span className="font-mono">{t(subButton.labelKey)}</span>
          )}
          <span>{t(FLAG_WORDS[subButton.id])}</span>
        </Button>
      ))}
    </div>
  ) : null;

  // What each row shows, apart from which entries are listed.
  const displayToggles = uiToggleButtons.map((button) => (
    <Button
      key={button.id}
      variant={buttonVariant(button)}
      size="sm"
      onClick={() => handleButtonClick(button)}
      title={button.titleKey ? t(button.titleKey) : undefined}
      aria-pressed={isButtonActive(button)}
      className={filterChip(isButtonActive(button))}
    >
      {t(button.labelKey)}
    </Button>
  ));

  // One line per entry for reconciling, or entries grouped under their day
  // for reading. Icons in the toolbar, named for assistive technology and
  // on hover; words in the folded panel.
  const densityChoice = (withWords: boolean) => (
    <div
      role="group"
      aria-label={t("journal.layoutLabel")}
      className="flex gap-1"
    >
      {(
        [
          ["compact", t("journal.densityCompact"), Rows4],
          ["comfortable", t("journal.densityComfortable"), Rows2],
        ] as const
      ).map(([value, label, Icon]) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          aria-pressed={density === value}
          onClick={() => onDensityChange?.(value)}
          className={filterChip(density === value, { iconOnly: !withWords })}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          <span className={withWords ? undefined : "sr-only"}>{label}</span>
        </Button>
      ))}
    </div>
  );

  // One control says which types are listed and opens the choice of them;
  // fifteen chips in a row read as noise. The status sits beside it at
  // every width: it is the filter a reconciliation reaches for.
  const chosen = directiveButtons
    .filter((button) => isButtonActive(button))
    .map((button) => t(button.labelKey));
  const summary = chosen.length
    ? chosen.length > 2
      ? `${chosen.slice(0, 2).join(", ")} +${chosen.length - 2}`
      : chosen.join(", ")
    : t("journal.allEntryTypes");
  const section = (heading: string, body: React.ReactNode) => (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      {body}
    </section>
  );
  const entryTypes = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-full min-w-0 shrink gap-2 pointer-coarse:h-11"
        >
          {/* Below 390px the choice speaks for itself beside View; the
              name stays for assistive technology and in the panel. */}
          <span className="shrink-0 text-muted-foreground max-[389px]:sr-only">
            {t("journal.entryTypes")}
          </span>
          <span className="sr-only">: </span>
          <span title={summary} className="truncate font-medium">
            {summary}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(26rem,calc(100vw-1.5rem))] space-y-4 p-3"
      >
        {section(
          t("journal.entryTypes"),
          <div className="flex flex-wrap items-center gap-1">{typeChips}</div>,
        )}
      </PopoverContent>
    </Popover>
  );

  if (compact) {
    // Narrower than `xl`, what each row shows and the layout fold into a
    // View panel of their own; the filters stay out on the bar.
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* On a phone, Entry types gives up width to View, so the two share
            one line, the status beneath; wider, all three share the row in
            the order Tab visits them. */}
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          {entryTypes}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ms-auto h-9 shrink-0 gap-1.5 sm:ms-0 pointer-coarse:h-11"
              >
                <SlidersHorizontal
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                {t("journal.viewLabel")}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(20rem,calc(100vw-1.5rem))] space-y-4 p-3"
            >
              {section(
                t("journal.showLabel"),
                <div className="flex flex-wrap gap-1">{displayToggles}</div>,
              )}
              {onDensityChange &&
                section(t("journal.layoutLabel"), densityChoice(true))}
            </PopoverContent>
          </Popover>
        </div>
        {transactionFlags && (
          <div className="w-full sm:w-auto">{transactionFlags}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      {entryTypes}
      {transactionFlags}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* A caption, not a control: set apart from the chips it labels. */}
        <span className="ps-2 pe-1 text-xs font-medium text-muted-foreground">
          {t("journal.showLabel")}
        </span>
        {displayToggles}
        {onDensityChange && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            {densityChoice(false)}
          </>
        )}
      </div>
    </div>
  );
}
