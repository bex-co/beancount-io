import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  PressableStateCallbackType,
} from "react-native";
import { useThemeStyle } from "@/common/hooks";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { getFieldWidth } from "./journal-config";
import { DirectiveType } from "./types";

// Define filter button configurations
interface FilterButton {
  id: string;
  labelKey: string;
  titleKey?: string;
  type:
    "directive" | "transaction_subtype" | "document_subtype" | "custom_subtype";
  value?: string;
  parent?: string; // For subtypes
}

const filterButtons: FilterButton[] = [
  // Main directive types
  {
    id: "open",
    labelKey: "open",
    type: "directive",
    value: DirectiveType.OPEN,
  },
  {
    id: "close",
    labelKey: "close",
    type: "directive",
    value: DirectiveType.CLOSE,
  },
  {
    id: "transaction",
    labelKey: "transaction",
    type: "directive",
    value: DirectiveType.TRANSACTION,
  },
  {
    id: "balance",
    labelKey: "balance",
    type: "directive",
    value: DirectiveType.BALANCE,
  },
  {
    id: "note",
    labelKey: "note",
    type: "directive",
    value: DirectiveType.NOTE,
  },
  {
    id: "document",
    labelKey: "document",
    type: "directive",
    value: DirectiveType.DOCUMENT,
  },
  { id: "pad", labelKey: "pad", type: "directive", value: DirectiveType.PAD },
  {
    id: "price",
    labelKey: "price",
    type: "directive",
    value: DirectiveType.PRICE,
  },
  {
    id: "custom",
    labelKey: "custom",
    type: "directive",
    value: DirectiveType.CUSTOM,
  },

  // Transaction subtypes
  {
    id: "cleared",
    labelKey: "cleared",
    titleKey: "clearedTransactions",
    type: "transaction_subtype",
    value: "cleared",
    parent: "transaction",
  },
  {
    id: "pending",
    labelKey: "pending",
    titleKey: "pendingTransactions",
    type: "transaction_subtype",
    value: "pending",
    parent: "transaction",
  },
  {
    id: "other",
    labelKey: "other",
    titleKey: "otherTransactions",
    type: "transaction_subtype",
    value: "other",
    parent: "transaction",
  },

  // Document subtypes
  {
    id: "discovered",
    labelKey: "discovered",
    titleKey: "discoveredDocuments",
    type: "document_subtype",
    value: "discovered",
    parent: "document",
  },
  {
    id: "linked",
    labelKey: "linked",
    titleKey: "linkedDocuments",
    type: "document_subtype",
    value: "linked",
    parent: "document",
  },

  // Custom subtypes
  {
    id: "budget",
    labelKey: "budget",
    titleKey: "budgetEntries",
    type: "custom_subtype",
    value: "budget",
    parent: "custom",
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
}

// Store previous subtype selections when parent is deselected
interface PreviousSelections {
  transaction: string[];
  document: string[];
  custom: string[];
}

const JournalFilters = ({
  selectedDirectiveTypes,
  onDirectiveTypesChange,
  selectedTransactionSubtypes,
  onTransactionSubtypesChange,
  selectedDocumentSubtypes,
  onDocumentSubtypesChange,
  selectedCustomSubtypes,
  onCustomSubtypesChange,
}: JournalFiltersProps) => {
  const { t } = useTranslations();
  const styles = useThemeStyle(getFilterStyles);

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

  const renderFilterButton = (button: FilterButton) => {
    const isActive = isButtonActive(button);
    const isDisabled = isButtonDisabled(button);

    const buttonStyle = ({ pressed }: PressableStateCallbackType) => [
      styles.filterButton,
      isActive && styles.filterButtonActive,
      isDisabled && styles.filterButtonDisabled,
      pressed && styles.filterButtonPressed,
    ];

    const textStyle = [
      styles.filterButtonText,
      isActive && styles.filterButtonTextActive,
      isDisabled && styles.filterButtonTextDisabled,
    ];

    return (
      <Pressable
        key={button.id}
        style={buttonStyle}
        onPress={() => !isDisabled && handleButtonClick(button)}
        disabled={isDisabled}
      >
        <Text style={textStyle}>{t(button.labelKey)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScrollContent}
      >
        {/* Main directive type buttons with inline subtypes */}
        {directiveButtons.map((button) => (
          <View key={button.id} style={styles.filterGroup}>
            {renderFilterButton(button)}

            {/* Show subtypes inline for specific directive types */}
            {button.id === "transaction" && (
              <View style={styles.subtypeGroup}>
                {transactionSubtypeButtons.map((subButton) =>
                  renderFilterButton(subButton),
                )}
              </View>
            )}

            {button.id === "document" && (
              <View style={styles.subtypeGroup}>
                {documentSubtypeButtons.map((subButton) =>
                  renderFilterButton(subButton),
                )}
              </View>
            )}

            {button.id === "custom" && (
              <View style={styles.subtypeGroup}>
                {customSubtypeButtons.map((subButton) =>
                  renderFilterButton(subButton),
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const getFilterStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    filtersContainer: {
      backgroundColor: theme.white,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
    filtersScrollContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
    },
    filterGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    subtypeGroup: {
      flexDirection: "row",
      gap: 4,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.black20,
      backgroundColor: theme.white,
      minHeight: 28,
      justifyContent: "center",
      alignItems: "center",
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterButtonDisabled: {
      opacity: 0.4,
    },
    filterButtonPressed: {
      opacity: 0.7,
    },
    filterButtonText: {
      fontSize: 12,
      color: theme.black90,
      fontWeight: "500",
    },
    filterButtonTextActive: {
      color: theme.white,
    },
    filterButtonTextDisabled: {
      color: theme.black60,
    },
  });

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
    dateCell: {
      fontSize: 14,
      fontFamily: "monospace",
      color: theme.black90,
      textAlign: "center",
      fontWeight: "600",
    },
    flagCell: {
      fontSize: 14,
      fontFamily: "monospace",
      color: theme.black90,
      textAlign: "center",
      fontWeight: "600",
    },
    descriptionCell: {
      flex: 1,
      fontSize: 14,
      color: theme.black90,
      marginLeft: 8,
      fontWeight: "600",
    },
  });

interface JournalHeaderProps {
  selectedDirectiveTypes: DirectiveType[];
  onDirectiveTypesChange: (types: DirectiveType[]) => void;
  selectedTransactionSubtypes: string[];
  onTransactionSubtypesChange: (subtypes: string[]) => void;
  selectedDocumentSubtypes: string[];
  onDocumentSubtypesChange: (subtypes: string[]) => void;
  selectedCustomSubtypes: string[];
  onCustomSubtypesChange: (subtypes: string[]) => void;
}

/**
 * Component for rendering the journal header with column labels and filters
 * Uses journal-config.ts for width configuration
 */
export const JournalHeader = ({
  selectedDirectiveTypes,
  onDirectiveTypesChange,
  selectedTransactionSubtypes,
  onTransactionSubtypesChange,
  selectedDocumentSubtypes,
  onDocumentSubtypesChange,
  selectedCustomSubtypes,
  onCustomSubtypesChange,
}: JournalHeaderProps) => {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  const dateWidth = getFieldWidth("date");
  const flagWidth = getFieldWidth("flag");
  const descriptionWidth = getFieldWidth("description");

  return (
    <View>
      {/* Filters section */}
      <JournalFilters
        selectedDirectiveTypes={selectedDirectiveTypes}
        onDirectiveTypesChange={onDirectiveTypesChange}
        selectedTransactionSubtypes={selectedTransactionSubtypes}
        onTransactionSubtypesChange={onTransactionSubtypesChange}
        selectedDocumentSubtypes={selectedDocumentSubtypes}
        onDocumentSubtypesChange={onDocumentSubtypesChange}
        selectedCustomSubtypes={selectedCustomSubtypes}
        onCustomSubtypesChange={onCustomSubtypesChange}
      />

      {/* Column labels section */}
      <View style={styles.header}>
        <Text
          style={[
            styles.dateCell,
            typeof dateWidth === "number" ? { width: dateWidth } : {},
          ]}
        >
          {t("date")}
        </Text>
        <Text
          style={[
            styles.flagCell,
            typeof flagWidth === "number" ? { width: flagWidth } : {},
          ]}
        >
          F
        </Text>
        <Text
          style={[
            styles.descriptionCell,
            descriptionWidth === "flex" ? { flex: 1 } : {},
          ]}
        >
          {t("payee")} / {t("narration")}
        </Text>
      </View>
    </View>
  );
};
