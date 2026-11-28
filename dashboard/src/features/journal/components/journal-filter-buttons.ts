import { DirectiveType } from "@/common/types/journal";

// Define filter button configurations
export interface FilterButton {
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

export const filterButtons: FilterButton[] = [
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
    id: "query",
    labelKey: "journal.query",
    type: "directive",
    value: DirectiveType.QUERY,
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

const subtypeValues = (type: FilterButton["type"]): ReadonlySet<string> =>
  new Set(
    filterButtons.flatMap((button) =>
      button.type === type && button.value ? [button.value] : [],
    ),
  );

/**
 * The values each subtype filter can hold: exactly these buttons, which are
 * also the only kinds the journal API accepts, so a saved list holding any
 * other string would fail the read (w4/m39).
 */
export const JOURNAL_SUBTYPES = {
  transaction: subtypeValues("transaction_subtype"),
  document: subtypeValues("document_subtype"),
  custom: subtypeValues("custom_subtype"),
};
