import { Button } from "@/common/components/ui/button";
import { DirectiveType } from "@/common/types/journal";
import { cn } from "@/common/lib/utils/utils";
import { useState } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import { Separator } from "@/common/components/ui/separator";

// Define filter button configurations
interface FilterButton {
  id: string;
  labelKey: string;
  titleKey?: string;
  type:
    | "directive"
    | "transaction_subtype"
    | "document_subtype"
    | "custom_subtype"
    | "ui_toggle";
  value?: string;
  parent?: string; // For subtypes
}

const filterButtons: FilterButton[] = [
  // Main directive types
  {
    id: "open",
    labelKey: "journal.open",
    type: "directive",
    value: DirectiveType.OPEN,
  },
  {
    id: "close",
    labelKey: "journal.close",
    type: "directive",
    value: DirectiveType.CLOSE,
  },
  {
    id: "transaction",
    labelKey: "journal.transaction",
    type: "directive",
    value: DirectiveType.TRANSACTION,
  },
  {
    id: "balance",
    labelKey: "journal.balance",
    type: "directive",
    value: DirectiveType.BALANCE,
  },
  {
    id: "note",
    labelKey: "journal.note",
    type: "directive",
    value: DirectiveType.NOTE,
  },
  {
    id: "document",
    labelKey: "journal.document",
    type: "directive",
    value: DirectiveType.DOCUMENT,
  },
  {
    id: "pad",
    labelKey: "journal.pad",
    type: "directive",
    value: DirectiveType.PAD,
  },
  {
    id: "price",
    labelKey: "journal.price",
    type: "directive",
    value: DirectiveType.PRICE,
  },
  {
    id: "custom",
    labelKey: "journal.custom",
    type: "directive",
    value: DirectiveType.CUSTOM,
  },

  // Transaction subtypes
  {
    id: "cleared",
    labelKey: "journal.cleared",
    titleKey: "journal.clearedTransactions",
    type: "transaction_subtype",
    value: "cleared",
    parent: "transaction",
  },
  {
    id: "pending",
    labelKey: "journal.pending",
    titleKey: "journal.pendingTransactions",
    type: "transaction_subtype",
    value: "pending",
    parent: "transaction",
  },
  {
    id: "other",
    labelKey: "journal.other",
    titleKey: "journal.otherTransactions",
    type: "transaction_subtype",
    value: "other",
    parent: "transaction",
  },

  // Document subtypes
  {
    id: "discovered",
    labelKey: "journal.discovered",
    titleKey: "journal.discoveredDocuments",
    type: "document_subtype",
    value: "discovered",
    parent: "document",
  },
  {
    id: "linked",
    labelKey: "journal.linked",
    titleKey: "journal.linkedDocuments",
    type: "document_subtype",
    value: "linked",
    parent: "document",
  },

  // Custom subtypes
  {
    id: "budget",
    labelKey: "journal.budget",
    titleKey: "journal.budgetEntries",
    type: "custom_subtype",
    value: "budget",
    parent: "custom",
  },

  // UI toggles
  {
    id: "metadata",
    labelKey: "journal.metadata",
    titleKey: "journal.toggleMetadata",
    type: "ui_toggle",
    value: "metadata",
  },
  {
    id: "postings",
    labelKey: "journal.postings",
    titleKey: "journal.togglePostings",
    type: "ui_toggle",
    value: "postings",
  },
];

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
}

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
}: JournalFiltersProps) {
  const { t } = useTranslations();
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

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {/* Main directive type buttons with inline subtypes */}
      {directiveButtons.map((button) => (
        <div key={button.id} className="flex shrink-0 items-center gap-1">
          <Button
            variant={buttonVariant(button)}
            size="sm"
            onClick={() => handleButtonClick(button)}
            title={button.titleKey ? t(button.titleKey) : undefined}
            aria-pressed={isButtonActive(button)}
            className={cn(
              "h-8 shrink-0 border text-xs",
              isButtonActive(button)
                ? "border-border shadow-xs"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t(button.labelKey)}
          </Button>

          {/* Show subtypes inline for specific directive types */}
          {button.id === "transaction" && isButtonActive(button) && (
            <div className="flex gap-1">
              {transactionSubtypeButtons.map((subButton) => (
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
                    "h-7 min-w-7 rounded-full border px-2 font-mono text-xs",
                    isButtonActive(subButton)
                      ? "border-border shadow-xs"
                      : "border-transparent text-muted-foreground",
                  )}
                  disabled={isButtonDisabled(subButton)}
                >
                  {t(subButton.labelKey)}
                </Button>
              ))}
            </div>
          )}

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
                    "h-7 min-w-7 rounded-full border px-2 font-mono text-xs",
                    isButtonActive(subButton)
                      ? "border-border shadow-xs"
                      : "border-transparent text-muted-foreground",
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
                    "h-7 min-w-7 rounded-full border px-2 font-mono text-xs",
                    isButtonActive(subButton)
                      ? "border-border shadow-xs"
                      : "border-transparent text-muted-foreground",
                  )}
                  disabled={isButtonDisabled(subButton)}
                >
                  {t(subButton.labelKey)}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* UI toggle buttons */}
      <Separator orientation="vertical" className="mx-1 h-6" />
      {uiToggleButtons.map((button) => (
        <Button
          key={button.id}
          variant={buttonVariant(button)}
          size="sm"
          onClick={() => handleButtonClick(button)}
          title={button.titleKey ? t(button.titleKey) : undefined}
          aria-pressed={isButtonActive(button)}
          className={cn(
            "h-8 shrink-0 border text-xs",
            isButtonActive(button)
              ? "border-border shadow-xs"
              : "border-transparent text-muted-foreground",
          )}
        >
          {t(button.labelKey)}
        </Button>
      ))}
    </div>
  );
}
