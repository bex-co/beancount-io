import { useLocalStorageState } from "@/common/hooks/use-local-storage-state";
import { decodeStringList } from "@/common/lib/storage/decode-string-list";
import { DirectiveType } from "@/common/types/journal";
import { JOURNAL_SUBTYPES } from "@/features/journal/components/journal-filter-buttons";

// Balance assertions are listed by default: they are the reconciliation
// checkpoints, sparse enough not to crowd the transactions between them.
const DEFAULT_DIRECTIVE_TYPES: DirectiveType[] = [
  DirectiveType.TRANSACTION,
  DirectiveType.BALANCE,
];
const DENSITIES = new Set(["compact", "comfortable"]);

/**
 * How the Journal lays out its entries. `compact` is one line per entry with
 * a date and status column, for reconciling against a statement line by
 * line; `comfortable` groups entries under their day, for reading.
 */
export type JournalDensity = "compact" | "comfortable";
const DEFAULT_STRING_FILTER: string[] = [];

// Saved filters are decoded before they reach the filters or the query: a
// wrong-shaped list falls back to the default, and only values the filter
// offers survive, since the API rejects any other kind (w4/m39).
const allowedListStorage = <T extends string>(
  allowed: ReadonlySet<string>,
) => ({
  deserializer: (raw: string) =>
    decodeStringList(raw, (value): value is T => allowed.has(value)),
});
const directiveTypesStorage = allowedListStorage<DirectiveType>(
  new Set(Object.values(DirectiveType)),
);
const transactionSubtypesStorage = allowedListStorage(
  JOURNAL_SUBTYPES.transaction,
);
const documentSubtypesStorage = allowedListStorage(JOURNAL_SUBTYPES.document);
const customSubtypesStorage = allowedListStorage(JOURNAL_SUBTYPES.custom);

/**
 * A journal's entry-type filters and display toggles, kept in localStorage
 * under `scope` (one ledger's Journal, one account's journal). Stored rather
 * than held in component state, they survive the page remounting when the
 * shared time/account/filter scope changes (w4/1000), and a reload.
 *
 * The hook reads its keys on mount, so a caller whose scope can change
 * remounts per scope (a `key`).
 */
export function useJournalFilterState(scope: string) {
  const [selectedDirectiveTypes, setSelectedDirectiveTypes] =
    useLocalStorageState<DirectiveType[]>(
      `${scope}.directiveTypes`,
      DEFAULT_DIRECTIVE_TYPES,
      directiveTypesStorage,
    );
  const [selectedTransactionSubtypes, setSelectedTransactionSubtypes] =
    useLocalStorageState<string[]>(
      `${scope}.transactionSubtypes`,
      DEFAULT_STRING_FILTER,
      transactionSubtypesStorage,
    );
  const [selectedDocumentSubtypes, setSelectedDocumentSubtypes] =
    useLocalStorageState<string[]>(
      `${scope}.documentSubtypes`,
      DEFAULT_STRING_FILTER,
      documentSubtypesStorage,
    );
  const [selectedCustomSubtypes, setSelectedCustomSubtypes] =
    useLocalStorageState<string[]>(
      `${scope}.customSubtypes`,
      DEFAULT_STRING_FILTER,
      customSubtypesStorage,
    );
  const [showMetadata, setShowMetadata] = useLocalStorageState(
    `${scope}.showMetadata`,
    true,
  );
  const [showPostings, setShowPostings] = useLocalStorageState(
    `${scope}.showPostings`,
    false,
  );
  const [density, setDensity] = useLocalStorageState<JournalDensity>(
    `${scope}.density`,
    "compact",
    {
      deserializer: (raw: string) => {
        const value = JSON.parse(raw) as unknown;
        return typeof value === "string" && DENSITIES.has(value)
          ? (value as JournalDensity)
          : "compact";
      },
    },
  );
  return {
    selectedDirectiveTypes,
    setSelectedDirectiveTypes,
    selectedTransactionSubtypes,
    setSelectedTransactionSubtypes,
    selectedDocumentSubtypes,
    setSelectedDocumentSubtypes,
    selectedCustomSubtypes,
    setSelectedCustomSubtypes,
    showMetadata,
    setShowMetadata,
    showPostings,
    density,
    setDensity,
    setShowPostings,
  };
}
